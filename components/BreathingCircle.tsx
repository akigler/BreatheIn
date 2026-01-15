import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BREATHING_DURATIONS, BREATHING_SCALE, BREATHING_OPACITY } from '../utils/constants';

interface BreathingCircleProps {
  isActive?: boolean;
}

type BreathingPhase = 'inhale' | 'hold' | 'exhale';

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
  // Start at minimum scale/opacity (inhale starting position)
  const scale = useRef(new Animated.Value(BREATHING_SCALE.MIN)).current;
  const opacity = useRef(new Animated.Value(BREATHING_OPACITY.MIN)).current;
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
      Animated.parallel([
        Animated.timing(scale, {
          toValue: BREATHING_SCALE.MIN,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: BREATHING_OPACITY.MIN,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    // Create the breathing cycle animation using React Native's Animated API
    const createBreathingCycle = () => {
      return Animated.sequence([
        // Inhale: scale up and increase opacity
        Animated.parallel([
          Animated.timing(scale, {
            toValue: BREATHING_SCALE.MAX,
            duration: BREATHING_DURATIONS.INHALE,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: BREATHING_OPACITY.MAX,
            duration: BREATHING_DURATIONS.INHALE,
            useNativeDriver: true,
          }),
        ]),
        // Hold: maintain scale
        Animated.delay(BREATHING_DURATIONS.HOLD),
        // Exhale: scale down and decrease opacity
        Animated.parallel([
          Animated.timing(scale, {
            toValue: BREATHING_SCALE.MIN,
            duration: BREATHING_DURATIONS.EXHALE,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: BREATHING_OPACITY.MIN,
            duration: BREATHING_DURATIONS.EXHALE,
            useNativeDriver: true,
          }),
        ]),
      ]);
    };

    // Reset animation start time when starting a new cycle
    animationStartTime.current = Date.now();
    
    // Repeat the cycle infinitely
    const cycle = createBreathingCycle();
    const loop = Animated.loop(cycle);
    animationRef.current = loop;
    loop.start();
  }, [isActive, scale, opacity]);

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
      } else if (cycleTime < BREATHING_DURATIONS.INHALE + BREATHING_DURATIONS.HOLD) {
        setPhaseText('hold');
        setCurrentColors(OPAL_COLORS.hold);
      } else {
        setPhaseText('exhale');
        setCurrentColors(OPAL_COLORS.exhale);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  const getPhaseText = () => {
    switch (phaseText) {
      case 'inhale':
        return 'Breathe In';
      case 'hold':
        return 'Hold';
      case 'exhale':
        return 'Breathe Out';
      default:
        return 'Breathe In';
    }
  };

  const animatedStyle = {
    transform: [{ scale }],
    opacity,
  };

  return (
    <View style={styles.container}>
      {/* Outer glow effect */}
      <Animated.View style={[styles.glow, animatedStyle]} />
      
      {/* Main opal circle with gradient */}
      <Animated.View style={[styles.circle, animatedStyle]}>
        <LinearGradient
          colors={currentColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCircle}
        >
          <View style={styles.innerCircle}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
              style={styles.innerGradient}
            >
              <Text style={styles.phaseText}>{getPhaseText()}</Text>
            </LinearGradient>
          </View>
        </LinearGradient>
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
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
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
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#00FFB8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
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
