import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

export default function HomeScreen() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const statusData = await api.getStatus();
      setStatus(statusData);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  const handleSpeak = async () => {
    try {
      await api.speak('Hello from Lumen mobile app!');
      Alert.alert('Success', 'Text spoken successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCapture = async () => {
    try {
      const result = await api.capture();
      Alert.alert('Capture Result', `Image saved: ${result.image_path}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Lumen Control Center</Text>
          <Text style={styles.subtitle}>
            Assistive Technology for the Visually Impaired
          </Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>System Status</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : status ? (
            <View>
              <Text style={styles.statusText}>
                Engine: {status.assist_running ? '🟢 Running' : '🔴 Stopped'}
              </Text>
              <Text style={styles.statusText}>
                Simulation Mode: {status.simulation ? '🟡 On' : '🟢 Off'}
              </Text>
              <Text style={styles.statusText}>
                Server: 🟢 Connected
              </Text>
            </View>
          ) : (
            <Text style={styles.errorText}>Unable to fetch status</Text>
          )}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleSpeak}>
            <Text style={styles.actionButtonText}>🔊 Test Speech</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleCapture}>
            <Text style={styles.actionButtonText}>📷 Capture Image</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => Alert.alert('Info', 'Use the Control tab to start/stop the assist engine')}
          >
            <Text style={styles.actionButtonText}>🎯 Assist Engine</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>About Lumen</Text>
          <Text style={styles.infoText}>
            Lumen is an assistive technology system designed to help visually impaired users navigate their environment safely. 
            It combines multiple sensors, voice recognition, and haptic feedback to provide real-time assistance.
          </Text>
          <Text style={styles.infoText}>
            Features include obstacle detection, environmental monitoring, GPS navigation, 
            text reading via OCR, and voice-controlled operation.
          </Text>
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
  header: {
    backgroundColor: 'salmon',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
  },
  statusCard: {
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
  quickActions: {
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
  infoCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
  },
  actionButton: {
    backgroundColor: 'salmon',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 10,
  },
});