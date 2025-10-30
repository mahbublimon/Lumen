from __future__ import annotations

import re

try:
    import serial
except Exception:  # pragma: no cover
    serial = None

from .config import CONFIG


_nmea_re = re.compile(r"GP(GGA|RMC),")


def get_location(timeout_sec: float = 3.0) -> dict:
    """Read NMEA sentences from GPS and return a simple location dict.

    In simulation mode, returns a fixed coordinate.
    """
    if CONFIG.simulate or serial is None or not CONFIG.gps_serial_port:
        return {"lat": 37.4219999, "lon": -122.0840575, "sat": 8, "fix": True}

    try:
        ser = serial.Serial(CONFIG.gps_serial_port, CONFIG.gps_baudrate, timeout=timeout_sec)
    except Exception:
        return {"error": "Serial port unavailable"}

    lat, lon, fix = None, None, False
    try:
        for _ in range(50):
            line = ser.readline().decode(errors="ignore").strip()
            if not line:
                continue
            if ",A," in line and "GPRMC" in line:
                # Very naive parse of RMC
                parts = line.split(',')
                try:
                    lat_raw, lat_dir = parts[3], parts[4]
                    lon_raw, lon_dir = parts[5], parts[6]
                    lat = _nmea_to_deg(lat_raw, lat_dir)
                    lon = _nmea_to_deg(lon_raw, lon_dir)
                    fix = True
                    break
                except Exception:
                    continue
    finally:
        try:
            ser.close()
        except Exception:
            pass

    if lat is None or lon is None:
        return {"error": "No fix"}
    return {"lat": lat, "lon": lon, "fix": fix}


def _nmea_to_deg(value: str, direction: str) -> float:
    # value example: ddmm.mmmm for lat, dddmm.mmmm for lon
    if not value:
        raise ValueError("Empty NMEA value")
    if len(value) < 4:
        raise ValueError("Malformed NMEA value")
    if len(value.split('.')[0]) in (4, 5):
        deg_len = len(value.split('.')[0]) - 2
    else:
        deg_len = 2
    degrees = float(value[:deg_len])
    minutes = float(value[deg_len:])
    result = degrees + minutes / 60.0
    if direction in ('S', 'W'):
        result = -result
    return result