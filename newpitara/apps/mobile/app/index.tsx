import React, { useEffect } from 'react'
import { Redirect } from 'expo-router'
import { useSession } from '@pitara/hooks'
import { View, ActivityIndicator } from 'react-native'

export default function Index() {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    )
  }

  // Redirect to tabs if authenticated, otherwise to auth
  return <Redirect href={session ? "/(tabs)/home" : "/(auth)/google"} />
} 