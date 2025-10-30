import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function SettingsScreen() {
  // ... existing code ...
  const [serverURL, setServerURL] = useState('http://127.0.0.1:8000');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState('2');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedURL = await AsyncStorage.getItem('serverURL');
      const savedNotifications = await AsyncStorage.getItem('notifications');
      const savedAutoRefresh = await AsyncStorage.getItem('autoRefresh');
      const savedInterval = await AsyncStorage.getItem('refreshInterval');

      if (savedURL) setServerURL(savedURL);
      
      // Safe boolean parsing
      if (savedNotifications !== null) {
        try {
          const parsed = JSON.parse(savedNotifications);
          setNotifications(typeof parsed === 'boolean' ? parsed : true);
        } catch {
          // Handle legacy string values
          setNotifications(savedNotifications === 'true');
        }
      }
      
      if (savedAutoRefresh !== null) {
        try {
          const parsed = JSON.parse(savedAutoRefresh);
          setAutoRefresh(typeof parsed === 'boolean' ? parsed : true);
        } catch {
          // Handle legacy string values
          setAutoRefresh(savedAutoRefresh === 'true');
        }
      }
      
      if (savedInterval) setRefreshInterval(savedInterval);

      // Try to fetch language from server
      try {
        api.setBaseURL(savedURL || serverURL);
        const lang = await api.getLanguage();
        if (lang?.language) setLanguage(lang.language);
      } catch (e) {
        // Ignore network errors here; user can test connection
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('serverURL', serverURL);
      await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
      await AsyncStorage.setItem('autoRefresh', JSON.stringify(autoRefresh));
      await AsyncStorage.setItem('refreshInterval', refreshInterval);
      
      // Update API base URL
      api.setBaseURL(serverURL);
      
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    
    try {
      // Temporarily update API URL for testing
      const originalURL = api.baseURL;
      api.setBaseURL(serverURL);
      
      const status = await api.getStatus();
      setConnectionStatus('success');
      Alert.alert('Success', 'Connection to Lumen server successful!');
      
    } catch (error) {
      setConnectionStatus('error');
      Alert.alert('Connection Failed', error.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setServerURL('http://127.0.0.1:8000');
            setNotifications(true);
            setAutoRefresh(true);
            setRefreshInterval('2');
            setConnectionStatus(null);
            setLanguage('en');
          }
        }
      ]
    );
  };

  const openDocumentation = () => {
    Linking.openURL('https://github.com/yourusername/lumen');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left','right']}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Server Configuration */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Server Configuration</Text>
          
          <Text style={styles.label}>Lumen Server URL:</Text>
          <TextInput
            style={styles.input}
            value={serverURL}
            onChangeText={setServerURL}
            placeholder="http://127.0.0.1:8000"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TouchableOpacity
            style={[
              styles.testButton,
              testingConnection && styles.disabledButton,
              connectionStatus === 'success' && styles.successButton,
              connectionStatus === 'error' && styles.errorButton,
            ]}
            onPress={testConnection}
            disabled={testingConnection}
          >
            <Text style={styles.testButtonText}>
              {testingConnection ? 'Testing...' : 
               connectionStatus === 'success' ? '✅ Connection OK' :
               connectionStatus === 'error' ? '❌ Connection Failed' :
               '🔗 Test Connection'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.helpText}>
            Enter the IP address and port of your Lumen server. 
            Make sure your phone and server are on the same network.
          </Text>
        </View>

        {/* App Preferences */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Preferences</Text>

          {/* Language selector */}
          <Text style={styles.label}>App Language</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pill, language === 'en' && styles.pillActive]}
              onPress={async () => {
                try {
                  await api.setLanguage({ language: 'en' });
                  setLanguage('en');
                  Alert.alert('Language', 'English selected');
                } catch (error) {
                  Alert.alert('Error', error.message);
                }
              }}
            >
              <Text style={[styles.pillText, language === 'en' && styles.pillTextActive]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, language === 'bn' && styles.pillActive]}
              onPress={async () => {
                try {
                  await api.setLanguage({ language: 'bn' });
                  setLanguage('bn');
                  Alert.alert('Language', 'বাংলা নির্বাচন করা হয়েছে');
                } catch (error) {
                  Alert.alert('Error', error.message);
                }
              }}
            >
              <Text style={[styles.pillText, language === 'bn' && styles.pillTextActive]}>বাংলা</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Push Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#767577', true: '#ffb3a3' }}
              thumbColor={notifications ? 'salmon' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Auto-refresh Sensors</Text>
            <Switch
              value={autoRefresh}
              onValueChange={setAutoRefresh}
              trackColor={{ false: '#767577', true: '#ffb3a3' }}
              thumbColor={autoRefresh ? 'salmon' : '#f4f3f4'}
            />
          </View>
          
          {autoRefresh && (
            <View style={styles.inputRow}>
              <Text style={styles.label}>Refresh Interval (seconds):</Text>
              <TextInput
                style={styles.smallInput}
                value={refreshInterval}
                onChangeText={setRefreshInterval}
                placeholder="2"
                keyboardType="numeric"
              />
            </View>
          )}
        </View>

        {/* Network Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Network Setup Help</Text>
          
          <Text style={styles.helpText}>
            <Text style={styles.boldText}>Finding your server IP:</Text>
            {'\n'}1. On Windows: Open Command Prompt and run "ipconfig"
            {'\n'}2. On Linux/Mac: Run "ifconfig" or "ip addr"
            {'\n'}3. Look for your local network IP (usually 192.168.x.x or 10.x.x.x)
          </Text>
          
          <Text style={styles.helpText}>
            <Text style={styles.boldText}>Common issues:</Text>
            {'\n'}• Make sure the Lumen server is running
            {'\n'}• Check that your phone and PC are on the same WiFi network
            {'\n'}• Verify the port number (default: 8000)
            {'\n'}• Try disabling firewall temporarily for testing
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={saveSettings}>
            <Text style={styles.actionButtonText}>Save Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={resetToDefaults}>
            <Text style={styles.actionButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={openDocumentation}>
            <Text style={styles.actionButtonText}>Documentation</Text>
          </TouchableOpacity>
        </View>

        {/* App Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version:</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Build:</Text>
            <Text style={styles.infoValue}>React Native</Text>
          </View>
          
          <Text style={styles.helpText}>
            Lumen Mobile App - Assistive technology control interface for visually impaired users.
            This app provides remote control capabilities for the Lumen blind stick system.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  smallInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    width: 80,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  testButton: {
    backgroundColor: 'salmon',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  errorButton: {
    backgroundColor: '#F44336',
  },
  disabledButton: {
    opacity: 0.6,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: 'salmon',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    color: '#333',
  },
  infoValue: {
    fontSize: 16,
    color: 'salmon',
    fontWeight: '600',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  pillActive: {
    backgroundColor: 'salmon',
    borderColor: 'salmon',
  },
  pillText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#fff',
  },
});