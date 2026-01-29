import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { SoundBowlHaptics } from '../utils/haptics';

// Load sound bowl audio at module level for better bundling
const soundBowlAudio = require('../assets/sounds/singing-bowl.mp3');

export function SoundBowlButton() {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const hapticsRef = useRef<SoundBowlHaptics | null>(null);

  useEffect(() => {
    // Initialize haptics (commented out for now)
    // hapticsRef.current = new SoundBowlHaptics();

    return () => {
      // Cleanup
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      // if (hapticsRef.current) {
      //   hapticsRef.current.stop();
      // }
    };
  }, []);

  const handlePress = async () => {
    if (isPlaying) {
      // Stop sound bowl
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      // if (hapticsRef.current) {
      //   hapticsRef.current.stop();
      // }
      setIsPlaying(false);
    } else {
      // Start sound bowl
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          allowsRecordingIOS: false,
        });

        // Load and play sound bowl audio
        // Using local sound file (loaded at module level)
        const { sound } = await Audio.Sound.createAsync(
          soundBowlAudio,
          { 
            shouldPlay: true,
            isLooping: true,
            volume: 0.6,
          }
        );
        
        soundRef.current = sound;

        // Verify sound is actually playing after a brief delay
        setTimeout(async () => {
          const playbackStatus = await sound.getStatusAsync();
          if (playbackStatus.isLoaded && !playbackStatus.isPlaying) {
            await sound.playAsync();
          }
        }, 100);

        // Start haptic feedback synchronized with audio (commented out for now)
        // if (hapticsRef.current) {
        //   await hapticsRef.current.startContinuous();
        // }

        setIsPlaying(true);
      } catch (error) {
        // Error playing sound bowl - fail silently for now
        // If audio fails, still start haptics (commented out for now)
        // if (hapticsRef.current) {
        //   await hapticsRef.current.startContinuous();
        //   setIsPlaying(true);
        // }
        // Just set playing state even if audio fails
        setIsPlaying(true);
      }
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, isPlaying && styles.buttonActive]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.circle}>
        <Text style={styles.buttonText}>Sound Bowl</Text>
        {isPlaying && <View style={styles.pulseRing} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00FFB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonActive: {
    backgroundColor: 'rgba(0, 255, 184, 0.2)',
    borderColor: 'rgba(0, 255, 184, 0.6)',
    shadowColor: '#00FFB8',
    shadowOpacity: 0.5,
  },
  circle: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 1,
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 184, 0.4)',
    zIndex: 0,
  },
});
