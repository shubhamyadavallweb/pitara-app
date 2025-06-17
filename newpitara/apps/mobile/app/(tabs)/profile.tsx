import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useSubscription, useDownloads } from '@pitara/hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Profile() {
  const { user, signOut } = useAuth();
  const { subscription, isSubscribed, subscriptionTier } = useSubscription();
  const { downloads, clearAllDownloads } = useDownloads();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [userName, setUserName] = useState(user?.user_metadata?.full_name || 'User');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [downloadQuality, setDownloadQuality] = useState('1080p');
  const [isDarkMode, setIsDarkMode] = useState(true);

  const handleSaveProfile = async () => {
    try {
      await AsyncStorage.setItem('@pitara_user_name', userName);
      await AsyncStorage.setItem('@pitara_download_quality', downloadQuality);
      setIsEditingProfile(false);
      Alert.alert('Profile Updated', 'Your profile settings have been saved successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      Alert.alert('Signed Out', 'You have been successfully signed out.');
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    Alert.alert('Theme Changed', `Switched to ${!isDarkMode ? 'dark' : 'light'} mode.`);
  };

  const cycleDownloadQuality = () => {
    const qualities = ['360p', '480p', '720p', '1080p', '4K'];
    const currentIndex = qualities.indexOf(downloadQuality);
    const nextIndex = (currentIndex + 1) % qualities.length;
    const newQuality = qualities[nextIndex];
    setDownloadQuality(newQuality);
    AsyncStorage.setItem('@pitara_download_quality', newQuality);
    Alert.alert('Download Quality Updated', `Download quality set to ${newQuality}.`);
  };

  const navigateToSubscription = () => {
    Alert.alert('Navigation', 'Navigate to subscription screen');
  };

  const navigateToSubscriptionHistory = () => {
    Alert.alert('Navigation', 'Navigate to subscription history');
  };

  const settingsOptions = [
    {
      id: 'account',
      title: 'Account Settings',
      description: 'Manage your account details',
      icon: 'person-outline' as const,
      action: () => setIsEditingProfile(true)
    },
    {
      id: 'subscription',
      title: 'Subscription',
      description: isSubscribed ? `${subscriptionTier} Plan` : 'No active subscription',
      icon: 'card-outline' as const,
      action: navigateToSubscription
    },
    {
      id: 'history',
      title: 'Purchase History',
      description: 'View your past transactions',
      icon: 'time-outline' as const,
      action: navigateToSubscriptionHistory
    },
    {
      id: 'theme',
      title: 'App Theme',
      description: isDarkMode ? 'Dark mode (Current)' : 'Light mode (Current)',
      icon: isDarkMode ? 'moon-outline' : 'sunny-outline' as const,
      action: toggleTheme
    },
    {
      id: 'downloads',
      title: 'Download Quality',
      description: `${downloadQuality} (Current)`,
      icon: 'download-outline' as const,
      action: cycleDownloadQuality
    },
    {
      id: 'clearDownloads',
      title: 'Clear Downloads',
      description: `${downloads.length} downloaded episodes`,
      icon: 'trash-outline' as const,
      action: () => {
        Alert.alert(
          'Clear Downloads',
          'Are you sure you want to delete all downloaded episodes?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: clearAllDownloads }
          ]
        );
      }
    },
    {
      id: 'logout',
      title: 'Sign Out',
      description: 'Sign out of your account',
      icon: 'log-out-outline' as const,
      action: handleLogout,
      danger: true
    }
  ];

  if (isEditingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setIsEditingProfile(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.profileImageSection}>
            <View style={styles.profileImageContainer}>
              <Image
                source={{ 
                  uri: user?.user_metadata?.avatar_url || 
                       'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
                }}
                style={styles.profileImage}
              />
              <TouchableOpacity style={styles.cameraButton}>
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                value={userName}
                onChangeText={setUserName}
                style={styles.textInput}
                placeholder="Enter your name"
                placeholderTextColor="#6B7280"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                value={userEmail}
                onChangeText={setUserEmail}
                style={styles.textInput}
                placeholder="Enter your email"
                placeholderTextColor="#6B7280"
                keyboardType="email-address"
                editable={false}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={{ 
              uri: user?.user_metadata?.avatar_url || 
                   'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
            }}
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>{userName}</Text>
          <Text style={styles.profileEmail}>{userEmail}</Text>
          
          {isSubscribed && (
            <View style={styles.subscriptionBadge}>
              <Ionicons name="crown" size={16} color="#FFD700" />
              <Text style={styles.subscriptionText}>{subscriptionTier} Member</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{downloads.length}</Text>
            <Text style={styles.statLabel}>Downloads</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Watchlist</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Hours Watched</Text>
          </View>
        </View>

        {/* Settings Options */}
        <View style={styles.settingsSection}>
          {settingsOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.settingItem, option.danger && styles.dangerItem]}
              onPress={option.action}
            >
              <View style={styles.settingIcon}>
                <Ionicons 
                  name={option.icon} 
                  size={24} 
                  color={option.danger ? "#EF4444" : "#3B82F6"} 
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, option.danger && styles.dangerText]}>
                  {option.title}
                </Text>
                <Text style={styles.settingDescription}>
                  {option.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#3B82F6',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  profileEmail: {
    color: '#6B7280',
    fontSize: 16,
    marginBottom: 12,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  subscriptionText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 14,
  },
  settingsSection: {
    paddingHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dangerItem: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dangerText: {
    color: '#EF4444',
  },
  settingDescription: {
    color: '#6B7280',
    fontSize: 14,
  },
  formSection: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 