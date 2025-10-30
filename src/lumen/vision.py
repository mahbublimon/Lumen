from __future__ import annotations

import json
import os
from pathlib import Path
import time
from typing import List, Tuple

import cv2
import numpy as np

from .camera import capture_image


PEOPLE_DIR = Path("./data/people")
PEOPLE_DIR.mkdir(parents=True, exist_ok=True)


def _detect_faces(image_bgr: np.ndarray) -> List[Tuple[int, int, int, int]]:
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    boxes = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    return [tuple(map(int, b)) for b in boxes]


def _extract_face_embedding(face_bgr: np.ndarray) -> List[float]:
    gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
    small = cv2.resize(gray, (32, 32))
    vec = small.astype(np.float32).reshape(-1)
    # Normalize to unit length to use cosine similarity
    norm = np.linalg.norm(vec) + 1e-6
    vec = vec / norm
    return vec.astype(float).tolist()


def _load_known_embeddings() -> List[Tuple[str, np.ndarray]]:
    out: List[Tuple[str, np.ndarray]] = []
    for p in PEOPLE_DIR.glob("*.json"):
        try:
            data = json.loads(p.read_text())
            name = data.get("name")
            emb = np.array(data.get("embedding", []), dtype=np.float32)
            if name and emb.size == 32 * 32:
                out.append((name, emb))
        except Exception:
            pass
    return out


def enroll_person(name: str, image_path: str | None = None) -> dict:
    # Capacity limit: up to 10 people
    existing = list(PEOPLE_DIR.glob("*.json"))
    if len(existing) >= 10 and not (PEOPLE_DIR / f"{name}.json").exists():
        return {"ok": False, "error": "Capacity reached (10 people). Forget someone first."}
    path = image_path or capture_image("./data/enroll.jpg")
    img = cv2.imread(path)
    if img is None:
        return {"ok": False, "error": "Image not found"}
    boxes = _detect_faces(img)
    if not boxes:
        return {"ok": False, "error": "No face detected"}
    x, y, w, h = boxes[0]
    face = img[y:y + h, x:x + w]
    emb = _extract_face_embedding(face)
    data = {"name": name, "embedding": emb, "added_at": time.time()}
    (PEOPLE_DIR / f"{name}.json").write_text(json.dumps(data))
    return {"ok": True}


def list_people() -> List[str]:
    names = []
    for p in PEOPLE_DIR.glob("*.json"):
        try:
            data = json.loads(p.read_text())
            name = data.get("name")
            if name:
                names.append(name)
        except Exception:
            pass
    return sorted(names)


def forget_person(name: str) -> dict:
    p = PEOPLE_DIR / f"{name}.json"
    if p.exists():
        try:
            p.unlink()
            return {"ok": True}
        except Exception:
            return {"ok": False, "error": "Unable to delete"}
    return {"ok": False, "error": "Not found"}


def recognize(image_path: str | None = None, threshold: float = 0.8) -> List[str]:
    path = image_path or capture_image("./data/recognize.jpg")
    img = cv2.imread(path)
    if img is None:
        return []
    boxes = _detect_faces(img)
    known = _load_known_embeddings()
    names: List[str] = []
    for (x, y, w, h) in boxes:
        face = img[y:y + h, x:x + w]
        emb = np.array(_extract_face_embedding(face), dtype=np.float32)
        best_name = None
        best_score = 0.0
        for name, kemb in known:
            # cosine similarity
            score = float(np.dot(emb, kemb) / ((np.linalg.norm(emb) * np.linalg.norm(kemb)) + 1e-6))
            if score > best_score:
                best_score = score
                best_name = name
        if best_name and best_score >= threshold:
            names.append(best_name)
        else:
            names.append("Unknown")
    return names