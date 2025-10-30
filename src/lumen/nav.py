from __future__ import annotations

from typing import Optional, Tuple

from .stick import read_distance_cm


def check_cliff(threshold_cm: float = 30.0) -> Tuple[bool, Optional[float]]:
    """Detect a potential cliff or desk edge using ultrasonic distance.

    Returns a tuple (danger, distance_cm). Danger is True when distance is below threshold,
    indicating something very close beneath/ ahead (approximate heuristic).
    """
    d = read_distance_cm()
    if d is None:
        return False, None
    if d < threshold_cm:
        return True, d
    return False, d