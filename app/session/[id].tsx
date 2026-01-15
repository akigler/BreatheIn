import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingBreathingCircle } from '../../components/OnboardingBreathingCircle';
import { useSessionStore } from '../../store/sessionStore';
import { enableShield, disableShield } from '../../native-modules/ScreenShield';
import { NATURE_IMAGES, getSoundForImage } from '../../utils/constants';

const BREATH_DURATION = 6000; // 6 seconds for inhale/exhale (matches OnboardingBreathingCircle)
const TOTAL_CYCLE = 12000; // 12 seconds total (6s inhale + 6s exhale)

export default function BreathingSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isActive, duration, remainingTime, startSession, stopSession, updateRemainingTime } =
    useSessionStore();
  const [breathText, setBreathText] = useState<'in' | 'out'>('out');
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const backgroundSoundRef = useRef<Audio.Sound | null>(null);
  const gongSoundRef = useRef<Audio.Sound | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const breathIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const remainingTimeRef = useRef(remainingTime);
  const sessionDurationSeconds = duration * 60; // Convert minutes to seconds

  // Keep ref in sync with store value
  useEffect(() => {
    remainingTimeRef.current = remainingTime;
  }, [remainingTime]);

  // Select random background image
  useEffect(() => {
    const randomImageObj = NATURE_IMAGES[Math.floor(Math.random() * NATURE_IMAGES.length)];
    setBackgroundImage(randomImageObj.url);
  }, []);

  // Start session when component mounts
  useEffect(() => {
    if (!isActive && id) {
      const sessionDuration = parseFloat(id) || 5;
      startSession(sessionDuration);
      enableShield();
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (breathIntervalRef.current) {
        clearInterval(breathIntervalRef.current);
      }
      disableShield();
    };
  }, []);

  // Load and play background sound that matches the selected image
  useEffect(() => {
    const loadSound = async () => {
      try {
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
        backgroundSoundRef.current = sound;

        // Preload gong sound for session completion
        // Using a free gong sound - in production, bundle this locally for better reliability
        // Example: require('../../assets/sounds/gong.mp3')
        const { sound: gongSound } = await Audio.Sound.createAsync(
          { uri: 'https://www.orangefreesounds.com/wp-content/uploads/2014/11/Gong-sound.mp3' },
          { 
            shouldPlay: false,
            volume: 0.8,
          }
        );
        gongSoundRef.current = gongSound;
      } catch (error) {
        console.log('Error loading sound:', error);
      }
    };

    // Only load sound if we have a background image
    if (backgroundImage) {
      loadSound();
    }

    return () => {
      if (backgroundSoundRef.current) {
        backgroundSoundRef.current.unloadAsync();
      }
      if (gongSoundRef.current) {
        gongSoundRef.current.unloadAsync();
      }
    };
  }, [backgroundImage]);

  // Handle mute toggle
  const toggleMute = async () => {
    if (backgroundSoundRef.current) {
      try {
        if (isMuted) {
          await backgroundSoundRef.current.setVolumeAsync(0.275);
        } else {
          await backgroundSoundRef.current.setVolumeAsync(0);
        }
        setIsMuted(!isMuted);
      } catch (error) {
        console.log('Error toggling mute:', error);
      }
    }
  };

  // Breathing text animation (inhale/exhale) - syncs with orb expansion/contraction
  useEffect(() => {
    if (isActive) {
      // Set animation start time
      animationStartTimeRef.current = Date.now();
      
      // Start with "Breathe Out" (circle is at smallest, about to start growing)
      setBreathText('out');

      // Update breath text based on animation phase
      breathIntervalRef.current = setInterval(() => {
        if (animationStartTimeRef.current === null) return;
        
        // Calculate elapsed time since animation started
        const elapsed = Date.now() - animationStartTimeRef.current;
        const cycleTime = elapsed % TOTAL_CYCLE;
        
        if (cycleTime < BREATH_DURATION) {
          // Inhale phase (0-6000ms): circle is expanding, show "Breathe In"
          setBreathText('in');
        } else {
          // Exhale phase (6000-12000ms): circle is contracting, show "Breathe Out"
          setBreathText('out');
        }
      }, 100); // Check every 100ms for smooth updates

      return () => {
        animationStartTimeRef.current = null;
        if (breathIntervalRef.current) {
          clearInterval(breathIntervalRef.current);
        }
      };
    } else {
      animationStartTimeRef.current = null;
      setBreathText('out');
    }
  }, [isActive]);

  // Show timer immediately when session starts
  useEffect(() => {
    if (isActive) {
      setShowTimer(true);
    }
  }, [isActive]);

  const playGongSound = async () => {
    try {
      if (gongSoundRef.current) {
        await gongSoundRef.current.setPositionAsync(0);
        await gongSoundRef.current.playAsync();
      }
    } catch (error) {
      console.log('Error playing gong sound:', error);
    }
  };

  const navigateToHome = useCallback(async () => {
    // Stop all sounds
    if (backgroundSoundRef.current) {
      await backgroundSoundRef.current.unloadAsync();
    }
    if (gongSoundRef.current) {
      await gongSoundRef.current.unloadAsync();
    }

    stopSession();
    disableShield();
    router.replace('/(tabs)');
  }, [stopSession, router]);

  const handleSessionComplete = useCallback(async () => {
    // Play gong sound
    await playGongSound();

    // Stop background sound
    if (backgroundSoundRef.current) {
      await backgroundSoundRef.current.unloadAsync();
    }

    Alert.alert('Session Complete!', 'Great job completing your breathing session.', [
      {
        text: 'Done',
        onPress: navigateToHome,
      },
    ]);
  }, [navigateToHome]);

  const handleStop = () => {
    // Stop session immediately without confirmation
    navigateToHome();
  };

  // Update progress bar when remaining time changes
  useEffect(() => {
    if (isActive && showTimer && remainingTime > 0) {
      const initialTime = sessionDurationSeconds;
      const progress = 1 - (remainingTime / initialTime);

      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }
  }, [isActive, showTimer, remainingTime, sessionDurationSeconds]);

  // Timer countdown - start immediately when session starts
  useEffect(() => {
    if (isActive && showTimer) {
      // Countdown timer - start immediately
      timerIntervalRef.current = setInterval(() => {
        const currentTime = remainingTimeRef.current;
        if (currentTime > 0) {
          const newTime = currentTime - 1;
          updateRemainingTime(newTime);

          if (newTime <= 0) {
            handleSessionComplete();
          }
        }
      }, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [isActive, showTimer, updateRemainingTime, handleSessionComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          <OnboardingBreathingCircle isActive={isActive} />
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

          {/* Timer Display with Progress Bar */}
          {showTimer ? (
            <View style={styles.timerContainer}>
              <View style={styles.timerButton}>
                <View style={styles.progressBarContainer}>
                  <Animated.View
                    style={[
                      styles.progressBar,
                      { width: progressWidth },
                    ]}
                  />
                </View>
                <Text style={styles.timerText}>
                  {formatTime(remainingTime)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.timerContainer}>
              <View style={styles.timerButton}>
                <Text style={styles.timerText}>
                  {formatTime(remainingTime)}
                </Text>
              </View>
            </View>
          )}

          {/* Stop Button */}
          <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
            <Text style={styles.stopButtonText}>Stop Session</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    marginBottom: 15,
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 15,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  muteIcon: {
    marginRight: 8,
  },
  muteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  timerContainer: {
    width: '100%',
    marginBottom: 16,
  },
  timerButton: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 18,
    borderRadius: 999, // Completely rounded edges (pill shape)
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  timerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    zIndex: 1,
  },
  stopButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 0, 110, 0.6)',
    paddingVertical: 18,
    borderRadius: 999, // Completely rounded edges (pill shape)
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 110, 0.3)',
    shadowColor: '#FF006E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
