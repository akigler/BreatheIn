import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BREATHING_DURATIONS, BREATHING_SCALE } from '../utils/constants';

interface BreathingCircleProps {
  isActive?: boolean;
}

type BreathingPhase = 'inhale' | 'holdAfterInhale' | 'exhale' | 'holdAfterExhale';

// Opal-like color palettes that shift during breathing
const OPAL_COLORS = {
  inhale: [
    '#00D4FF', // Bright cyan-blue
    '#00FFB8', // Electric green
    '#7B2CBF', // Purple
    '#FF006E', // Pink
  ],
  hold: [
    '#00FFB8', // Electric green
    '#00D4FF', // Bright cyan-blue
    '#FFD60A', // Yellow
    '#7B2CBF', // Purple
  ],
  exhale: [
    '#7B2CBF', // Purple
    '#FF006E', // Pink
    '#00D4FF', // Bright cyan-blue
    '#00FFB8', // Electric green
  ],
};

export const BreathingCircle: React.FC<BreathingCircleProps> = ({ isActive = true }) => {
  // Start at minimum scale (inhale starting position)
  const scale = useRef(new Animated.Value(BREATHING_SCALE.MIN)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const animationStartTime = useRef<number | null>(null);
  const [currentColors, setCurrentColors] = useState<string[]>(OPAL_COLORS.inhale);

  useEffect(() => {
    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    if (!isActive) {
      Animated.timing(scale, {
        toValue: BREATHING_SCALE.MIN,
        duration: 500,
        useNativeDriver: true,
      }).start();
      return;
    }

    // Create the breathing cycle animation using React Native's Animated API
    // Using symmetric easing curves to ensure seamless loop transitions
    // The exhale easing should be the reverse of inhale to ensure perfect matching at start/end
    const inhaleEasing = Easing.bezier(0.42, 0, 0.58, 1); // Standard ease-in-out
    const exhaleEasing = Easing.bezier(0.42, 0, 0.58, 1); // Same easing for perfect symmetry and fluidity
    
    const createBreathingCycle = () => {
      return Animated.sequence([
        // Inhale: scale up
        Animated.timing(scale, {
          toValue: BREATHING_SCALE.MAX,
          duration: BREATHING_DURATIONS.INHALE,
          easing: inhaleEasing,
          useNativeDriver: true,
        }),
        // Hold at max size: maintain scale for 1 second
        Animated.delay(BREATHING_DURATIONS.HOLD_AFTER_INHALE),
        // Exhale: scale down
        Animated.timing(scale, {
          toValue: BREATHING_SCALE.MIN,
          duration: BREATHING_DURATIONS.EXHALE,
          easing: exhaleEasing,
          useNativeDriver: true,
        }),
        // Hold at min size: maintain scale for 1 second (at MIN, ready to restart)
        Animated.delay(BREATHING_DURATIONS.HOLD_AFTER_EXHALE),
      ]);
    };

    // Reset animation start time when starting a new cycle
    animationStartTime.current = Date.now();
    
    // Repeat the cycle infinitely
    const cycle = createBreathingCycle();
    const loop = Animated.loop(cycle);
    animationRef.current = loop;
    loop.start();
  }, [isActive, scale]);

  // Determine current phase text based on animation progress
  const [phaseText, setPhaseText] = React.useState<BreathingPhase>('inhale');

  useEffect(() => {
    if (!isActive) {
      animationStartTime.current = null;
      setPhaseText('inhale');
      return;
    }

    // Set the start time when animation begins
    if (animationStartTime.current === null) {
      animationStartTime.current = Date.now();
      setPhaseText('inhale');
    }

    const interval = setInterval(() => {
      if (animationStartTime.current === null) return;
      
      // Calculate elapsed time since animation started
      const elapsed = Date.now() - animationStartTime.current;
      const cycleTime = elapsed % BREATHING_DURATIONS.TOTAL_CYCLE;
      
      if (cycleTime < BREATHING_DURATIONS.INHALE) {
        setPhaseText('inhale');
        setCurrentColors(OPAL_COLORS.inhale);
      } else if (cycleTime < BREATHING_DURATIONS.INHALE + BREATHING_DURATIONS.HOLD_AFTER_INHALE) {
        setPhaseText('holdAfterInhale');
        setCurrentColors(OPAL_COLORS.hold);
      } else if (cycleTime < BREATHING_DURATIONS.INHALE + BREATHING_DURATIONS.HOLD_AFTER_INHALE + BREATHING_DURATIONS.EXHALE) {
        setPhaseText('exhale');
        setCurrentColors(OPAL_COLORS.exhale);
      } else {
        setPhaseText('holdAfterExhale');
        setCurrentColors(OPAL_COLORS.hold);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  const getPhaseText = () => {
    switch (phaseText) {
      case 'inhale':
        return 'Breathe In';
      case 'holdAfterInhale':
        return 'Breathe In'; // Keep showing "Breathe In" during hold at max
      case 'exhale':
        return 'Breathe Out';
      case 'holdAfterExhale':
        return 'Breathe Out'; // Keep showing "Breathe Out" during hold at min
      default:
        return 'Breathe In';
    }
  };

  // Scale animation for all circles
  const animatedStyle = {
    transform: [{ scale }],
  };

  return (
    <View style={styles.container}>
      {/* Outer glow effect - only scales, no opacity */}
      <Animated.View style={[styles.glow, animatedStyle]} />
      
      {/* Main opal circle with gradient - only scales */}
      <Animated.View style={[styles.circle, animatedStyle]}>
        <LinearGradient
          colors={currentColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCircle}
        >
          <View style={styles.innerCircle}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)']}
              style={styles.innerGradient}
            >
              <Text style={styles.phaseText}>{getPhaseText()}</Text>
            </LinearGradient>
          </View>
        </LinearGradient>
        {/* Stroke overlay - fully opaque */}
        <Animated.View style={styles.strokeOverlay} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0, 212, 255, 1)', // No opacity, fully opaque
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00FFB8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  strokeOverlay: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 1)',
    pointerEvents: 'none',
  },
  gradientCircle: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 1, // Fully opaque
  },
  phaseText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 2,
  },
});
