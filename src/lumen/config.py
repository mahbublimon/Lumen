import os
from dataclasses import dataclass

@dataclass
class Config:
    simulate: bool = bool(int(os.getenv("SIMULATION", "0")))
    tesseract_cmd: str | None = os.getenv("TESSERACT_CMD")
    gps_serial_port: str | None = os.getenv("GPS_SERIAL_PORT")  # e.g., "COM3" on Windows or "/dev/serial0" on Pi
    gps_baudrate: int = int(os.getenv("GPS_BAUDRATE", "9600"))
    camera_index: int = int(os.getenv("CAMERA_INDEX", "0"))
    # Language and TTS configuration
    language: str = os.getenv("LANGUAGE", "en")  # e.g., "en" or "bn"
    tts_engine: str = os.getenv("TTS_ENGINE", "pyttsx3")  # "pyttsx3" or "piper"
    piper_voice: str | None = os.getenv("PIPER_VOICE")  # Path to Piper voice model file

CONFIG = Config()