from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import sys

try:
    import pyttsx3
except Exception:  # pragma: no cover
    pyttsx3 = None

try:
    import winsound  # Windows-only
except Exception:  # pragma: no cover
    winsound = None

from .config import CONFIG


class TTS:
    def __init__(self) -> None:
        self.simulate = CONFIG.simulate
        self.language = CONFIG.language.lower() if CONFIG.language else "en"
        self.tts_engine = (CONFIG.tts_engine or "pyttsx3").lower()
        self.piper_voice = CONFIG.piper_voice
        self.engine = None
        # Initialize pyttsx3 when requested
        if not self.simulate and self.tts_engine == "pyttsx3" and pyttsx3 is not None:
            try:
                self.engine = pyttsx3.init()
                self._select_voice_by_language(self.language)
            except Exception:
                self.engine = None

    def _select_voice_by_language(self, lang: str) -> None:
        if self.engine is None:
            return
        try:
            voices = self.engine.getProperty('voices')
            target = None
            for v in voices:
                name = (getattr(v, 'name', '') or '').lower()
                langs = getattr(v, 'languages', []) or []
                # languages may be bytes in some engines
                langs_str = [str(x).lower() for x in langs]
                if 'bn' in name or 'bengali' in name or 'bangla' in name:
                    target = v
                    break
                if any('bn' in l for l in langs_str):
                    target = v
                    break
            if target:
                self.engine.setProperty('voice', target.id)
        except Exception:
            pass

    def _speak_with_piper(self, text: str) -> bool:
        # Use Piper CLI if available and voice is set
        if self.simulate:
            print(f"[SIM-TTS] {text}")
            return True
        piper_bin = shutil.which('piper')
        if not piper_bin or not self.piper_voice:
            return False
        try:
            # Create a temporary wav file
            tmp_dir = tempfile.gettempdir()
            wav_path = os.path.join(tmp_dir, 'lumen_tts.wav')
            # Run Piper: text via stdin, output to wav file
            cmd = [piper_bin, '-m', self.piper_voice, '--output_file', wav_path]
            subprocess.run(cmd, input=text.encode('utf-8'), check=True)
            # Play the wav (Windows: winsound)
            if winsound is not None:
                winsound.PlaySound(wav_path, winsound.SND_FILENAME)
            else:
                # Fallback: try to open with OS default player
                if sys.platform.startswith('darwin'):
                    subprocess.run(['afplay', wav_path], check=False)
                elif sys.platform.startswith('linux'):
                    subprocess.run(['aplay', wav_path], check=False)
                else:
                    os.startfile(wav_path)  # type: ignore
            return True
        except Exception:
            return False

    def _speak_with_pyttsx3(self, text: str) -> bool:
        if self.simulate:
            print(f"[SIM-TTS] {text}")
            return True
        if self.engine is None:
            return False
        try:
            self.engine.say(text)
            self.engine.runAndWait()
            return True
        except Exception:
            return False

    def speak(self, text: str) -> None:
        # Prefer Piper for Bangla if configured
        if self.tts_engine == 'piper' or self.language.startswith('bn'):
            if self._speak_with_piper(text):
                return
            # Fallback to pyttsx3
            if self.engine is None and pyttsx3 is not None:
                try:
                    self.engine = pyttsx3.init()
                    self._select_voice_by_language(self.language)
                except Exception:
                    self.engine = None
            if self._speak_with_pyttsx3(text):
                return
            print(f"[SIM-TTS] {text}")
            return

        # Default: pyttsx3
        if self._speak_with_pyttsx3(text):
            return
        # Last resort
        print(f"[SIM-TTS] {text}")


def speak(text: str) -> None:
    TTS().speak(text)