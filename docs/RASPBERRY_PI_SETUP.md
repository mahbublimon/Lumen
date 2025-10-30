# Lumen on Raspberry Pi — Setup and Run Guide

This document walks you through installing and running Lumen (with Emo-like autonomy) on a Raspberry Pi. It covers hardware, OS configuration, dependencies, models, running the backend API, autonomy/wake word control, and troubleshooting.

## Hardware Checklist
- Compute: Raspberry Pi 4 (recommended).
- Camera: USB webcam (plug-and-play). Pi Camera (libcamera) works with extra steps; start with USB if possible.
- Audio: USB mic (or mic array) and speaker/headphones.
- Sensors (optional to start):
  - Ultrasonic HC-SR04 (TRIG=GPIO23, ECHO=GPIO24)
  - DHT22 (data=GPIO4)
  - I2C devices (e.g., MLX90614 @ 0x5A, APDS9960)
  - GPS via USB/UART (optional)

## OS Configuration
1. Enable interfaces
   - `sudo raspi-config`
     - Interface Options → enable I2C, SPI, Serial (UART), Camera (if Pi Camera)
2. Add user to groups and reboot
   - `sudo usermod -aG gpio,i2c,audio,video $USER`
   - `sudo reboot`
3. Quick checks after reboot
   - Mic: `arecord -l`
   - Webcam: `v4l2-ctl --list-devices` (install via `sudo apt install v4l-utils` if needed)

## System Packages
```bash
sudo apt update && sudo apt upgrade -y

# Python and build tools
sudo apt install -y python3-pip python3-venv git

# OpenCV and math libs (prefer apt for OpenCV on Pi)
sudo apt install -y python3-opencv libatlas-base-dev libopenblas-dev liblapack-dev

# Audio and sensors
sudo apt install -y libportaudio2 python3-rpi.gpio python3-smbus i2c-tools

# OCR and TTS
sudo apt install -y tesseract-ocr espeak-ng libespeak-ng1
```

## Clone and Python Dependencies
```bash
# Get the code
git clone <YOUR_REPO_URL> ~/Lumen
cd ~/Lumen

# Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install Python deps
pip install --upgrade pip
pip install -r requirements.txt

# NOTE: If you installed OpenCV with apt, avoid pip installing opencv-python.
```

## Models
- People recognition: Uses OpenCV Haar cascade + lightweight embedding; no extra model required.
- Object detection (MobileNet-SSD): Optional but recommended.
  ```bash
  mkdir -p data/models
  cd data/models
  # Download model files (example sources)
  wget https://raw.githubusercontent.com/chuanqi305/MobileNet-SSD/deploy/MobileNetSSD_deploy.prototxt
  mv MobileNetSSD_deploy.prototxt MobileNetSSD_deploy.prototxt.txt
  wget https://github.com/chuanqi305/MobileNet-SSD/raw/master/MobileNetSSD_deploy.caffemodel
  ```
  If these files are missing, object detection simply returns no detections.
- Wake word (Vosk):
  ```bash
  mkdir -p ~/models && cd ~/models
  wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
  unzip vosk-model-small-en-us-0.15.zip
  echo 'export VOSK_MODEL=$HOME/models/vosk-model-small-en-us-0.15' >> ~/.bashrc
  source ~/.bashrc
  ```
  Replace with a different language model if desired (e.g., Bengali).

## Run the Backend API
```bash
# From repo root
source .venv/bin/activate
uvicorn src.server:app --host 0.0.0.0 --port 8000
```
- Test: `curl http://<PI_IP>:8000/api/status`
- Built-in web UI: open `http://<PI_IP>:8000/` in a browser on the same network.

## Control the Assist Engine
- Start finite assist loop (debug):
  ```bash
  python src/main.py assist --iterations 30 --interval 1.0
  # Add --vosk-model "$VOSK_MODEL" to use real voice; otherwise it simulates when SIMULATION is set.
  ```
- Start/stop via API:
  ```bash
  curl -X POST http://<PI_IP>:8000/api/assist/start \
       -H 'Content-Type: application/json' \
       -d '{"iterations": null, "interval": 1.0, "simulate": false, "vosk_model": "'"$VOSK_MODEL"'"}'

  curl -X POST http://<PI_IP>:8000/api/assist/stop
  ```
- Autonomy toggle (infinite loop):
  ```bash
  curl -X POST http://<PI_IP>:8000/api/autonomy -H 'Content-Type: application/json' -d '{"enabled": true, "interval": 1.0}'
  curl -X POST http://<PI_IP>:8000/api/autonomy -H 'Content-Type: application/json' -d '{"enabled": false}'
  ```

## Wake Word Control
```bash
# Enable wake listener (say "lumen" to trigger)
curl -X POST http://<PI_IP>:8000/api/wake -H 'Content-Type: application/json' -d '{"enabled": true, "interval": 0.6}'

# Disable
curl -X POST http://<PI_IP>:8000/api/wake -H 'Content-Type: application/json' -d '{"enabled": false}'
```
Ensure `VOSK_MODEL` is exported in the environment that starts uvicorn and your mic appears in `arecord -l`.

## People and Object Recognition
- Enroll a person (cap: 10 people):
  ```bash
  curl -X POST http://<PI_IP>:8000/api/people/enroll \
       -H 'Content-Type: application/json' -d '{"name": "Alice"}'
  ```
- List people: `curl http://<PI_IP>:8000/api/people`
- Forget a person: `curl -X DELETE http://<PI_IP>:8000/api/people/Alice`
- Recognize now: `curl -X POST http://<PI_IP>:8000/api/recognize -H 'Content-Type: application/json' -d '{}'`
- Objects: place the SSD model files as above; detections will be spoken during Describe mode.

## Environment Variables (optional)
- `VOSK_MODEL=/home/pi/models/vosk-model-small-en-us-0.15`
- `CAMERA_INDEX=0` (try 1 if multiple webcams)
- `GPS_SERIAL_PORT=/dev/serial0` (if using onboard UART)
- `LANGUAGE=en` or `bn`; `TTS_ENGINE=pyttsx3` or `piper`; `PIPER_VOICE=/path/to/voice.onnx`

You can also send some of these via `/api/assist/start` payload.

## Run at Boot (systemd)
Create a service file `/etc/systemd/system/lumen.service`:
```ini
[Unit]
Description=Lumen Control API
After=network-online.target
Wants=network-online.target

[Service]
User=pi
WorkingDirectory=/home/pi/Lumen
Environment=VOSK_MODEL=/home/pi/models/vosk-model-small-en-us-0.15
Environment=PYTHONUNBUFFERED=1
ExecStart=/home/pi/Lumen/.venv/bin/uvicorn src.server:app --host 0.0.0.0 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```
Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable lumen
sudo systemctl start lumen
sudo systemctl status lumen
```

## Troubleshooting
- Mic not detected:
  - `arecord -l` should list your device. Try a different USB port/hub.
  - Install `libportaudio2`. Ensure user is in `audio` group. `alsamixer` to unmute.
- Camera issues:
  - Prefer USB webcam (`python3-opencv` uses V4L2). If using Pi Camera, consider a v4l2 bridge or switch to USB for simplicity.
- Object detection returns empty:
  - Confirm both `MobileNetSSD_deploy.prototxt.txt` and `MobileNetSSD_deploy.caffemodel` exist in `data/models/`.
- Performance on Pi:
  - Start with `--interval 1.0`. Increase interval if TTS overlaps or CPU spikes.
- Permissions/I2C:
  - `i2cdetect -y 1` should show 0x5A for MLX90614 if connected.
- Logs and state:
  - Persona: `data/persona.json`
  - Memory: `data/memory.jsonl`

## What Emo Does on the Pi
- Autonomy: After quiet idle periods, explores surroundings and describes.
- Sound awareness: Investigates when sound activity spikes.
- People & objects: Greets known people (up to 10) and mentions notable objects.
- Safety: Announces and buzzes for nearby obstacles or desk edges.
- Personality: Curiosity/affinity grow with new experiences; patience decays on interruptions.

---
If you need a single command setup script (packages + models + service), open an issue and I’ll include one tailored for your Pi image.