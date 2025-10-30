import os
from pathlib import Path
from typing import List, Tuple

import cv2
import numpy as np

from .camera import capture_image


# Default model paths (optional). If missing, we fall back gracefully.
MODELS_DIR = Path("./data/models")
PROTOTXT = Path(os.getenv("LUMEN_SSD_PROTOTXT", MODELS_DIR / "MobileNetSSD_deploy.prototxt.txt"))
CAFFEMODEL = Path(os.getenv("LUMEN_SSD_MODEL", MODELS_DIR / "MobileNetSSD_deploy.caffemodel"))

# Standard class list for MobileNet-SSD (20 Pascal VOC classes + background)
SSD_CLASSES = [
    "background", "aeroplane", "bicycle", "bird", "boat",
    "bottle", "bus", "car", "cat", "chair", "cow", "diningtable",
    "dog", "horse", "motorbike", "person", "pottedplant",
    "sheep", "sofa", "train", "tvmonitor"
]


def _load_net():
    if PROTOTXT.exists() and CAFFEMODEL.exists():
        try:
            net = cv2.dnn.readNetFromCaffe(str(PROTOTXT), str(CAFFEMODEL))
            return net
        except Exception:
            return None
    return None


_NET = _load_net()


def detect_objects(image_path: str | None = None, conf_threshold: float = 0.5) -> List[Tuple[str, float, Tuple[int, int, int, int]]]:
    """Detect objects in an image using MobileNet-SSD if available.

    Returns list of tuples: (label, confidence, bbox[x1,y1,x2,y2])
    Falls back to empty list if model files are absent.
    """
    path = image_path or capture_image("./data/scene.jpg")
    img = cv2.imread(path)
    if img is None:
        return []

    if _NET is None:
        return []

    (h, w) = img.shape[:2]
    blob = cv2.dnn.blobFromImage(cv2.resize(img, (300, 300)), 0.007843, (300, 300), 127.5)
    _NET.setInput(blob)
    detections = _NET.forward()

    results = []
    for i in range(detections.shape[2]):
        confidence = float(detections[0, 0, i, 2])
        if confidence < conf_threshold:
            continue
        idx = int(detections[0, 0, i, 1])
        if idx < 0 or idx >= len(SSD_CLASSES):
            continue
        box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
        (x1, y1, x2, y2) = box.astype("int")
        label = SSD_CLASSES[idx]
        results.append((label, confidence, (int(x1), int(y1), int(x2), int(y2))))
    return results