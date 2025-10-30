from __future__ import annotations

import threading
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Body
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

from lumen.config import CONFIG, Config
from lumen.tts import speak
from lumen.camera import capture_image
from lumen.ocr import read_text_from_image
from lumen.gps import get_location
from lumen.gesture import read_gesture
from lumen.env_sensors import read_environment
from lumen.fusion import AssistEngine
from lumen.wake import WakeWordListener
from lumen.vision import enroll_person, list_people, forget_person, recognize
from lumen.persona import get_persona, update_on_event
from lumen.memory import list_events

app = FastAPI(title="Lumen Control API")

# Enable CORS for Expo web preview
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8082", "http://127.0.0.1:8082"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globals for engine management
_engine_lock = threading.Lock()
_engine: Optional[AssistEngine] = None
_engine_thread: Optional[threading.Thread] = None
_wake_lock = threading.Lock()
_wake_listener: Optional[WakeWordListener] = None
_wake_enabled: bool = False


@app.get("/api/status")
def status():
    running = _engine_thread is not None and _engine_thread.is_alive()
    return {
        "simulate": CONFIG.simulate,
        "engine_running": running,
        "env": read_environment(),
        "location": get_location(),
    }


@app.post("/api/speak")
def api_speak(payload: dict = Body(...)):
    text = payload.get("text", "Hello from Lumen")
    speak(text)
    return {"ok": True}


def _start_assist_internal(iterations, interval, vosk_model):
    global _engine, _engine_thread
    with _engine_lock:
        if _engine_thread is not None and _engine_thread.is_alive():
            return False
        _engine = AssistEngine(vosk_model=vosk_model)
        _engine_thread = threading.Thread(target=_engine.run_loop, kwargs={
            "iterations": iterations, "interval_sec": interval
        }, daemon=True)
        _engine_thread.start()
        return True


def _ensure_wake_listener():
    global _wake_listener
    with _wake_lock:
        if _wake_listener is None:
            _wake_listener = WakeWordListener(os.getenv("VOSK_MODEL"))


@app.get("/api/wake")
def api_wake_status():
    return {"enabled": _wake_enabled}


@app.post("/api/wake")
def api_wake_set(payload: dict = Body({})):
    global _wake_enabled
    enable = bool(payload.get("enabled", True))
    interval = float(payload.get("interval", 0.6))
    _ensure_wake_listener()
    if enable and not _wake_enabled and _wake_listener:
        def _cb():
            # Start assist with no iteration limit when wake word detected
            _start_assist_internal(iterations=None, interval=1.0, vosk_model=os.getenv("VOSK_MODEL"))
            speak("Hello, how can I help?")
        _wake_listener.start(_cb, interval_sec=interval)
        _wake_enabled = True
    elif not enable and _wake_enabled and _wake_listener:
        _wake_listener.stop()
        _wake_enabled = False
    return {"ok": True, "enabled": _wake_enabled}


@app.get("/api/language")
def get_language() -> dict:
    return {
        "language": CONFIG.language,
        "tts_engine": CONFIG.tts_engine,
        "piper_voice": CONFIG.piper_voice,
    }


@app.post("/api/language")
def set_language(payload: dict = Body({})) -> dict:
    lang = payload.get("language")
    tts_engine = payload.get("tts_engine")
    piper_voice = payload.get("piper_voice")
    # Update config snapshot with overrides, preserving other fields
    global CONFIG
    CONFIG = Config(
        simulate=CONFIG.simulate,
        tesseract_cmd=CONFIG.tesseract_cmd,
        gps_serial_port=CONFIG.gps_serial_port,
        gps_baudrate=CONFIG.gps_baudrate,
        camera_index=CONFIG.camera_index,
        language=lang or CONFIG.language,
        tts_engine=tts_engine or CONFIG.tts_engine,
        piper_voice=piper_voice or CONFIG.piper_voice,
    )
    return {
        "ok": True,
        "language": CONFIG.language,
        "tts_engine": CONFIG.tts_engine,
        "piper_voice": CONFIG.piper_voice,
    }


@app.post("/api/capture")
def api_capture(payload: dict = Body({})):
    path = payload.get("path", "./data/capture.jpg")
    saved = capture_image(path)
    return {"ok": True, "path": saved}


@app.post("/api/read-text")
def api_read_text(payload: dict = Body({})):
    path = payload.get("path", "./data/read.jpg")
    p = Path(path)
    if not p.exists():
        capture_image(path)
    text = read_text_from_image(path)
    speak(text)
    return {"ok": True, "text": text}


@app.get("/api/gps")
def api_gps():
    return get_location()


@app.get("/api/gesture")
def api_gesture():
    return {"gesture": read_gesture()}


@app.get("/api/environment")
def api_env():
    return read_environment()


@app.post("/api/assist/start")
def api_assist_start(payload: dict = Body({})):
    iterations = payload.get("iterations")  # None -> infinite
    interval = float(payload.get("interval", 1.0))
    vosk_model = payload.get("vosk_model")
    simulate = bool(payload.get("simulate", False))
    gps_port = payload.get("gps_port")

    # Apply runtime overrides
    if simulate:
        os.environ["SIMULATION"] = "1"
    if vosk_model:
        os.environ["VOSK_MODEL"] = vosk_model
    if gps_port:
        os.environ["GPS_SERIAL_PORT"] = gps_port

    # Rebuild config snapshot
    global CONFIG
    CONFIG = Config(simulate=bool(int(os.getenv("SIMULATION", "0"))),
                    tesseract_cmd=os.getenv("TESSERACT_CMD"),
                    gps_serial_port=os.getenv("GPS_SERIAL_PORT"),
                    gps_baudrate=int(os.getenv("GPS_BAUDRATE", "9600")),
                    camera_index=int(os.getenv("CAMERA_INDEX", "0")),
                    language=os.getenv("LANGUAGE", CONFIG.language),
                    tts_engine=os.getenv("TTS_ENGINE", CONFIG.tts_engine),
                    piper_voice=os.getenv("PIPER_VOICE", CONFIG.piper_voice))

    with _engine_lock:
        global _engine, _engine_thread
        if _engine_thread is not None and _engine_thread.is_alive():
            return JSONResponse({"ok": False, "error": "Engine already running"}, status_code=400)
        _start_assist_internal(iterations=iterations, interval=interval, vosk_model=os.getenv("VOSK_MODEL"))
        return {"ok": True}


# --- People (Face Enrollment/Recognition) ---

@app.get("/api/people")
def api_people_list():
    return {"people": list_people()}


@app.post("/api/people/enroll")
def api_people_enroll(payload: dict = Body(...)):
    name = payload.get("name")
    image_path = payload.get("image_path")
    if not name:
        return JSONResponse({"ok": False, "error": "Missing name"}, status_code=400)
    return enroll_person(name, image_path)


@app.delete("/api/people/{name}")
def api_people_forget(name: str):
    return forget_person(name)


@app.post("/api/recognize")
def api_recognize(payload: dict = Body({})):
    image_path = payload.get("image_path")
    names = recognize(image_path)
    return {"recognized": names}


# --- Persona & Memory ---

@app.get("/api/persona")
def api_persona_get():
    return get_persona()


@app.post("/api/persona/event")
def api_persona_event(payload: dict = Body(...)):
    event = payload.get("event")
    pl = payload.get("payload") or {}
    if not event:
        return JSONResponse({"ok": False, "error": "Missing event"}, status_code=400)
    p = update_on_event(event, pl)
    return {"ok": True, "persona": p}


@app.get("/api/memory")
def api_memory_list(limit: int = 50):
    return {"events": list_events(limit)}


# --- Autonomy (convenience to start/stop infinite assist loop) ---

@app.post("/api/autonomy")
def api_autonomy(payload: dict = Body(...)):
    enable = bool(payload.get("enabled", True))
    interval = float(payload.get("interval", 1.0))
    if enable:
        res = _start_assist_internal(iterations=None, interval=interval, vosk_model=os.getenv("VOSK_MODEL"))
        if not res:
            return JSONResponse({"ok": False, "error": "Engine already running"}, status_code=400)
        return {"ok": True, "running": True}
    else:
        # Reuse stop endpoint logic
        with _engine_lock:
            global _engine, _engine_thread
            if _engine is None:
                return {"ok": True, "running": False}
            try:
                _engine.request_stop()
            except Exception:
                pass
            _engine = None
            return {"ok": True, "running": False}


@app.post("/api/assist/stop")
def api_assist_stop():
    with _engine_lock:
        global _engine, _engine_thread
        if _engine is None:
            return {"ok": True}
        try:
            _engine.request_stop()
        except Exception:
            pass
        _engine = None
    return {"ok": True}


# Mount static web UI
root = Path(__file__).resolve().parent.parent
web_dir = root / "web"
web_dir.mkdir(parents=True, exist_ok=True)
app.mount("/", StaticFiles(directory=str(web_dir), html=True), name="web")


if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=False)