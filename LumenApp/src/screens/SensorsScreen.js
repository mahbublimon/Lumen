import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

export default function SensorsScreen() {
  const [environmentData, setEnvironmentData] = useState(null);
  const [gpsData, setGpsData] = useState(null);
  const [gestureData, setGestureData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchAllData, 2000); // Refresh every 2 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [envData, gpsResult, gestureResult] = await Promise.allSettled([
        api.getEnvironment(),
        api.getGPS(),
        api.getGesture(),
      ]);

      if (envData.status === 'fulfilled') {
        setEnvironmentData(envData.value);
      }
      if (gpsResult.status === 'fulfilled') {
        setGpsData(gpsResult.value);
      }
      if (gestureResult.status === 'fulfilled') {
        setGestureData(gestureResult.value);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const formatTemperature = (temp) => {
    if (temp === null || temp === undefined) return 'N/A';
    return `${temp.toFixed(1)}°C`;
  };

  const formatHumidity = (humidity) => {
    if (humidity === null || humidity === undefined) return 'N/A';
    return `${humidity.toFixed(1)}%`;
  };

  const formatDistance = (distance) => {
    if (distance === null || distance === undefined) return 'N/A';
    return `${distance.toFixed(2)} cm`;
  };

  const getAirQualityStatus = (mq2, mq9) => {
    if (mq2 === null || mq9 === null) return { status: 'Unknown', color: '#666' };
    
    const avgReading = (mq2 + mq9) / 2;
    if (avgReading < 300) return { status: 'Good', color: '#4CAF50' };
    if (avgReading < 600) return { status: 'Moderate', color: '#FF9800' };
    return { status: 'Poor', color: '#F44336' };
  };

  const getGPSStatus = (gps) => {
    if (!gps || (!gps.latitude && !gps.longitude)) {
      return { status: 'No Fix', color: '#F44336' };
    }
    return { status: 'Fixed', color: '#4CAF50' };
  };

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        
        {/* Auto Refresh Control */}
        <View style={styles.controlCard}>
          <TouchableOpacity
            style={[
              styles.refreshButton,
              { backgroundColor: 'salmon' }
            ]}
            onPress={() => setAutoRefresh(!autoRefresh)}
          >
            <Text style={styles.refreshButtonText}>
              {autoRefresh ? '⏸️ Stop Auto Refresh' : '▶️ Start Auto Refresh'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Environmental Sensors */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Environmental Sensors</Text>
          
          {loading && !environmentData ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : environmentData ? (
            <View>
              <View style={styles.sensorRow}>
                <Text style={styles.sensorLabel}>🌡️ Temperature:</Text>
                <Text style={styles.sensorValue}>
                  {formatTemperature(environmentData.temperature)}
                </Text>
              </View>
              
              <View style={styles.sensorRow}>
                <Text style={styles.sensorLabel}>💧 Humidity:</Text>
                <Text style={styles.sensorValue}>
                  {formatHumidity(environmentData.humidity)}
                </Text>
              </View>
              
              <View style={styles.sensorRow}>
                <Text style={styles.sensorLabel}>🌡️ Surface Temp:</Text>
                <Text style={styles.sensorValue}>
                  {formatTemperature(environmentData.surface_temperature)}
                </Text>
              </View>
              
              <View style={styles.sensorRow}>
                <Text style={styles.sensorLabel}>📏 Distance:</Text>
                <Text style={styles.sensorValue}>
                  {formatDistance(environmentData.distance)}
                </Text>
              </View>
              
              <View style={styles.sensorRow}>
                <Text style={styles.sensorLabel}>💨 Air Quality:</Text>
                <Text style={[
                  styles.sensorValue,
                  { color: getAirQualityStatus(environmentData.mq2, environmentData.mq9).color }
                ]}>
                  {getAirQualityStatus(environmentData.mq2, environmentData.mq9).status}
                </Text>
              </View>
              
              <View style={styles.rawDataContainer}>
                <Text style={styles.rawDataTitle}>Raw Sensor Values:</Text>
                <Text style={styles.rawDataText}>MQ2: {environmentData.mq2 || 'N/A'}</Text>
                <Text style={styles.rawDataText}>MQ9: {environmentData.mq9 || 'N/A'}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.errorText}>Unable to fetch environmental data</Text>
          )}
        </View>

        {/* GPS Data */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>GPS Location</Text>
          
          {loading && !gpsData ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : gpsData ? (
            <View>
              <View style={styles.sensorRow}>
                <Text style={styles.sensorLabel}>📍 Status:</Text>
                <Text style={[
                  styles.sensorValue,
                  { color: getGPSStatus(gpsData).color }
                ]}>
                  {getGPSStatus(gpsData).status}
                </Text>
              </View>
              
              {gpsData.latitude && gpsData.longitude && (
                <>
                  <View style={styles.sensorRow}>
                    <Text style={styles.sensorLabel}>🌐 Latitude:</Text>
                    <Text style={styles.sensorValue}>
                      {gpsData.latitude.toFixed(6)}°
                    </Text>
                  </View>
                  
                  <View style={styles.sensorRow}>
                    <Text style={styles.sensorLabel}>🌐 Longitude:</Text>
                    <Text style={styles.sensorValue}>
                      {gpsData.longitude.toFixed(6)}°
                    </Text>
                  </View>
                  
                  {gpsData.altitude && (
                    <View style={styles.sensorRow}>
                      <Text style={styles.sensorLabel}>⛰️ Altitude:</Text>
                      <Text style={styles.sensorValue}>
                        {gpsData.altitude.toFixed(1)} m
                      </Text>
                    </View>
                  )}
                  
                  {gpsData.speed && (
                    <View style={styles.sensorRow}>
                      <Text style={styles.sensorLabel}>🚶 Speed:</Text>
                      <Text style={styles.sensorValue}>
                        {gpsData.speed.toFixed(1)} km/h
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          ) : (
            <Text style={styles.errorText}>Unable to fetch GPS data</Text>
          )}
        </View>

        {/* Gesture Recognition */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gesture Recognition</Text>
          
          {loading && !gestureData ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : gestureData ? (
            <View>
              <View style={styles.sensorRow}>
                <Text style={styles.sensorLabel}>✋ Last Gesture:</Text>
                <Text style={styles.sensorValue}>
                  {gestureData.gesture || 'None detected'}
                </Text>
              </View>
              
              <View style={styles.sensorRow}>
                <Text style={styles.sensorLabel}>🎯 Confidence:</Text>
                <Text style={styles.sensorValue}>
                  {gestureData.confidence ? `${(gestureData.confidence * 100).toFixed(1)}%` : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.sensorRow}>
                <Text style={styles.sensorLabel}>⏰ Timestamp:</Text>
                <Text style={styles.sensorValue}>
                  {gestureData.timestamp || 'N/A'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.errorText}>Unable to fetch gesture data</Text>
          )}
        </View>

        {/* System Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>System Information</Text>
          <Text style={styles.infoText}>
            Pull down to refresh sensor data manually, or use auto-refresh for continuous monitoring.
          </Text>
          <Text style={styles.infoText}>
            All sensor readings are updated in real-time when the assist engine is running.
          </Text>
          <Text style={styles.infoText}>
            In simulation mode, sensor values are randomly generated for testing purposes.
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
  controlCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  sensorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sensorLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  sensorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: 'salmon',
    textAlign: 'right',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
  rawDataContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
  },
  rawDataTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  rawDataText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  refreshButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 8,
  },
});