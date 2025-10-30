from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Dict, List

MEMORY_LOG = Path("./data/memory.jsonl")


def log_event(kind: str, payload: Dict | None = None) -> None:
    MEMORY_LOG.parent.mkdir(parents=True, exist_ok=True)
    entry = {"ts": time.time(), "kind": kind, "payload": payload or {}}
    try:
        with MEMORY_LOG.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        pass


def list_events(limit: int = 50) -> List[Dict]:
    if not MEMORY_LOG.exists():
        return []
    try:
        lines = MEMORY_LOG.read_text().splitlines()
        out = [json.loads(l) for l in lines[-limit:]]
        return out
    except Exception:
        return []