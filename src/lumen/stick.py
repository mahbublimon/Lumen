from __future__ import annotations

import random
import time

try:
    import RPi.GPIO as GPIO  # type: ignore
except Exception:  # pragma: no cover
    GPIO = None

from .config import CONFIG

# Ultrasonic sensor HC-SR04 pins (BCM numbering)
TRIG_PIN = 23
ECHO_PIN = 24


def _setup_ultrasonic() -> None:
    if GPIO is None:
        return
    try:
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(TRIG_PIN, GPIO.OUT)
        GPIO.setup(ECHO_PIN, GPIO.IN)
    except Exception:
        pass


def read_distance_cm() -> float | None:
    """Read distance from ultrasonic sensor.

    Returns distance in cm, or a simulated value on non-Pi systems.
    """
    if CONFIG.simulate or GPIO is None:
        # Simulate occasional close obstacles
        base = random.uniform(50, 150)
        if random.random() < 0.2:
            base = random.uniform(20, 60)
        return round(base, 1)

    try:
        _setup_ultrasonic()
        # Trigger pulse
        GPIO.output(TRIG_PIN, True)
        time.sleep(0.00001)
        GPIO.output(TRIG_PIN, False)

        # Wait for echo start
        start = time.time()
        while GPIO.input(ECHO_PIN) == 0:
            start = time.time()
        # Wait for echo end
        stop = time.time()
        while GPIO.input(ECHO_PIN) == 1:
            stop = time.time()
        # Calculate distance
        elapsed = stop - start
        distance = (elapsed * 34300) / 2  # speed of sound in cm/s
        return round(distance, 1)
    except Exception:
        return None