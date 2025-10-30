from __future__ import annotations

import random

try:
    import smbus2
except Exception:  # pragma: no cover
    smbus2 = None

from .config import CONFIG

# APDS9960 I2C address and registers would be defined here.
# For now, we provide a simulation stub.

GESTURES = ["up", "down", "left", "right", "near", "far"]


def read_gesture() -> str:
    """Read a gesture from APDS9960. Simulation returns random gesture."""
    if CONFIG.simulate or smbus2 is None:
        return random.choice(GESTURES)
    # TODO: Implement APDS9960 init and read sequence using I2C
    raise NotImplementedError("APDS9960 integration pending")