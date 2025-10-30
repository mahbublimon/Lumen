import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

export default function ControlScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [iterations, setIterations] = useState('');
  const [interval, setInterval] = useState('1.0');
  const [speakText, setSpeakText] = useState('');
  const [loading, setLoading] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [autonomyEnabled, setAutonomyEnabled] = useState(false);
  const [wakeEnabled, setWakeEnabled] = useState(false);
  const [people, setPeople] = useState([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [persona, setPersona] = useState(null);
  const [memory, setMemory] = useState([]);

  useEffect(() => {
    checkStatus();
    refreshAux();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await api.getStatus();
      setIsRunning(status.assist_running);
    } catch (error) {
      console.log('Status check failed:', error.message);
    }
  };

  const refreshAux = async () => {
    try {
      const [wake, ppl, p, mem] = await Promise.all([
        api.getWake().catch(() => ({ enabled: false })),
        api.listPeople().catch(() => ({ people: [] })),
        api.getPersona().catch(() => null),
        api.getMemory(20).catch(() => ({ events: [] })),
      ]);
      setWakeEnabled(!!(wake && wake.enabled));
      setPeople(ppl.people || []);
      setPersona(p);
      setMemory(mem.events || []);
    } catch (e) {
      // non-fatal
    }
  };

  const handleStartStop = async () => {
    try {
      setLoading(true);
      
      if (isRunning) {
        await api.stopAssist();
        setIsRunning(false);
        Alert.alert('Success', 'Assist engine stopped');
      } else {
        const iterationsValue = continuousMode ? null : parseInt(iterations) || 10;
        const intervalValue = parseFloat(interval) || 1.0;
        
        await api.startAssist(iterationsValue, intervalValue);
        setIsRunning(true);
        Alert.alert('Success', 'Assist engine started');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!speakText.trim()) {
      Alert.alert('Error', 'Please enter text to speak');
      return;
    }

    try {
      setLoading(true);
      await api.speak(speakText);
      Alert.alert('Success', 'Text spoken successfully');
      setSpeakText('');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureAndRead = async () => {
    try {
      setLoading(true);
      
      // First capture an image
      const captureResult = await api.capture();
      
      // Then read text from the captured image
      const readResult = await api.readText(captureResult.image_path);
      
      if (readResult.text && readResult.text.trim()) {
        Alert.alert('Text Found', readResult.text, [
          { text: 'OK' },
          { 
            text: 'Speak It', 
            onPress: () => api.speak(readResult.text).catch(err => 
              Alert.alert('Error', err.message)
            )
          }
        ]);
      } else {
        Alert.alert('No Text', 'No text was detected in the image');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutonomy = async (val) => {
    try {
      setAutonomyEnabled(val);
      await api.setAutonomy(val, parseFloat(interval) || 1.0);
      if (val) {
        setIsRunning(true);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
      setAutonomyEnabled(!val);
    }
  };

  const toggleWake = async (val) => {
    try {
      setWakeEnabled(val);
      await api.setWake(val, 0.6);
    } catch (e) {
      Alert.alert('Error', e.message);
      setWakeEnabled(!val);
    }
  };

  const handleEnroll = async () => {
    const name = newPersonName.trim();
    if (!name) { Alert.alert('Error', 'Enter a name to enroll'); return; }
    try {
      setLoading(true);
      const res = await api.enrollPerson(name);
      if (res.ok) {
        Alert.alert('Enrolled', `${name} enrolled successfully`);
        setNewPersonName('');
        refreshAux();
      } else {
        Alert.alert('Failed', res.error || 'Unable to enroll');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForget = async (name) => {
    try {
      setLoading(true);
      const res = await api.forgetPerson(name);
      if (res.ok) {
        Alert.alert('Removed', `${name} removed`);
        refreshAux();
      } else {
        Alert.alert('Failed', res.error || 'Unable to forget');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecognize = async () => {
    try {
      setLoading(true);
      const res = await api.recognize();
      const names = (res.recognized || []).join(', ') || 'Nobody';
      Alert.alert('Recognition', `I see: ${names}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Assist Engine Control */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assist Engine Control</Text>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={[styles.statusValue, { color: isRunning ? '#4CAF50' : '#F44336' }]}>
              {isRunning ? '🟢 Running' : '🔴 Stopped'}
            </Text>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Continuous Mode:</Text>
            <Switch
              value={continuousMode}
              onValueChange={setContinuousMode}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={continuousMode ? 'salmon' : '#f4f3f4'}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Autonomy:</Text>
            <Switch
              value={autonomyEnabled}
              onValueChange={toggleAutonomy}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={autonomyEnabled ? 'salmon' : '#f4f3f4'}
            />
          </View>

          {!continuousMode && (
            <View style={styles.inputRow}>
              <Text style={styles.label}>Iterations:</Text>
              <TextInput
                style={styles.input}
                value={iterations}
                onChangeText={setIterations}
                placeholder="10"
                keyboardType="numeric"
              />
            </View>
          )}

          <View style={styles.inputRow}>
            <Text style={styles.label}>Interval (seconds):</Text>
            <TextInput
              style={styles.input}
              value={interval}
              onChangeText={setInterval}
              placeholder="1.0"
              keyboardType="decimal-pad"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.controlButton,
              { backgroundColor: 'salmon' },
              loading && styles.disabledButton
            ]}
            onPress={handleStartStop}
            disabled={loading}
          >
            <Text style={styles.controlButtonText}>
              {loading ? 'Processing...' : isRunning ? 'Stop Engine' : 'Start Engine'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Text-to-Speech */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Text-to-Speech</Text>
          
          <TextInput
            style={styles.textInput}
            value={speakText}
            onChangeText={setSpeakText}
            placeholder="Enter text to speak..."
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.actionButton, loading && styles.disabledButton]}
            onPress={handleSpeak}
            disabled={loading || !speakText.trim()}
          >
            <Text style={styles.actionButtonText}>🔊 Speak Text</Text>
          </TouchableOpacity>
        </View>

        {/* Wake Word */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wake Word</Text>
          <View style={styles.switchRow}>
            <Text style={styles.label}>"Lumen" Wake Listener:</Text>
            <Switch
              value={wakeEnabled}
              onValueChange={toggleWake}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={wakeEnabled ? 'salmon' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* People Management */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>People Management</Text>
          <View style={styles.inputRow}>
            <Text style={styles.label}>Name:</Text>
            <TextInput
              style={styles.input}
              value={newPersonName}
              onChangeText={setNewPersonName}
              placeholder="e.g., Alex"
            />
          </View>
          <TouchableOpacity
            style={[styles.actionButton, loading && styles.disabledButton]}
            onPress={handleEnroll}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>👤 Enroll (capture now)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, loading && styles.disabledButton, { marginTop: 10 }]}
            onPress={handleRecognize}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>🔎 Recognize</Text>
          </TouchableOpacity>

          {people.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.label, { marginBottom: 6 }]}>Known People:</Text>
              {people.map((name) => (
                <View key={name} style={styles.personRow}>
                  <Text style={{ fontSize: 16, color: '#333' }}>{name}</Text>
                  <TouchableOpacity style={styles.forgetButton} onPress={() => handleForget(name)}>
                    <Text style={{ color: 'white', fontWeight: '600' }}>Forget</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: '#666', marginTop: 8 }}>No enrolled people yet.</Text>
          )}
        </View>

        {/* Persona & Memory */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Persona & Memory</Text>
          <TouchableOpacity style={[styles.actionButton, { marginBottom: 10 }]} onPress={refreshAux}>
            <Text style={styles.actionButtonText}>↻ Refresh</Text>
          </TouchableOpacity>
          {persona ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.personaText}>Curiosity: {persona.curiosity?.toFixed?.(2) ?? persona.curiosity}</Text>
              <Text style={styles.personaText}>Patience: {persona.patience?.toFixed?.(2) ?? persona.patience}</Text>
              <Text style={[styles.personaText, { marginTop: 6 }]}>Affinity:</Text>
              {persona.affinity && Object.keys(persona.affinity).length > 0 ? (
                Object.entries(persona.affinity).map(([n, v]) => (
                  <Text key={n} style={styles.personaText}>• {n}: {Number(v).toFixed(2)}</Text>
                ))
              ) : (
                <Text style={{ color: '#666' }}>No affinities yet.</Text>
              )}
            </View>
          ) : (
            <Text style={{ color: '#666' }}>No persona data.</Text>
          )}

          <Text style={[styles.personaText, { marginTop: 4, marginBottom: 6 }]}>Recent Events:</Text>
          {memory && memory.length > 0 ? (
            memory.map((e, idx) => (
              <Text key={idx} style={styles.memoryText}>• {new Date(e.ts * 1000).toLocaleTimeString()} — {e.kind}</Text>
            ))
          ) : (
            <Text style={{ color: '#666' }}>No recent events.</Text>
          )}
        </View>

        {/* OCR Capture */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Optical Character Recognition</Text>
          
          <Text style={styles.description}>
            Capture an image and extract text from it. The text can then be read aloud.
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, loading && styles.disabledButton]}
            onPress={handleCaptureAndRead}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>📷 Capture & Read Text</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Stop */}
        <View style={[styles.card, styles.emergencyCard]}>
          <Text style={styles.cardTitle}>Emergency Controls</Text>
          
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={() => {
              if (isRunning) {
                handleStartStop();
              }
            }}
          >
            <Text style={styles.emergencyButtonText}>🛑 Emergency Stop</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyCard: {
    borderColor: '#F44336',
    borderWidth: 2,
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    flex: 1,
    marginLeft: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  controlButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: 'salmon',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // keep emergencyButton red for safety
  emergencyButton: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  personRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgetButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  personaText: {
    fontSize: 14,
    color: '#333',
  },
  memoryText: {
    fontSize: 13,
    color: '#555',
  },
});