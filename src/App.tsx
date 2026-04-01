import React, { useState, useEffect, useCallback } from 'react';
import { I18nManager, Text, TextInput, View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold } from '@expo-google-fonts/cairo';
import { MMKV } from 'react-native-mmkv';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from './stores/auth-store';
import { useStationAuthStore } from './stores/station-auth-store';
import { StatusBar } from 'expo-status-bar';
import { colors } from './lib/theme';
import Toast from 'react-native-toast-message';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import CitizenDashboard from './screens/CitizenDashboard';
import StationDashboard from './screens/StationDashboard';

// Initialize i18n (side effect import — runs before component mount)
import './lib/i18n';

// ─── Read saved locale & set RTL BEFORE any component renders ───
const mmkvGlobal = new MMKV();
const savedLocale = mmkvGlobal.getString('app-locale') || 'ar';
const shouldBeRtl = savedLocale === 'ar';

if (shouldBeRtl && !I18nManager.isRTL) {
  I18nManager.forceRTL(true);
} else if (!shouldBeRtl && I18nManager.isRTL) {
  I18nManager.forceRTL(false);
}

// ─── Prevent splash from auto-hiding ───
SplashScreen.preventAutoHideAsync().catch(() => { /* ignore */ });

// ─── Types ───
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  CitizenDashboard: undefined;
  StationDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── App Component ───
export default function App() {
  const [appReady, setAppReady] = useState(false);

  const citizenAuth = useAuthStore((s) => s.isAuthenticated);
  const stationAuth = useStationAuthStore((s) => s.isAuthenticated);

  // Load Cairo font
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  // Prepare app (fetch locale, wait minimum splash time)
  useEffect(() => {
    async function prepare() {
      try {
        // Minimum splash display for smooth UX
        await new Promise((resolve) => setTimeout(resolve, 800));
      } catch (e) {
        console.warn('App prepare error:', e);
      }
      setAppReady(true);
    }
    prepare();
  }, []);

  // Apply Cairo as default font globally (after fonts loaded)
  useEffect(() => {
    if (fontsLoaded) {
      // Set Cairo as global default font for Text and TextInput
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Text as any).defaultProps = { ...(Text as any).defaultProps, allowFontScaling: false };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (TextInput as any).defaultProps = { ...(TextInput as any).defaultProps, allowFontScaling: false };
    }
  }, [fontsLoaded]);

  // Hide splash when everything is ready
  const hideSplash = useCallback(async () => {
    if (appReady && fontsLoaded) {
      SplashScreen.setOptions({ fade: true });
      await SplashScreen.hideAsync();
    }
  }, [appReady, fontsLoaded]);

  useEffect(() => {
    hideSplash().catch(() => { /* ignore */ });
  }, [hideSplash]);

  // Show loading screen while preparing
  if (!appReady || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <View style={styles.logoBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={colors.primary} />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: shouldBeRtl ? 'slide_from_left' : 'slide_from_right',
            contentStyle: { backgroundColor: '#fffbeb' },
          }}
        >
          {!citizenAuth && !stationAuth && (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
          {stationAuth && (
            <Stack.Screen name="StationDashboard" component={StationDashboard} />
          )}
          {citizenAuth && (
            <Stack.Screen name="CitizenDashboard" component={CitizenDashboard} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryLight,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
});
