import React, { useEffect, useState } from 'react'
import { View, Text, Alert, StyleSheet } from 'react-native'
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session'
import { supabase } from '@pitara/supabase'
import { Button } from '@pitara/ui'
import { router } from 'expo-router'

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://www.googleapis.com/oauth2/v4/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
}

export default function GoogleSignIn() {
  const [loading, setLoading] = useState(false)

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: makeRedirectUri({
        scheme: 'com.pitara.mobile',
        path: 'auth/callback',
      }),
    },
    discovery
  )

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleSignIn(response.params.id_token)
    }
  }, [response])

  const handleGoogleSignIn = async (idToken: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      })

      if (error) {
        Alert.alert('Sign In Error', error.message)
      } else if (data.user) {
        router.replace('/(tabs)/home')
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Pitara</Text>
        <Text style={styles.subtitle}>
          Sign in with Google to continue
        </Text>
        
        <Button
          title={loading ? 'Signing in...' : 'Sign in with Google'}
          onPress={() => promptAsync()}
          disabled={!request || loading}
          style={styles.button}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 48,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    maxWidth: 300,
  },
}) 