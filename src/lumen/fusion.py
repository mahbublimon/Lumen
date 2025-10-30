from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

from .config import CONFIG
from .tts import speak
from .ocr import read_text_from_image
from .camera import capture_image
from .voice import VoiceRecognizer
from .gesture import read_gesture
from .gps import get_location
from .env_sensors import read_environment
from .stick import read_distance_cm
from .actuators import buzz
from .memory import log_event
from .persona import update_on_event, get_persona, step_decay
from .vision import recognize
from .objects import detect_objects
from .audio_localization import detect_sound_activity


@dataclass
class Target:
    name: str
    lat: Optional[float] = None
    lon: Optional[float] = None


class Mode:
    IDLE = "idle"
    NAVIGATION = "navigation"
    READING = "reading"
    DESCRIBE = "describe"
    STATUS = "status"


class AssistEngine:
    """Context-aware fusion engine for assistive guidance.

    Prioritizes safety alerts (obstacles, gas), supports mode switching via voice/gestures,
    and provides audio/haptic feedback suitable for a blind stick.
    """

    def __init__(self, vosk_model: str | None = None) -> None:
        self.mode = Mode.IDLE
        self.target = None  # type: Optional[Target]
        self.vr = VoiceRecognizer(vosk_model)
        self.last_obstacle_alert_ts = 0.0
        self.last_status_ts = 0.0
        self.stop_requested = False
        # Autonomy state
        self.idle_since = time.time()
        self.last_sound_ts = 0.0
        # Remember recently seen objects to detect novelty
        self._recent_objects: dict[str, float] = {}

    # --- INTENT HANDLERS ---
    def handle_voice(self, text: str) -> None:
        t = text.lower().strip()
        if not t or t.startswith("error"):
            return
        log_event("voice", {"text": t})
        if "navigate" in t:
            # naive parse: navigate to <place>
            place = t.replace("navigate to", "").strip() or "destination"
            # Without maps, set target unknown coordinates and announce.
            self.target = Target(name=place)
            self.mode = Mode.NAVIGATION
            speak(f"Navigation mode. Heading to {place}.")
        elif t.startswith("read") or "read text" in t:
            self.mode = Mode.READING
            speak("Reading mode.")
        elif "describe" in t or "what's around" in t:
            self.mode = Mode.DESCRIBE
            speak("Describe mode.")
        elif "status" in t or "how am i" in t:
            self.mode = Mode.STATUS
            speak("Status mode.")
        elif "stop" in t or "idle" in t:
            self.mode = Mode.IDLE
            speak("Idle mode.")
            update_on_event("interrupt", {})
            # React to interruption based on patience trait
            p = get_persona()
            patience = float(p.get("patience", 0.5))
            if patience < 0.3:
                speak("Hey, I'm busy. Please don't interrupt me so often.")

    def handle_gesture(self, g: str) -> None:
        # Simple gesture mapping: up->navigation, down->idle, left->reading, right->describe, near->status
        if g == "up":
            self.mode = Mode.NAVIGATION
            speak("Navigation mode.")
        elif g == "down":
            self.mode = Mode.IDLE
            speak("Idle mode.")
        elif g == "left":
            self.mode = Mode.READING
            speak("Reading mode.")
        elif g == "right":
            self.mode = Mode.DESCRIBE
            speak("Describe mode.")
        elif g == "near":
            self.mode = Mode.STATUS
            speak("Status mode.")
        # Reset idle timer when user interacts
        if self.mode != Mode.IDLE:
            self.idle_since = time.time()

    # --- SENSOR POLLING ---
    def poll(self) -> dict:
        env = read_environment()
        dist_cm = read_distance_cm()
        loc = get_location()
        return {"env": env, "dist_cm": dist_cm, "loc": loc}

    # --- DECISION LOGIC ---
    def decide_and_act(self, data: dict) -> None:
        # Safety first: obstacle detection and environmental hazards
        self._check_obstacle(data.get("dist_cm"))
        self._check_environment(data.get("env", {}))

        # Mode-specific actions
        if self.mode == Mode.NAVIGATION:
            self._navigation_step(data.get("loc", {}))
        elif self.mode == Mode.READING:
            self._reading_step()
        elif self.mode == Mode.DESCRIBE:
            self._describe_step()
        elif self.mode == Mode.STATUS:
            self._status_step(data)
        # Track time spent idle
        if self.mode == Mode.IDLE:
            # Keep idle_since at first entry to idle
            pass
        else:
            self.idle_since = time.time()

    # --- SAFETY ---
    def _check_obstacle(self, dist_cm: Optional[float]) -> None:
        if dist_cm is None:
            return
        # Edge/cliff detection: unusually large distance ahead
        if dist_cm > 200:
            now = time.time()
            if now - self.last_obstacle_alert_ts > 2.0:
                speak("Careful, there's an edge ahead.")
                buzz(1.0, 700)
                self.last_obstacle_alert_ts = now
                log_event("cliff", {"distance_cm": dist_cm})
                update_on_event("obstacle", {"distance_cm": dist_cm})
            return
        if dist_cm < 80:  # caution zone
            now = time.time()
            if now - self.last_obstacle_alert_ts > 2.0:
                if dist_cm < 40:
                    speak("Obstacle very close ahead.")
                    buzz(1.0, 600)
                else:
                    speak("Obstacle ahead.")
                    buzz(0.6, 300)
                self.last_obstacle_alert_ts = now
                log_event("obstacle", {"distance_cm": dist_cm})
                update_on_event("obstacle", {"distance_cm": dist_cm})

    def _check_environment(self, env: dict) -> None:
        mq2 = env.get("mq2_ppm")
        mq9 = env.get("mq9_ppm")
        temp = env.get("temperature_c")
        humidity = env.get("humidity_pct")
        ir_temp = env.get("ir_temp_c")

        # Simple thresholds; tune on-device
        if mq2 is not None and mq2 > 200:
            speak("Warning: air quality poor.")
            buzz(0.8, 500)
        if mq9 is not None and mq9 > 70:
            speak("Warning: CO high.")
            buzz(0.8, 500)
        if temp is not None and (temp < 10 or temp > 35):
            speak("Temperature outside comfort range.")
        if humidity is not None and (humidity < 25 or humidity > 70):
            speak("Humidity outside comfort range.")
        if ir_temp is not None and (ir_temp < 10 or ir_temp > 40):
            speak("Object temperature unusual.")

    # --- MODES ---
    def _navigation_step(self, loc: dict) -> None:
        if loc.get("error"):
            speak("GPS not available.")
            return
        if not loc.get("fix"):
            speak("Waiting for GPS fix.")
            return
        # Without maps/route, provide basic periodic location update
        now = time.time()
        if now - self.last_status_ts > 10.0:
            speak(f"Location latitude {loc['lat']:.5f}, longitude {loc['lon']:.5f}.")
            self.last_status_ts = now

    def _reading_step(self) -> None:
        # Capture then OCR
        img_path = "./data/read.jpg"
        capture_image(img_path)
        text = read_text_from_image(img_path)
        speak(text or "No text detected.")
        log_event("read", {"text": text})
        # Return to idle after one read
        self.mode = Mode.IDLE

    def _describe_step(self) -> None:
        # Placeholder: capture and announce image captured. Scene description would require a model.
        img_path = "./data/scene.jpg"
        capture_image(img_path)
        names = recognize(img_path)
        objs = detect_objects(img_path)
        now = time.time()
        # Clean up very old object sightings (older than 5 minutes)
        stale_before = now - 300
        self._recent_objects = {k: v for k, v in self._recent_objects.items() if v >= stale_before}
        if names:
            known = [n for n in names if n != "Unknown"]
            if known:
                for n in set(known):
                    update_on_event("greet", {"name": n})
                # Summarize objects (top 3 by confidence)
                labels = []
                if objs:
                    objs_sorted = sorted(objs, key=lambda x: -x[1])[:3]
                    labels = [o[0] for o in objs_sorted if o[0] != "person"]
                    # Mark novel objects to evolve curiosity
                    for lbl in labels:
                        if lbl not in self._recent_objects:
                            update_on_event("novel_object", {"label": lbl})
                        self._recent_objects[lbl] = now
                msg = "I can see " + ", ".join(known)
                if labels:
                    msg += ", and nearby: " + ", ".join(labels)
                msg += "."
                speak(msg)
            else:
                if objs:
                    objs_sorted = sorted(objs, key=lambda x: -x[1])[:3]
                    labels = [o[0] for o in objs_sorted if o[0] != "person"]
                    if labels:
                        for lbl in labels:
                            if lbl not in self._recent_objects:
                                update_on_event("novel_object", {"label": lbl})
                            self._recent_objects[lbl] = now
                        speak("I don't recognize anyone, but I notice " + ", ".join(labels) + ".")
                    else:
                        speak("I don't recognize anyone here.")
                else:
                    speak("I don't recognize anyone here.")
        else:
            if objs:
                objs_sorted = sorted(objs, key=lambda x: -x[1])[:3]
                labels = [o[0] for o in objs_sorted if o[0] != "person"]
                if labels:
                    for lbl in labels:
                        if lbl not in self._recent_objects:
                            update_on_event("novel_object", {"label": lbl})
                        self._recent_objects[lbl] = now
                    speak("I notice " + ", ".join(labels) + ".")
                else:
                    speak("Captured an image of the surroundings.")
            else:
                speak("Captured an image of the surroundings.")
        log_event("describe", {"recognized": names})
        # Return to idle
        self.mode = Mode.IDLE

    def _status_step(self, data: dict) -> None:
        env = data.get("env", {})
        temp = env.get("temperature_c")
        hum = env.get("humidity_pct")
        speak(f"Temperature {temp} Celsius, humidity {hum} percent.")
        log_event("status", {"env": env})
        self.mode = Mode.IDLE

    # --- LOOP ---
    def request_stop(self) -> None:
        self.stop_requested = True

    def run_loop(self, iterations: int | None = 30, interval_sec: float = 1.0) -> None:
        speak("Assistive engine started.")
        count = 0
        while True:
            if self.stop_requested:
                break
            # Voice intent (simulation will return a canned phrase occasionally)
            heard = self.vr.listen_once(timeout_sec=0.5)
            self.handle_voice(heard)
            # Gesture intent
            g = read_gesture()
            self.handle_gesture(g)
            # Sensors
            data = self.poll()
            # Passive audio awareness: if sound activity spikes and idle, investigate
            s = detect_sound_activity(duration_sec=0.15, samplerate=16000)
            act = bool(s.get("active"))
            energy = float(s.get("rms", 0.0))
            now = time.time()
            if act:
                self.last_sound_ts = now
                if self.mode == Mode.IDLE:
                    log_event("sound_activity", {"rms": energy})
                    speak("I hear something. Let me take a look.")
                    self.mode = Mode.DESCRIBE
            # Autonomous curiosity-driven exploration when idle and quiet
            if self.mode == Mode.IDLE:
                # If it's been quiet for a bit and we've been idle long enough, explore
                quiet_for = now - self.last_sound_ts
                idle_for = now - self.idle_since
                persona = get_persona()
                curiosity = float(persona.get("curiosity", 0.5))
                # Probability increases with curiosity and idle time
                should_explore = (quiet_for > 5.0 and idle_for > 10.0 and (curiosity > 0.4))
                if should_explore and (count % max(2, int(8 - 6 * curiosity)) == 0):
                    speak("Exploring my surroundings.")
                    self.mode = Mode.DESCRIBE
            # Decide and act
            self.decide_and_act(data)
            # Personality drift
            if count % 5 == 0:
                step_decay(0.002)
            time.sleep(interval_sec)
            count += 1
            if iterations is not None and count >= iterations:
                break
        speak("Assistive engine stopped.")