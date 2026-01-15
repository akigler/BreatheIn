import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface OnboardingBreathingCircleProps {
  isActive?: boolean;
}

// Number of circles to create the layered effect
const NUM_CIRCLES = 15;
const BREATH_DURATION = 5000; // 5 seconds for inhale/exhale
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.4;

export const OnboardingBreathingCircle: React.FC<OnboardingBreathingCircleProps> = ({ 
  isActive = true 
}) => {
  const scales = useRef(
    Array.from({ length: NUM_CIRCLES }, () => new Animated.Value(MIN_SCALE))
  ).current;
  const opacities = useRef(
    Array.from({ length: NUM_CIRCLES }, () => new Animated.Value(0.05))
  ).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!isActive) {
      // Reset to minimum
      Animated.parallel(
        scales.map((scale) =>
          Animated.timing(scale, {
            toValue: MIN_SCALE,
            duration: 500,
            useNativeDriver: true,
          })
        ).concat(
          opacities.map((opacity) =>
            Animated.timing(opacity, {
              toValue: 0.05,
              duration: 500,
              useNativeDriver: true,
            })
          )
        )
      ).start();
      return;
    }

    // Create breathing cycle - all circles expand and contract together
    // but with different opacities based on their position
    const createBreathingCycle = () => {
      return Animated.sequence([
        // Inhale - expand all circles
        Animated.parallel(
          scales.map((scale) =>
            Animated.timing(scale, {
              toValue: MAX_SCALE,
              duration: BREATH_DURATION,
              useNativeDriver: true,
            })
          ).concat(
            opacities.map((opacity, index) => {
              // Inner circles (lower index) have higher opacity when bunched
              // Outer circles (higher index) have lower opacity
              const progress = index / NUM_CIRCLES;
              const maxOpacity = 0.8 - (progress * 0.7); // 0.8 for center, 0.1 for outer
              return Animated.timing(opacity, {
                toValue: maxOpacity,
                duration: BREATH_DURATION,
                useNativeDriver: true,
              });
            })
          )
        ),
        // Exhale - contract all circles
        Animated.parallel(
          scales.map((scale) =>
            Animated.timing(scale, {
              toValue: MIN_SCALE,
              duration: BREATH_DURATION,
              useNativeDriver: true,
            })
          ).concat(
            opacities.map((opacity, index) => {
              // When contracted, inner circles are denser (higher opacity)
              // Outer circles are more transparent
              const progress = index / NUM_CIRCLES;
              const minOpacity = 0.6 - (progress * 0.55); // 0.6 for center, 0.05 for outer
              return Animated.timing(opacity, {
                toValue: minOpacity,
                duration: BREATH_DURATION,
                useNativeDriver: true,
              });
            })
          )
        ),
      ]);
    };

    const cycle = createBreathingCycle();
    const loop = Animated.loop(cycle);
    animationRef.current = loop;
    loop.start();

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [isActive]);

  return (
    <View style={styles.container}>
      {scales.map((scale, index) => {
        // All circles start at the same size, but scale differently
        const baseSize = 100;
        const size = baseSize;
        
        // Create slight random offsets to make circles appear bunched up
        // Inner circles (lower index) have smaller offsets (more centered)
        // Outer circles (higher index) have larger offsets (spread out)
        const progress = index / NUM_CIRCLES;
        const maxOffset = progress * 15; // Max 15px offset for outer circles
        const angle = (index * 137.5) % 360; // Golden angle for even distribution
        const translateX = Math.cos((angle * Math.PI) / 180) * maxOffset;
        const translateY = Math.sin((angle * Math.PI) / 180) * maxOffset;

        return (
          <Animated.View
            key={index}
            style={[
              styles.circle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                transform: [
                  { scale },
                  { translateX },
                  { translateY },
                ],
                opacity: opacities[index],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'white',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});
