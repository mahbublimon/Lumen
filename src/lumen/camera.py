from __future__ import annotations

import os
from pathlib import Path

try:
    import cv2
except Exception:  # pragma: no cover
    cv2 = None

from .config import CONFIG


def capture_image(output_path: str | os.PathLike, camera_index: int | None = None) -> str:
    """Capture an image from a camera and save to disk.

    In simulation mode, generates a blank image with text overlay.
    Returns the saved file path.
    """
    global cv2
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    if CONFIG.simulate or cv2 is None:
        try:
            # Create a simple placeholder image
            import numpy as np
            if cv2 is not None:
                img = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(img, "SIMULATED IMAGE", (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                cv2.imwrite(str(out), img)
            else:
                # Write a minimal PPM file without OpenCV
                width, height = 640, 480
                header = f"P6\n{width} {height}\n255\n".encode("ascii")
                black = bytes([0, 0, 0]) * width * height
                with open(out, "wb") as f:
                    f.write(header)
                    f.write(black)
        except Exception:
            # As a last resort, create an empty file placeholder
            out.touch()
        return str(out)

    index = CONFIG.camera_index if camera_index is None else camera_index
    cap = cv2.VideoCapture(index)
    ok, frame = cap.read()
    cap.release()
    if not ok or frame is None:
        raise RuntimeError("Failed to capture image from camera")
    cv2.imwrite(str(out), frame)
    return str(out)