async function api(path, method = 'GET', body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  return res.json();
}

async function refreshStatus() {
  const s = await api('/api/status');
  document.getElementById('engineStatus').textContent = JSON.stringify(s, null, 2);
}

async function startEngine() {
  const iterationsVal = document.getElementById('iterations').value;
  const iterations = iterationsVal === '' ? null : Number(iterationsVal);
  const interval = Number(document.getElementById('interval').value || 1);
  const vosk = document.getElementById('vosk').value || null;
  const gps = document.getElementById('gps').value || null;
  await api('/api/assist/start', 'POST', { iterations, interval, vosk_model: vosk, gps_port: gps, simulate: true });
  await refreshStatus();
}

async function stopEngine() {
  await api('/api/assist/stop', 'POST', {});
  await refreshStatus();
}

async function speakText() {
  const text = document.getElementById('say').value;
  await api('/api/speak', 'POST', { text });
}

async function captureImage() {
  const r = await api('/api/capture', 'POST', { path: './data/capture.jpg' });
  document.getElementById('ocrText').textContent = JSON.stringify(r, null, 2);
}

async function readText() {
  const r = await api('/api/read-text', 'POST', { path: './data/read.jpg' });
  document.getElementById('ocrText').textContent = r.text || JSON.stringify(r, null, 2);
}

async function showGPS() {
  const r = await api('/api/gps');
  document.getElementById('sensorStatus').textContent = JSON.stringify(r, null, 2);
}

async function showEnv() {
  const r = await api('/api/environment');
  document.getElementById('sensorStatus').textContent = JSON.stringify(r, null, 2);
}

async function showGesture() {
  const r = await api('/api/gesture');
  document.getElementById('sensorStatus').textContent = JSON.stringify(r, null, 2);
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('refresh').addEventListener('click', refreshStatus);
  document.getElementById('start').addEventListener('click', startEngine);
  document.getElementById('stop').addEventListener('click', stopEngine);
  document.getElementById('speak').addEventListener('click', speakText);
  document.getElementById('capture').addEventListener('click', captureImage);
  document.getElementById('read').addEventListener('click', readText);
  document.getElementById('gpsBtn').addEventListener('click', showGPS);
  document.getElementById('envBtn').addEventListener('click', showEnv);
  document.getElementById('gestureBtn').addEventListener('click', showGesture);
  refreshStatus();
});