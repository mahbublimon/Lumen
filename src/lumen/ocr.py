from __future__ import annotations

import os
from pathlib import Path

try:
    import cv2
except Exception:  # pragma: no cover
    cv2 = None

try:
    import pytesseract
except Exception:  # pragma: no cover
    pytesseract = None

from .config import CONFIG


def read_text_from_image(image_path: str | os.PathLike) -> str:
    """Perform OCR on an image and return extracted text.

    In simulation mode or when deps are missing, return a canned string.
    """
    if CONFIG.simulate or cv2 is None or pytesseract is None:
        return "Simulation: This is sample text from a book page."

    # Configure tesseract binary if provided
    if CONFIG.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = CONFIG.tesseract_cmd

    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")

    img = cv2.imread(str(path))
    if img is None:
        raise RuntimeError("OpenCV failed to read the image")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Basic preprocessing can improve OCR
    gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    text = pytesseract.image_to_string(gray)
    return text.strip()