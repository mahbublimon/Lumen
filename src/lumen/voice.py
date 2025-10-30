from __future__ import annotations

import json

try:
    from vosk import Model, KaldiRecognizer
    import sounddevice as sd
except Exception:  # pragma: no cover
    Model = None
    KaldiRecognizer = None
    sd = None

from .config import CONFIG


class VoiceRecognizer:
    def __init__(self, model_path: str | None = None) -> None:
        self.simulate = CONFIG.simulate
        self.model_path = model_path
        self.model = None
        self.samplerate = 16000
        if not self.simulate and Model is not None and model_path:
            try:
                self.model = Model(model_path)
            except Exception:
                self.model = None

    def listen_once(self, timeout_sec: float = 5.0) -> str:
        if self.simulate or self.model is None or sd is None:
            return "Simulation: navigate to library"
        rec = KaldiRecognizer(self.model, self.samplerate)
        try:
            audio = sd.rec(int(timeout_sec * self.samplerate), samplerate=self.samplerate, channels=1, dtype='int16')
            sd.wait()
        except Exception:
            return "Error: Audio input unavailable"
        if rec.AcceptWaveform(audio.tobytes()):
            result = rec.Result()
        else:
            result = rec.PartialResult()
        try:
            data = json.loads(result)
            return data.get("text", "")
        except Exception:
            return ""