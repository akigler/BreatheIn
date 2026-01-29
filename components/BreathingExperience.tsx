import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingBreathingCircle } from './OnboardingBreathingCircle';
import { AppInfo } from '../types/breatheSettings';
import { NATURE_IMAGES, getSoundForImage } from '../utils/constants';

const BREATH_DURATION = 6000; // 6 seconds for inhale/exhale
const TOTAL_CYCLE = 12000; // 12 seconds total

export interface BreathingExperienceProps {
  /** 'session' for full meditation, 'overlay' for app interception */
  variant: 'session' | 'overlay';
  /** Duration in seconds */
  duration: number;
  /** Called when breathing is complete (timer ends or user continues) */
  onComplete: () => void;
  /** Called when user stops/skips early */
  onStop?: () => void;
  /** For overlay variant: info about the app that triggered it */
  appInfo?: AppInfo | null;
  /** Whether to show nature background (default: true for session, false for overlay) */
  showBackground?: boolean;
  /** Whether to play ambient sounds (default: true for session, false for overlay) */
  showSounds?: boolean;
  /** Whether visible (for modal-based overlay) */
  visible?: boolean;
  /** Whether the breathing animation is active */
  isActive?: boolean;
}

const MOTIVATIONAL_QUOTES = [
  {
    text: '"Take a moment to breathe. Your mind will thank you."',
    author: '— Mindfulness Guide',
  },
  {
    text: '"Between stimulus and response there is a space. In that space is our power to choose our response."',
    author: '— Viktor Frankl',
  },
  {
    text: '"Breathing in, I calm my body. Breathing out, I smile."',
    author: '— Thich Nhat Hanh',
  },
  {
    text: '"The present moment is the only time over which we have dominion."',
    author: '— Thich Nhat Hanh',
  },
];

export const BreathingExperience: React.FC<BreathingExperienceProps> = ({
  variant,
  duration,
  onComplete,
  onStop,
  appInfo,
  showBackground,
  showSounds,
  visible = true,
  isActive: isActiveProp,
}) => {
  // Default values based on variant
  const shouldShowBackground = showBackground ?? (variant === 'session');
  const shouldShowSounds = showSounds ?? (variant === 'session');

  const [isActive, setIsActive] = useState(isActiveProp ?? true);
  const [remainingTime, setRemainingTime] = useState(duration);
  const [breathText, setBreathText] = useState<'in' | 'out'>('out');
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [quote] = useState(() => 
    MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
  );
  
  const backgroundSoundRef = useRef<Audio.Sound | null>(null);
  const gongSoundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const breathIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const remainingTimeRef = useRef(remainingTime);

  // Keep ref in sync
  useEffect(() => {
    remainingTimeRef.current = remainingTime;
  }, [remainingTime]);

  // Sync with external isActive prop
  useEffect(() => {
    if (isActiveProp !== undefined) {
      setIsActive(isActiveProp);
    }
  }, [isActiveProp]);

  // Select random background image
  useEffect(() => {
    if (shouldShowBackground) {
      const randomImageObj = NATURE_IMAGES[Math.floor(Math.random() * NATURE_IMAGES.length)];
      setBackgroundImage(randomImageObj.url);
    }
  }, [shouldShowBackground]);

  // Initialize session
  useEffect(() => {
    if (visible) {
      setIsActive(true);
      setRemainingTime(duration);
      setShowContinue(false);

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade out and cleanup
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setIsActive(false);
      setShowContinue(false);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    };
  }, [visible, duration]);

  // Load and play background sound
  useEffect(() => {
    if (!shouldShowSounds || !backgroundImage || !visible) return;

    const loadSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        const soundSource = getSoundForImage(backgroundImage);
        const soundAsset = typeof soundSource === 'string' 
          ? { uri: soundSource }
          : soundSource;
        
        const { sound } = await Audio.Sound.createAsync(
          soundAsset,
          { 
            shouldPlay: true,
            isLooping: true,
            volume: 0.275,
          }
        );
        backgroundSoundRef.current = sound;

        // Preload gong sound for session completion
        const { sound: gongSound } = await Audio.Sound.createAsync(
          { uri: 'https://www.orangefreesounds.com/wp-content/uploads/2014/11/Gong-sound.mp3' },
          { 
            shouldPlay: false,
            volume: 0.68,
          }
        );
        gongSoundRef.current = gongSound;
      } catch (error) {
        console.log('Error loading sound:', error);
      }
    };

    loadSound();

    return () => {
      if (backgroundSoundRef.current) {
        backgroundSoundRef.current.unloadAsync();
        backgroundSoundRef.current = null;
      }
      if (gongSoundRef.current) {
        gongSoundRef.current.unloadAsync();
        gongSoundRef.current = null;
      }
    };
  }, [shouldShowSounds, backgroundImage, visible]);

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

  // Breathing text animation
  useEffect(() => {
    if (isActive && visible) {
      animationStartTimeRef.current = Date.now();
      setBreathText('out');

      breathIntervalRef.current = setInterval(() => {
        if (animationStartTimeRef.current === null) return;
        
        const elapsed = Date.now() - animationStartTimeRef.current;
        const cycleTime = elapsed % TOTAL_CYCLE;
        
        if (cycleTime < BREATH_DURATION) {
          setBreathText('in');
        } else {
          setBreathText('out');
        }
      }, 100);

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
  }, [isActive, visible]);

  // Timer countdown
  useEffect(() => {
    if (isActive && visible) {
      timerRef.current = setInterval(() => {
        const currentTime = remainingTimeRef.current;
        if (currentTime > 0) {
          const newTime = currentTime - 1;
          setRemainingTime(newTime);

          // Update progress
          const progress = 1 - (newTime / duration);
          Animated.timing(progressAnim, {
            toValue: progress,
            duration: 1000,
            useNativeDriver: false,
          }).start();

          if (newTime <= 0) {
            setIsActive(false);
            setShowContinue(true);
            handleSessionComplete();
          }
        }
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [isActive, visible, duration]);

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

  const handleSessionComplete = useCallback(async () => {
    if (shouldShowSounds) {
      await playGongSound();
    }
  }, [shouldShowSounds]);

  const handleContinue = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleStop = useCallback(() => {
    if (onStop) {
      onStop();
    }
  }, [onStop]);

  const formatTime = (seconds: number): string => {
    if (variant === 'overlay') {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (!visible) {
    return null;
  }

  const content = (
    <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
      {/* Dim overlay for background */}
      {shouldShowBackground && <View style={styles.dimOverlay} />}
      
      <View style={styles.content}>
        {/* App Info (overlay variant only) */}
        {variant === 'overlay' && appInfo && (
          <View style={styles.appInfoContainer}>
            <View style={styles.appIconPlaceholder}>
              <Text style={styles.appIconText}>{appInfo.name.charAt(0)}</Text>
            </View>
            <Text style={styles.appName}>{appInfo.name}</Text>
          </View>
        )}

        {/* Breathing Circle */}
        <View style={styles.circleContainer}>
          <OnboardingBreathingCircle isActive={isActive} />
        </View>

        {/* Breath Text */}
        <Text style={styles.breathText}>
          Breathe {breathText === 'in' ? 'In' : 'Out'}
        </Text>

        {/* Quote (overlay variant only, when not showing continue) */}
        {variant === 'overlay' && !showContinue && (
          <View style={styles.quoteContainer}>
            <Text style={styles.quoteText}>{quote.text}</Text>
            <Text style={styles.quoteAuthor}>{quote.author}</Text>
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.bottomContainer}>
          {/* Mute Button (when sounds enabled) */}
          {shouldShowSounds && (
            <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
              <Ionicons 
                name={isMuted ? 'volume-mute' : 'volume-high'} 
                size={20} 
                color="#fff" 
                style={styles.muteIcon}
              />
              <Text style={styles.muteText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>
          )}

          {/* Timer Display */}
          {!showContinue && (
            <View style={styles.timerContainer}>
              <View style={styles.timerButton}>
                {variant === 'session' && (
                  <View style={styles.progressBarContainer}>
                    <Animated.View
                      style={[styles.progressBar, { width: progressWidth }]}
                    />
                  </View>
                )}
                <Text style={styles.timerText}>{formatTime(remainingTime)}</Text>
              </View>
            </View>
          )}

          {/* Continue Button (after timer ends) */}
          {showContinue && (
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          )}

          {/* Stop/Skip Button */}
          {!showContinue && onStop && (
            variant === 'session' ? (
              <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
                <LinearGradient
                  colors={['#C8F0BF', '#BFECF0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.stopButtonGradient}
                >
                  <Text style={styles.stopButtonText}>Stop Session</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.skipButton} onPress={handleStop}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </Animated.View>
  );

  // For overlay variant, wrap in Modal
  if (variant === 'overlay') {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={[styles.container, !shouldShowBackground && styles.darkBackground]}>
          {shouldShowBackground && backgroundImage ? (
            <ImageBackground
              source={{ uri: backgroundImage }}
              style={styles.backgroundImage}
              resizeMode="cover"
            >
              {content}
            </ImageBackground>
          ) : (
            content
          )}
        </View>
      </Modal>
    );
  }

  // For session variant, render directly with ImageBackground
  return (
    <View style={styles.container}>
      {shouldShowBackground && backgroundImage ? (
        <ImageBackground
          source={{ uri: backgroundImage }}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          {content}
        </ImageBackground>
      ) : (
        <View style={[styles.container, styles.darkBackground]}>
          {content}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  darkBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  contentWrapper: {
    flex: 1,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  appInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  appIconPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appIconText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  circleContainer: {
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
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
  quoteContainer: {
    maxWidth: '90%',
    marginBottom: 32,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  bottomContainer: {
    width: '100%',
    paddingBottom: 50,
    alignItems: 'center',
    marginTop: 'auto',
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
    borderRadius: 999,
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
  continueButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 999,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  stopButton: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#00FFB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  stopButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    opacity: 0.9,
  },
  stopButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '500',
  },
});
