import axios from 'axios';

// Default to localhost, can be configured in settings
const DEFAULT_BASE_URL = 'http://127.0.0.1:8000'; // Local dev default; override in Settings for device

class LumenAPI {
  constructor(baseURL = DEFAULT_BASE_URL) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Update base URL (for settings)
  setBaseURL(url) {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }

  // Assist Engine Controls
  async startAssist(iterations = null, interval = 1.0) {
    try {
      const response = await this.client.post('/api/assist/start', {
        iterations,
        interval,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async stopAssist() {
    try {
      const response = await this.client.post('/api/assist/stop');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Status and Data
  async getStatus() {
    try {
      const response = await this.client.get('/api/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEnvironment() {
    try {
      const response = await this.client.get('/api/environment');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getGPS() {
    try {
      const response = await this.client.get('/api/gps');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getGesture() {
    try {
      const response = await this.client.get('/api/gesture');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Actions
  async speak(text) {
    try {
      const response = await this.client.post('/api/speak', { text });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async capture() {
    try {
      const response = await this.client.post('/api/capture');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async readText(imagePath) {
    try {
      const response = await this.client.post('/api/read-text', {
        image_path: imagePath,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Language
  async getLanguage() {
    try {
      const response = await this.client.get('/api/language');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async setLanguage({ language, tts_engine, piper_voice } = {}) {
    try {
      const response = await this.client.post('/api/language', {
        language,
        tts_engine,
        piper_voice,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // People (Face) APIs
  async listPeople() {
    try {
      const response = await this.client.get('/api/people');
      return response.data;
    } catch (error) { throw this.handleError(error); }
  }

  async enrollPerson(name, imagePath = null) {
    try {
      const response = await this.client.post('/api/people/enroll', { name, image_path: imagePath });
      return response.data;
    } catch (error) { throw this.handleError(error); }
  }

  async forgetPerson(name) {
    try {
      const response = await this.client.delete(`/api/people/${encodeURIComponent(name)}`);
      return response.data;
    } catch (error) { throw this.handleError(error); }
  }

  async recognize(imagePath = null) {
    try {
      const response = await this.client.post('/api/recognize', { image_path: imagePath });
      return response.data;
    } catch (error) { throw this.handleError(error); }
  }

  // Persona & Memory APIs
  async getPersona() {
    try {
      const response = await this.client.get('/api/persona');
      return response.data;
    } catch (error) { throw this.handleError(error); }
  }

  async sendPersonaEvent(event, payload = {}) {
    try {
      const response = await this.client.post('/api/persona/event', { event, payload });
      return response.data;
    } catch (error) { throw this.handleError(error); }
  }

  async getMemory(limit = 50) {
    try {
      const response = await this.client.get('/api/memory', { params: { limit } });
      return response.data;
    } catch (error) { throw this.handleError(error); }
  }

  // Autonomy convenience
  async setAutonomy(enabled, interval = 1.0) {
    try {
      const response = await this.client.post('/api/autonomy', { enabled, interval });
      return response.data;
    } catch (error) { throw this.handleError(error); }
  }

  // Wake listener
  async getWake() {
    try {
      const response = await this.client.get('/api/wake');
      return response.data;
    } catch (error) { throw this.handleError(error); }
  }

  async setWake(enabled, interval = 0.6) {
    try {
      const response = await this.client.post('/api/wake', { enabled, interval });
      return response.data;
    } catch (error) { throw this.handleError(error); }
  }

  // Error handling
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      return new Error(`Server Error: ${error.response.status} - ${error.response.data?.detail || error.response.statusText}`);
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Network Error: Unable to connect to Lumen server. Check if the server is running and the IP address is correct.');
    } else {
      // Something else happened
      return new Error(`Request Error: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new LumenAPI();