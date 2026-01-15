import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { OnboardingBreathingCircle } from './OnboardingBreathingCircle';
import { AppInfo } from '../types/breatheSettings';

interface BreathingOverlayProps {
  visible: boolean;
  appInfo: AppInfo | null;
  duration: number; // Duration in seconds
  onComplete: () => void;
  onSkip?: () => void;
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

export const BreathingOverlay: React.FC<BreathingOverlayProps> = ({
  visible,
  appInfo,
  duration,
  onComplete,
  onSkip,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [remainingTime, setRemainingTime] = useState(duration);
  const [showContinue, setShowContinue] = useState(false);
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      // Select random quote
      const randomQuote =
        MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
      setQuote(randomQuote);

      // Reset state
      setIsActive(true);
      setRemainingTime(duration);
      setShowContinue(false);

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Start countdown
      timerRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            setShowContinue(true);
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      setIsActive(false);
      setShowContinue(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [visible, duration]);

  const handleContinue = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip();
    }
  }, [onSkip]);

  const formatTime = (seconds: number): string => {
    return `${seconds}s`;
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}} // Prevent back button from closing
    >
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <View style={styles.content}>
          {/* App Info */}
          {appInfo && (
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

          {/* Title */}
          <Text style={styles.title}>Breathe</Text>

          {/* Quote */}
          <View style={styles.quoteContainer}>
            <Text style={styles.quoteText}>{quote.text}</Text>
            <Text style={styles.quoteAuthor}>{quote.author}</Text>
          </View>

          {/* Timer */}
          {!showContinue && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(remainingTime)}</Text>
            </View>
          )}

          {/* Continue Button */}
          {showContinue && (
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          )}

          {/* Skip Button (optional) */}
          {!showContinue && onSkip && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
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
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
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
  timerContainer: {
    marginBottom: 24,
  },
  timerText: {
    fontSize: 24,
    color: '#00FFB8',
    fontWeight: '600',
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
