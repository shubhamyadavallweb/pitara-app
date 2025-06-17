import React, { useEffect } from 'react'
import { Stack } from 'expo-router'
import { AuthProvider } from '@pitara/hooks'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useNotifications } from '@pitara/hooks'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // Add your custom fonts here
  })

  const { requestPermissions, isRegistered } = useNotifications()

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync()
    }
    // Initialize notifications on app start
    requestPermissions()
  }, [loaded, error])

  if (!loaded && !error) {
    return null
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#000" />
      <AuthProvider>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="series/[id]" options={{ 
            title: 'Series Details',
            presentation: 'modal'
          }} />
          <Stack.Screen name="subscription" options={{ 
            title: 'Subscribe to Pitara',
            presentation: 'modal'
          }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  )
} 