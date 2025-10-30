from __future__ import annotations

import numpy as np

try:
    import sounddevice as sd
except Exception:  # pragma: no cover
    sd = None

from .config import CONFIG


def detect_sound_activity(duration_sec: float = 0.2, samplerate: int = 16000) -> dict:
    """Return simple RMS-based activity metric from mic input.

    With a single mic, we can't localize direction, but we can detect whether
    sound is present and its approximate energy.
    """
    if CONFIG.simulate or sd is None:
        return {"active": False, "rms": 0.0}
    try:
        audio = sd.rec(int(duration_sec * samplerate), samplerate=samplerate, channels=1, dtype='float32')
        sd.wait()
        arr = audio.reshape(-1)
        rms = float(np.sqrt(np.mean(arr ** 2)))
        return {"active": rms > 0.02, "rms": rms}
    except Exception:
        return {"active": False, "rms": 0.0}