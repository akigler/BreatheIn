import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import { useSessionStore } from '../../store/sessionStore';
import { SessionControls } from '../../components/SessionControls';
import { BreatheSettingsButton } from '../../components/BreatheSettingsButton';
import { SoundBowlButton } from '../../components/SoundBowlButton';

export default function HomeScreen() {
  const router = useRouter();
  const { isActive, startSession, stopSession, loadLastSelectedDuration } = useSessionStore();
  const insets = useSafeAreaInsets();
  
  // Calculate bottom offset to position controls above tab bar
  const tabBarHeight = Platform.OS === 'ios' ? 49 : 56;
  const bottomOffset = tabBarHeight + insets.bottom;

  useEffect(() => {
    loadLastSelectedDuration();
  }, []);

  useEffect(() => {
    const requestContactsPermission = async () => {
      try {
        const hasAsked = await AsyncStorage.getItem('contacts_permission_asked');
        if (hasAsked) return;

        const { status } = await Contacts.getPermissionsAsync();
        
        if (status !== 'granted') {
          await Contacts.requestPermissionsAsync();
        }
        
        await AsyncStorage.setItem('contacts_permission_asked', 'true');
      } catch (error) {
        console.error('Error requesting contacts permission:', error);
      }
    };

    requestContactsPermission();
  }, []);

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
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}>
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

        {/* Sound Bowl Button - Centered */}
        <View style={styles.soundBowlContainer}>
          <SoundBowlButton />
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
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
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
  soundBowlContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 40,
  },
});
