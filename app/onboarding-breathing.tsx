import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingBreathingCircle } from '../components/OnboardingBreathingCircle';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NATURE_IMAGES, getSoundForImage } from '../utils/constants';

const BREATHING_TIMER_DURATION = 10; // seconds
const BREATH_DURATION = 5000; // 5 seconds for inhale/exhale - matches OnboardingBreathingCircle

export default function OnboardingBreathingScreen() {
  const router = useRouter();
  const [breathText, setBreathText] = useState<'in' | 'out'>('in');
  const [showContinue, setShowContinue] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const soundRef = useRef<Audio.Sound | null>(null);
  const breathIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Select random background image
  useEffect(() => {
    const randomImageObj = NATURE_IMAGES[Math.floor(Math.random() * NATURE_IMAGES.length)];
    setBackgroundImage(randomImageObj.url);
    console.log('Onboarding screen mounted, background image:', randomImageObj.url, 'Type:', randomImageObj.type);
  }, []);

  // Load and play background sound
  useEffect(() => {
    const loadSound = async () => {
      try {
        // Set audio mode for background playback
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        // Get the sound source that matches the selected background image
        const soundSource = getSoundForImage(backgroundImage);
        
        // Background sound matching the image
        // Handle both local files (number from require()) and URLs (string)
        const soundAsset = typeof soundSource === 'string' 
          ? { uri: soundSource }
          : soundSource;
        
        const { sound } = await Audio.Sound.createAsync(
          soundAsset,
          { 
            shouldPlay: true,
            isLooping: true,
            volume: 0.275, // Light background sound (10% louder)
          }
        );
        soundRef.current = sound;
      } catch (error) {
        console.log('Error loading sound:', error);
        // Audio will be skipped if there's an error
        // You can add a local audio file to assets/sounds/ and use require() instead
      }
    };

    // Only load sound if we have a background image
    if (backgroundImage) {
      loadSound();
    }

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [backgroundImage]);

  // Handle mute toggle
  const toggleMute = async () => {
    if (soundRef.current) {
      try {
        if (isMuted) {
          await soundRef.current.setVolumeAsync(0.275);
        } else {
          await soundRef.current.setVolumeAsync(0);
        }
        setIsMuted(!isMuted);
      } catch (error) {
        console.log('Error toggling mute:', error);
      }
    }
  };

  // Breathing text animation (inhale/exhale) - syncs with orb expansion/contraction
  // Orb starts small with "Breathe Out", expands (Breathe In), then contracts (Breathe Out)
  useEffect(() => {
    // Start with "Breathe Out" (orb is small)
    setBreathText('out');
    
    // Immediately change to "Breathe In" as orb starts expanding (small → large)
    const expandTimer = setTimeout(() => {
      setBreathText('in');
    }, 50); // Small delay to show "Breathe Out" briefly when small

    // After expansion duration, change to "Breathe Out" as orb starts contracting (large → small)
    const contractTimer = setTimeout(() => {
      setBreathText('out');
    }, BREATH_DURATION + 50);

    // Then loop: toggle every breath duration to sync with orb
    // When orb expands (small to large) = "Breathe In"
    // When orb contracts (large to small) = "Breathe Out"
    breathIntervalRef.current = setInterval(() => {
      setBreathText((prev) => {
        // Swapped logic: "Breathe In" during expansion, "Breathe Out" during contraction
        return prev === 'out' ? 'in' : 'out';
      });
    }, BREATH_DURATION);

    return () => {
      clearTimeout(expandTimer);
      clearTimeout(contractTimer);
      if (breathIntervalRef.current) {
        clearInterval(breathIntervalRef.current);
      }
    };
  }, []);

  // Start progress bar animation immediately, show "Breathe..." then "Continue"
  useEffect(() => {
    // Start progress bar animation immediately
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: BREATHING_TIMER_DURATION * 1000,
      useNativeDriver: false,
    }).start();

    // After timer duration, show "Continue"
    const continueTimer = setTimeout(() => {
      setShowContinue(true);
    }, BREATHING_TIMER_DURATION * 1000);

    return () => {
      clearTimeout(continueTimer);
    };
  }, []);

  const handleContinue = async () => {
    // Stop sound
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }
    
    // Navigate to home
    router.replace('/(tabs)');
  };

  const handleSkip = async () => {
    // Stop sound
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }
    
    // Navigate to home
    router.replace('/(tabs)');
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ImageBackground
      source={{ uri: backgroundImage }}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      
      <View style={styles.content}>
        {/* Breathing Circle */}
        <View style={styles.circleContainer}>
          <OnboardingBreathingCircle isActive={true} />
        </View>

        {/* Breath Text */}
        <Text style={styles.breathText}>
          Breathe {breathText === 'in' ? 'In' : 'Out'}
        </Text>

        {/* Bottom Controls */}
        <View style={styles.bottomContainer}>
          {/* Mute Button */}
          <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
            <Ionicons 
              name={isMuted ? 'volume-mute' : 'volume-high'} 
              size={20} 
              color="#fff" 
              style={styles.muteIcon}
            />
            <Text style={styles.muteText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          {/* Primary Button */}
          {!showContinue ? (
            <TouchableOpacity style={styles.primaryButton} disabled>
              <View style={styles.progressBarContainer}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    { width: progressWidth },
                  ]}
                />
              </View>
              <Text style={styles.primaryButtonText}>Breathe...</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          )}

          {/* Skip Button */}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  circleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  breathText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    marginTop: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bottomContainer: {
    width: '100%',
    paddingBottom: 50,
    alignItems: 'center',
  },
  muteButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteIcon: {
    marginRight: 8,
  },
  muteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 18,
    borderRadius: 999, // Completely rounded edges (pill shape)
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressBarContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: 'transparent',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    zIndex: 1,
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '500',
  },
});
