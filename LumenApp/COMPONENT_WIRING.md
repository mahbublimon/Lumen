# Lumen Mobile App - Component Wiring Documentation

## Overview
This document outlines the component structure, navigation flow, and wiring of the Lumen Control mobile application built with React Native and Expo.

## App Architecture

### Main Entry Point
- **File**: `App.js`
- **Purpose**: Root component that sets up navigation, fonts, and global styling
- **Key Features**:
  - Loads Poppins fonts (Regular, SemiBold, Bold)
  - Sets up bottom tab navigation
  - Configures global text styling
  - Implements text-based logo headers

### Navigation Structure
```
App.js (NavigationContainer)
├── Bottom Tab Navigator
    ├── Home Tab → HomeScreen.js
    ├── Control Tab → ControlScreen.js
    ├── Sensors Tab → SensorsScreen.js
    └── Settings Tab → SettingsScreen.js
```

## Component Wiring Details

### 1. App.js (Root Component)
**Dependencies:**
- `@react-navigation/native` - Navigation container
- `@react-navigation/bottom-tabs` - Tab navigation
- `react-native-safe-area-context` - Safe area handling
- `@expo-google-fonts/poppins` - Custom fonts
- `expo-status-bar` - Status bar styling

**Wiring:**
```javascript
NavigationContainer
└── Tab.Navigator
    ├── Tab.Screen (Home) → HomeScreen
    ├── Tab.Screen (Control) → ControlScreen
    ├── Tab.Screen (Sensors) → SensorsScreen
    └── Tab.Screen (Settings) → SettingsScreen
```

**Font Configuration:**
- Default font: `Poppins_400Regular`
- Header titles: `Poppins_700Bold`
- Applied globally via `Text.defaultProps.style`

### 2. HomeScreen.js
**Purpose**: Main dashboard and system overview
**Dependencies:**
- `../services/api.js` - Backend communication
- React Native core components

**Key Features:**
- System status display
- Quick action buttons
- API status monitoring
- Error handling

**API Integration:**
```javascript
import { LumenAPI } from '../services/api';
const api = new LumenAPI();
```

### 3. ControlScreen.js
**Purpose**: Assist engine and device control
**Dependencies:**
- `../services/api.js` - Backend communication
- React Native core components

**Control Features:**
- Assist engine start/stop
- Continuous mode toggle
- Iteration and interval settings
- Text-to-speech controls
- OCR functionality
- Emergency stop

**State Management:**
```javascript
const [assistEngineRunning, setAssistEngineRunning] = useState(false);
const [continuousMode, setContinuousMode] = useState(false);
const [iterations, setIterations] = useState('5');
const [interval, setInterval] = useState('1000');
```

### 4. SensorsScreen.js
**Purpose**: Real-time sensor data monitoring
**Dependencies:**
- `../services/api.js` - Backend communication
- React Native core components

**Data Sources:**
- Environmental sensors (temperature, humidity, pressure)
- GPS coordinates
- Gesture detection data

**Auto-refresh Logic:**
```javascript
useEffect(() => {
  if (autoRefresh) {
    const interval = setInterval(fetchSensorData, 2000);
    return () => clearInterval(interval);
  }
}, [autoRefresh]);
```

### 5. SettingsScreen.js
**Purpose**: App configuration and preferences
**Dependencies:**
- `@react-native-async-storage/async-storage` - Persistent storage
- `../services/api.js` - Backend communication

**Settings Categories:**
- Server configuration (URL, connection testing)
- App preferences (notifications, auto-refresh)
- Network setup assistance
- Reset and documentation access

**Persistent Storage:**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const saveSettings = async () => {
  await AsyncStorage.setItem('serverUrl', serverUrl);
  await AsyncStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
  await AsyncStorage.setItem('autoRefreshSensors', autoRefreshSensors.toString());
};
```

### 6. API Service (services/api.js)
**Purpose**: Centralized backend communication
**Dependencies:**
- `axios` - HTTP client

**API Endpoints:**
```javascript
class LumenAPI {
  constructor(baseURL = 'http://192.168.0.100:8000') {
    this.baseURL = baseURL;
    this.client = axios.create({ baseURL, timeout: 10000 });
  }

  // Assist Engine Controls
  async startAssistEngine(continuous, iterations, interval)
  async stopAssistEngine()
  async getAssistEngineStatus()

  // System Status
  async getStatus()
  async getSensorData()

  // Actions
  async speak(text)
  async captureImage()
  async readText()
}
```

## Data Flow

### 1. App Initialization
```
App.js loads → Fonts loaded → Navigation setup → Default screen (Home) rendered
```

### 2. API Communication Flow
```
Screen Component → API Service → HTTP Request → FastAPI Backend → Response → State Update → UI Refresh
```

### 3. Settings Persistence Flow
```
User Input → Settings Screen → AsyncStorage → Persistent Storage → App Restart → Settings Restored
```

## Component Dependencies Graph

```
App.js
├── HomeScreen.js
│   └── api.js
├── ControlScreen.js
│   └── api.js
├── SensorsScreen.js
│   └── api.js
└── SettingsScreen.js
    ├── api.js
    └── AsyncStorage
```

## External Dependencies

### Navigation
- `@react-navigation/native`: ^7.1.18
- `@react-navigation/bottom-tabs`: ^7.5.0
- `react-native-safe-area-context`: ^5.6.1
- `react-native-screens`: ^4.18.0

### Fonts & UI
- `@expo-google-fonts/poppins`: ^0.4.1
- `expo-font`: ~14.0.9
- `expo-status-bar`: ~3.0.8

### Storage & HTTP
- `@react-native-async-storage/async-storage`: ^2.2.0
- `axios`: ^1.12.2

### Core
- `expo`: ~54.0.20
- `react`: 19.1.0
- `react-native`: 0.81.5

## Configuration Files

### app.json
```json
{
  "expo": {
    "name": "Lumen Control",
    "slug": "lumen-control",
    "platforms": ["ios", "android", "web"],
    "permissions": ["INTERNET", "ACCESS_NETWORK_STATE", "CAMERA", "RECORD_AUDIO"]
  }
}
```

### package.json Scripts
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  }
}
```

## Error Handling Strategy

### API Errors
- Network timeouts (10s)
- Connection failures
- HTTP error responses
- User-friendly error messages

### Component Errors
- Loading states during API calls
- Fallback UI for missing data
- Graceful degradation

## Development Workflow

### Running the App
1. **Mobile**: `npx expo start` → Scan QR with Expo Go
2. **Web**: `npx expo start --web --port 8082`
3. **Android Emulator**: `npx expo start --android`
4. **iOS Simulator**: `npx expo start --ios`

### File Structure
```
LumenApp/
├── App.js                 # Root component
├── app.json              # Expo configuration
├── package.json          # Dependencies
├── assets/               # Images and icons
└── src/
    ├── screens/          # Screen components
    │   ├── HomeScreen.js
    │   ├── ControlScreen.js
    │   ├── SensorsScreen.js
    │   └── SettingsScreen.js
    └── services/         # API and utilities
        └── api.js
```

## Backend Integration

### FastAPI Server
- **URL**: `http://192.168.0.100:8000` (configurable)
- **Endpoints**: `/status`, `/sensors`, `/assist-engine/*`, `/speak`, `/capture`, `/read-text`
- **Protocol**: HTTP REST API with JSON responses

### Real-time Updates
- Polling-based updates (2-second intervals for sensors)
- Manual refresh capabilities
- Auto-refresh toggle in settings

## Styling & Theming

### Color Scheme
- Primary: `salmon`
- Background: `#f5f5f5`
- Text: Default system colors
- Error: `#ff3b30`
- Success: `#34c759`

### Typography
- Default: `Poppins_400Regular`
- Headers: `Poppins_700Bold`
- Emphasis: `Poppins_600SemiBold`

This document provides a complete overview of how all components are wired together in the Lumen mobile application.