import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text, View, Image } from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import ControlScreen from './src/screens/ControlScreen';
import SensorsScreen from './src/screens/SensorsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null; // Could render a fallback screen
  }

  // Set default font for all Text components
  Text.defaultProps = Text.defaultProps || {};
  Text.defaultProps.style = { fontFamily: 'Poppins_400Regular' };

  const headerTitle = (title) => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Image source={require('./assets/icon.png')} style={{ width: 24, height: 24, marginRight: 8 }} />
      <Text style={{ fontFamily: 'Poppins_700Bold', color: '#fff', fontSize: 20 }}>
        {title}
      </Text>
    </View>
  );

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: 'salmon',
            tabBarInactiveTintColor: 'gray',
            headerStyle: {
              backgroundColor: 'salmon',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontFamily: 'Poppins_700Bold',
            },
            headerShadowVisible: false,
            tabBarStyle: { backgroundColor: 'salmon', borderTopWidth: 0, elevation: 0 },
          }}
        >
          <Tab.Screen 
            name="Home" 
            component={HomeScreen}
            options={{
              tabBarLabel: 'Home',
              headerTitle: () => headerTitle('Lumen Control'),
              tabBarIcon: ({ color, size }) => (
                <Image source={require('./assets/icon.png')} style={{ width: size, height: size, tintColor: color }} />
              ),
            }}
          />
          <Tab.Screen 
            name="Control" 
            component={ControlScreen}
            options={{
              tabBarLabel: 'Control',
              headerTitle: () => headerTitle('Assist Engine'),
              tabBarIcon: ({ color, size }) => (
                <Image source={require('./assets/icon.png')} style={{ width: size, height: size, tintColor: color }} />
              ),
            }}
          />
          <Tab.Screen 
            name="Sensors" 
            component={SensorsScreen}
            options={{
              tabBarLabel: 'Sensors',
              headerTitle: () => headerTitle('Sensor Data'),
              tabBarIcon: ({ color, size }) => (
                <Image source={require('./assets/icon.png')} style={{ width: size, height: size, tintColor: color }} />
              ),
            }}
          />
          <Tab.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{
              tabBarLabel: 'Settings',
              headerTitle: () => headerTitle('Settings'),
              tabBarIcon: ({ color, size }) => (
                <Image source={require('./assets/icon.png')} style={{ width: size, height: size, tintColor: color }} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="light" backgroundColor="salmon" />
    </SafeAreaProvider>
  );
}
