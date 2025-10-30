# Lumen: Assistive Robot for Blind Students

Lumen is a robotic companion designed to assist blind students by enhancing independence through text-to-speech, gesture recognition, GPS navigation, voice interaction, photo capture, and environmental monitoring.

## Features
- Text to Speech from Book: Converts printed text into speech using OCR + TTS.
- Gesture Recognition: Detects gestures via APDS9960 and responds with audio.
- GPS Navigation: Provides location and simple navigation cues.
- Voice Recognition: Responds to voice commands offline (Vosk) or via other engines.
- Photo Capture: Captures images to describe surroundings or assist with learning.
- Environmental Monitoring: Reads temperature/humidity (DHT22), gas sensors (MQ2 & MQ9), and IR temp (GY906/MLX90614).

## Hardware Components
- Raspberry Pi 3B: Central compute (supports I2C, SPI, UART, audio, camera).
- DHT22: Digital temperature/humidity sensor.
- MQ2 & MQ9: Gas and air quality sensors (require ADC like MCP3008 on Pi).
- APDS9960: Gesture + proximity sensor via I2C.
- NEO M8N GPS: GNSS module via UART/USB, outputs NMEA sentences.
- GY906 (MLX90614): Infrared temperature sensor via I2C.
- Camera: Pi Camera or USB webcam.
- Ultrasonic (HC-SR04): Distance sensing for blind stick.
- Vibration Motor: Haptic feedback (PWM pin on Pi).

## Project Structure
```
Lumen/
  README.md
  requirements.txt
  src/
    main.py          # CLI entrypoint
    lumen/
      __init__.py
      config.py      # Global config and simulation flag
      tts.py         # Text-to-speech
      ocr.py         # OCR pipeline
      voice.py       # Voice recognition
      camera.py      # Photo capture
      gesture.py     # APDS9960 integration
      gps.py         # GPS via serial (NMEA)
      env_sensors.py # DHT22, MQ2/MQ9, GY906
      fusion.py      # Context-aware fusion engine
      actuators.py   # Haptic buzz control
      stick.py       # Ultrasonic distance for blind stick
```

## Assistive Fusion Algorithm (Blind Stick Ready)
The engine prioritizes safety while supporting multimodal interaction.
- Inputs: voice intents (Vosk), gestures (APDS9960), GPS (NMEA), environment sensors (DHT22/MQ2/MQ9/MLX90614), camera, ultrasonic distance.
- Modes: `idle`, `navigation`, `reading`, `describe`, `status`.
- Safety: immediate alerts for obstacles and poor air quality; haptic buzz varies with severity.
- Navigation: basic periodic location announcements until route planning is added.
- Reading: capture image and OCR, then speak text.
- Describe: capture scene and speak a placeholder message.
- Status: speak key environment readings.

Run the assist loop:
- `python src/main.py --simulate assist --iterations 30 --interval 1.0`

## Getting Started (Simulation Mode on Windows)
1. Ensure Python 3.10+ is installed.
2. Optional: create a virtual environment.
3. Install dependencies: `pip install -r requirements.txt`.
4. Set `SIMULATION=1` or pass `--simulate` to the CLI.
5. Try: `python src/main.py --simulate status` and `python src/main.py --simulate assist`.

Note: OCR requires Tesseract installed separately (https://tesseract-ocr.github.io/). In simulation, Lumen returns mock text.

## Raspberry Pi Setup (Real Hardware)
- Enable I2C, SPI, UART via `raspi-config`.
- Install Tesseract: `sudo apt-get install tesseract-ocr`.
- GPS: connect NEO M8N via USB or UART (`/dev/serial0`), run `python src/main.py assist --gps-port /dev/serial0`.
- APDS9960: I2C (`SDA`, `SCL`), power 3.3V.
- DHT22: GPIO (e.g., `GPIO4`), use `adafruit-circuitpython-dht`.
- MQ2/MQ9: via MCP3008 ADC (SPI) — integrate readings into `env_sensors.py`.
- MLX90614: I2C `0x5A` — reading stub provided.
- Ultrasonic (HC-SR04): `TRIG GPIO23`, `ECHO GPIO24` — wired to `stick.py`.
- Vibration Motor: PWM pin (e.g., `GPIO18`) — controlled by `actuators.py`.

## Roadmap
- Route guidance with map matching and turn-by-turn prompts.
- Scene description using on-device models.
- Calibrated thresholds and sensor fusion filters (e.g., exponential smoothing).
- Packaging and service scripts for autostart.

## License
Proprietary unless specified otherwise.