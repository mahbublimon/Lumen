from __future__ import annotations

import argparse
import os
from pathlib import Path

from lumen.config import CONFIG, Config
from lumen.tts import speak
from lumen.ocr import read_text_from_image
from lumen.camera import capture_image
from lumen.voice import VoiceRecognizer
from lumen.gesture import read_gesture
from lumen.gps import get_location
from lumen.env_sensors import read_environment


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="lumen", description="Lumen Assistive Robot CLI")
    p.add_argument("command", choices=[
        "read-text", "speak", "capture", "listen", "gesture", "gps", "status", "assist"
    ], help="Command to run")
    p.add_argument("--image", help="Path to image for OCR or capture output", default="./data/capture.jpg")
    p.add_argument("--text", help="Text to speak", default="Hello from Lumen!")
    p.add_argument("--simulate", action="store_true", help="Run in simulation mode")
    p.add_argument("--vosk-model", help="Path to Vosk model for voice recognition")
    p.add_argument("--gps-port", help="Serial port for GPS (COM3 or /dev/serial0)")
    p.add_argument("--iterations", type=int, default=30, help="Iterations for assist loop")
    p.add_argument("--interval", type=float, default=1.0, help="Interval seconds for assist loop")
    return p


def apply_overrides(args: argparse.Namespace) -> None:
    if args.simulate:
        os.environ["SIMULATION"] = "1"
    if args.vosk_model:
        os.environ["VOSK_MODEL"] = args.vosk_model
    if args.gps_port:
        os.environ["GPS_SERIAL_PORT"] = args.gps_port


def cmd_read_text(image_path: str) -> None:
    # If the image does not exist, try capturing one first
    if not Path(image_path).exists():
        print("Image not found; capturing a new image...")
        capture_image(image_path)
    text = read_text_from_image(image_path)
    print(f"OCR: {text}")
    speak(text)


def cmd_speak(text: str) -> None:
    speak(text)


def cmd_capture(image_path: str) -> None:
    saved = capture_image(image_path)
    print(f"Saved image to: {saved}")


def cmd_listen(vosk_model: str | None) -> None:
    model_path = vosk_model or os.getenv("VOSK_MODEL")
    vr = VoiceRecognizer(model_path)
    print("Listening...")
    heard = vr.listen_once()
    print(f"Heard: {heard}")


def cmd_gesture() -> None:
    g = read_gesture()
    print(f"Gesture: {g}")


def cmd_gps() -> None:
    loc = get_location()
    print(f"GPS: {loc}")


def cmd_status() -> None:
    print("Simulation:", CONFIG.simulate)
    print("Environment:", read_environment())


def cmd_assist(iterations:int, interval:float, vosk_model:str|None) -> None:
    from lumen.fusion import AssistEngine
    engine = AssistEngine(vosk_model)
    engine.run_loop(iterations=iterations, interval_sec=interval)


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    apply_overrides(args)

    # Rebuild config with updated env (simple approach)
    global CONFIG
    CONFIG = Config(simulate=bool(int(os.getenv("SIMULATION", "0"))),
                    tesseract_cmd=os.getenv("TESSERACT_CMD"),
                    gps_serial_port=os.getenv("GPS_SERIAL_PORT"),
                    gps_baudrate=int(os.getenv("GPS_BAUDRATE", "9600")),
                    camera_index=int(os.getenv("CAMERA_INDEX", "0")))

    if args.command == "read-text":
        cmd_read_text(args.image)
    elif args.command == "speak":
        cmd_speak(args.text)
    elif args.command == "capture":
        cmd_capture(args.image)
    elif args.command == "listen":
        cmd_listen(args.vosk_model)
    elif args.command == "gesture":
        cmd_gesture()
    elif args.command == "gps":
        cmd_gps()
    elif args.command == "status":
        cmd_status()
    elif args.command == "assist":
        cmd_assist(args.iterations, args.interval, args.vosk_model)


if __name__ == "__main__":
    main()