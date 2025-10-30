from __future__ import annotations

import time

try:
    import RPi.GPIO as GPIO  # type: ignore
except Exception:  # pragma: no cover
    GPIO = None

from .config import CONFIG

# Simple haptic feedback via vibration motor (PWM-capable pin recommended)
# In simulation, prints a message.

VIBRATION_PIN = 18  # PWM pin on Raspberry Pi (BCM numbering)


def _setup_gpio() -> None:
    if GPIO is None:
        return
    try:
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(VIBRATION_PIN, GPIO.OUT)
    except Exception:
        pass


def buzz(intensity: float = 1.0, duration_ms: int = 300) -> None:
    intensity = max(0.0, min(1.0, intensity))
    if CONFIG.simulate or GPIO is None:
        print(f"[SIM-HAPTIC] buzz intensity={intensity} duration_ms={duration_ms}")
        time.sleep(duration_ms / 1000.0)
        return
    try:
        _setup_gpio()
        p = GPIO.PWM(VIBRATION_PIN, 200)
        p.start(intensity * 100)
        time.sleep(duration_ms / 1000.0)
        p.stop()
    except Exception:
        pass