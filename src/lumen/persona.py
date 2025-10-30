from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Dict

PERSONA_PATH = Path("./data/persona.json")

DEFAULT_PERSONA = {
    "curiosity": 0.5,
    "patience": 0.5,
    "affinity": {},  # per name: float
    "last_update": 0.0,
}


def _load() -> Dict:
    if PERSONA_PATH.exists():
        try:
            return json.loads(PERSONA_PATH.read_text())
        except Exception:
            pass
    return DEFAULT_PERSONA.copy()


def _save(p: Dict) -> None:
    PERSONA_PATH.parent.mkdir(parents=True, exist_ok=True)
    p["last_update"] = time.time()
    PERSONA_PATH.write_text(json.dumps(p))


def get_persona() -> Dict:
    return _load()


def update_trait(name: str, delta: float) -> Dict:
    p = _load()
    p[name] = max(0.0, min(1.0, float(p.get(name, 0.5)) + float(delta)))
    _save(p)
    return p


def update_affinity(person_name: str, delta: float) -> Dict:
    p = _load()
    aff = p.get("affinity", {})
    aff[person_name] = max(0.0, min(1.0, float(aff.get(person_name, 0.5)) + float(delta)))
    p["affinity"] = aff
    _save(p)
    return p


def update_on_event(event: str, payload: Dict | None = None) -> Dict:
    p = _load()
    # Simple rules
    if event == "greet" and payload and payload.get("name"):
        update_affinity(payload["name"], +0.05)
        update_trait("curiosity", +0.01)
    elif event == "interrupt":
        update_trait("patience", -0.10)
    elif event == "novel_object":
        update_trait("curiosity", +0.02)
    elif event == "obstacle":
        update_trait("patience", -0.02)
    else:
        _save(p)
    return _load()


def step_decay(rate: float = 0.001) -> Dict:
    """Gently moves traits toward neutral (0.5) over time.

    Also softly decays extreme affinities toward 0.5 to simulate settling.
    """
    p = _load()
    for trait in ("curiosity", "patience"):
        v = float(p.get(trait, 0.5))
        if v > 0.5:
            v = max(0.5, v - rate)
        elif v < 0.5:
            v = min(0.5, v + rate)
        p[trait] = v
    aff = p.get("affinity", {})
    for name, val in list(aff.items()):
        v = float(val)
        if v > 0.5:
            v = max(0.5, v - rate / 2)
        elif v < 0.5:
            v = min(0.5, v + rate / 2)
        aff[name] = v
    p["affinity"] = aff
    _save(p)
    return p