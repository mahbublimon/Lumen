from __future__ import annotations

import random

try:
    import board
    import adafruit_dht
except Exception:  # pragma: no cover
    board = None
    adafruit_dht = None

try:
    import smbus2
except Exception:  # pragma: no cover
    smbus2 = None

from .config import CONFIG


def read_environment() -> dict:
    """Read environment sensors: DHT22 (temp, humidity), MQ2/MQ9 (gas), GY906 (IR temp).

    In simulation, returns randomized but reasonable values.
    """
    if CONFIG.simulate:
        return {
            "temperature_c": round(random.uniform(20.0, 28.0), 1),
            "humidity_pct": round(random.uniform(30.0, 60.0), 1),
            "mq2_ppm": round(random.uniform(50, 300), 1),
            "mq9_ppm": round(random.uniform(10, 100), 1),
            "ir_temp_c": round(random.uniform(20.0, 30.0), 1),
        }

    data: dict = {}

    # DHT22 via adafruit-circuitpython-dht
    try:
        if adafruit_dht is not None and board is not None:
            dht_device = adafruit_dht.DHT22(board.D4)  # GPIO4 as example
            data["temperature_c"] = float(dht_device.temperature)
            data["humidity_pct"] = float(dht_device.humidity)
    except Exception:
        pass

    # MQ2/MQ9 would require MCP3008 ADC via SPI to get analog values.
    # Placeholder until SPI ADC integration is implemented.
    data["mq2_ppm"] = None
    data["mq9_ppm"] = None

    # GY906 (MLX90614) via I2C, address 0x5A
    try:
        if smbus2 is not None:
            bus = smbus2.SMBus(1)
            # MLX90614 object temperature register 0x07 returns 0.02K units
            raw = bus.read_word_data(0x5A, 0x07)
            # Swap bytes due to SMBus endianness
            raw = ((raw & 0xFF) << 8) | (raw >> 8)
            temp_k = raw * 0.02
            data["ir_temp_c"] = temp_k - 273.15
            bus.close()
    except Exception:
        pass

    return data