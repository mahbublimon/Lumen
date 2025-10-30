from __future__ import annotations

import threading
import time
from typing import Callable, Optional

from .voice import VoiceRecognizer
from .config import CONFIG


class WakeWordListener:
    """Lightweight wake-word listener using Vosk partial results.

    Triggers a callback when the phrase "lumen" (or Bengali "লুমেন") is detected.
    Designed to run as a background thread alongside the API server.
    """

    def __init__(self, vosk_model_path: Optional[str]) -> None:
        self.vosk_model_path = vosk_model_path
        self.vr = VoiceRecognizer(vosk_model_path)
        self.stop_event = threading.Event()
        self.thread: Optional[threading.Thread] = None

    def start(self, callback: Callable[[], None], interval_sec: float = 0.6) -> None:
        if self.thread and self.thread.is_alive():
            return

        def _loop() -> None:
            while not self.stop_event.is_set():
                heard = self.vr.listen_once(timeout_sec=interval_sec)
                t = (heard or "").lower().strip()
                if t and ("lumen" in t or "লুমেন" in t):
                    try:
                        callback()
                    except Exception:
                        pass
                    # small cooldown to avoid multiple triggers
                    time.sleep(1.5)
                time.sleep(0.05)

        self.stop_event.clear()
        self.thread = threading.Thread(target=_loop, daemon=True)
        self.thread.start()

    def stop(self) -> None:
        self.stop_event.set()
        # Do not join daemon thread aggressively; allow graceful exit