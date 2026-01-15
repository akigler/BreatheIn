import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import { useSessionStore } from '../../store/sessionStore';
import { SessionControls } from '../../components/SessionControls';
import { BreatheSettingsButton } from '../../components/BreatheSettingsButton';

export default function HomeScreen() {
  const router = useRouter();
  const { isActive, startSession, stopSession, loadLastSelectedDuration } = useSessionStore();
  const insets = useSafeAreaInsets();
  
  // Tab bar height is typically 49px on iOS, 56px on Android, plus safe area
  const tabBarHeight = Platform.OS === 'ios' ? 49 : 56;
  const bottomOffset = tabBarHeight + insets.bottom; // Positioned directly above tab bar

  // Load last selected duration on mount
  useEffect(() => {
    loadLastSelectedDuration();
  }, []);

  // Request contacts permission on first visit to home page
  useEffect(() => {
    const requestContactsPermission = async () => {
      try {
        // Check if we've already asked for permission
        const hasAsked = await AsyncStorage.getItem('contacts_permission_asked');
        if (hasAsked) {
          return; // Already asked, don't ask again
        }

        // Check current permission status
        const { status } = await Contacts.getPermissionsAsync();
        
        // If not granted, request it
        if (status !== 'granted') {
          const { status: newStatus } = await Contacts.requestPermissionsAsync();
          
          // Mark that we've asked (regardless of whether they granted it)
          await AsyncStorage.setItem('contacts_permission_asked', 'true');
          
          if (newStatus !== 'granted') {
            // They denied, but that's okay - we'll ask again in friends tab
            console.log('Contacts permission denied on home screen');
          }
        } else {
          // Already granted, mark as asked
          await AsyncStorage.setItem('contacts_permission_asked', 'true');
        }
      } catch (error) {
        console.error('Error requesting contacts permission:', error);
      }
    };

    requestContactsPermission();
  }, []);

  // Dev helper: Reset onboarding (long press on title)
  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset Onboarding',
      'This will reset the onboarding screen. Restart the app to see it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            await AsyncStorage.removeItem('onboarding_completed');
            Alert.alert('Success', 'Onboarding reset! Please restart the app.');
          },
        },
      ]
    );
  };

  const handleStartSession = (duration: number) => {
    startSession(duration);
    router.push(`/session/${duration}`);
  };

  const handleStopSession = () => {
    stopSession();
    // If we're already on the home screen, no need to navigate
    // This is just a safety check - the session screen should handle its own navigation
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onLongPress={handleResetOnboarding} activeOpacity={1}>
            <Text style={styles.title}>Breathe In</Text>
          </TouchableOpacity>
          <Text style={styles.subtitle}>Breathe. Focus. Connect.</Text>
        </View>

        <View style={styles.topButtonsContainer}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/friends')}
          >
            <Text style={styles.quickActionText}>Breathe with Friends</Text>
          </TouchableOpacity>
          
          <View style={styles.quickActions}>
            <BreatheSettingsButton />
          </View>
        </View>
      </ScrollView>
      
      <View style={[styles.bottomButtonsContainer, { bottom: bottomOffset }]}>
        <SessionControls
          onStartSession={handleStartSession}
          onStopSession={handleStopSession}
          isActive={isActive}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '300',
  },
  topButtonsContainer: {
    marginBottom: 24,
    gap: 16,
  },
  bottomButtonsContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  quickActions: {
    marginTop: 0,
    gap: 12,
  },
  quickActionButton: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 184, 0.2)',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
