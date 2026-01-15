import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

interface OnboardingBreathingCircleProps {
  isActive?: boolean;
}

// Number of circles to create the layered effect
const NUM_CIRCLES = 15;
const BREATH_DURATION = 6000; // 6 seconds for inhale/exhale - longer for smoother transitions
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.4;
// Very smooth easing curve - gradual acceleration and deceleration
const SMOOTH_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
// Extra smooth easing for exhale - slows down very gradually at the end for seamless loop
const EXHALE_EASING = Easing.bezier(0.33, 0, 0.1, 1);
// Easing for opacity during exhale - changes slowly at large sizes, faster at small sizes
const OPACITY_EXHALE_EASING = Easing.bezier(0.4, 0, 0.6, 1);

export const OnboardingBreathingCircle: React.FC<OnboardingBreathingCircleProps> = ({ 
  isActive = true 
}) => {
  const scales = useRef(
    Array.from({ length: NUM_CIRCLES }, () => new Animated.Value(MIN_SCALE))
  ).current;
  const opacities = useRef(
    Array.from({ length: NUM_CIRCLES }, () => new Animated.Value(0.75))
  ).current;
  
  // Calculate offsets for each circle
  const offsets = useRef(
    Array.from({ length: NUM_CIRCLES }, (_, index) => {
      const progress = index / NUM_CIRCLES;
      const maxOffset = progress * 15; // Max 15px offset for outer circles
      const angle = (index * 137.5) % 360; // Golden angle for even distribution
      return {
        translateX: new Animated.Value(0), // Start at center (perfect circle)
        translateY: new Animated.Value(0), // Start at center (perfect circle)
        maxOffsetX: Math.cos((angle * Math.PI) / 180) * maxOffset,
        maxOffsetY: Math.sin((angle * Math.PI) / 180) * maxOffset,
      };
    })
  ).current;
  
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!isActive) {
      // Reset to minimum - all circles converge to center (perfect circle)
      Animated.parallel([
        ...scales.map((scale) =>
          Animated.timing(scale, {
            toValue: MIN_SCALE,
            duration: 500,
            useNativeDriver: true,
          })
        ),
        ...opacities.map((opacity) =>
          Animated.timing(opacity, {
            toValue: 0.75,
            duration: 500,
            useNativeDriver: true,
          })
        ),
        ...offsets.flatMap((offset) => [
          Animated.timing(offset.translateX, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(offset.translateY, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      return;
    }

    // Create breathing cycle - all circles expand and contract together
    const createBreathingCycle = () => {
      return Animated.sequence([
        // Inhale - expand all circles, fade out, and spread out from center
        Animated.parallel([
          ...scales.map((scale) =>
            Animated.timing(scale, {
              toValue: MAX_SCALE,
              duration: BREATH_DURATION,
              easing: SMOOTH_EASING,
              useNativeDriver: true,
            })
          ),
          ...opacities.map((opacity) =>
            Animated.timing(opacity, {
              toValue: 0.2,
              duration: BREATH_DURATION,
              easing: SMOOTH_EASING,
              useNativeDriver: true,
            })
          ),
          ...offsets.flatMap((offset) => [
            Animated.timing(offset.translateX, {
              toValue: offset.maxOffsetX,
              duration: BREATH_DURATION,
              easing: SMOOTH_EASING,
              useNativeDriver: true,
            }),
            Animated.timing(offset.translateY, {
              toValue: offset.maxOffsetY,
              duration: BREATH_DURATION,
              easing: SMOOTH_EASING,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Exhale - contract all circles, fade in, and converge to center (perfect circle)
        Animated.parallel([
          ...scales.map((scale) =>
            Animated.timing(scale, {
              toValue: MIN_SCALE,
              duration: BREATH_DURATION,
              easing: EXHALE_EASING,
              useNativeDriver: true,
            })
          ),
          ...opacities.map((opacity) =>
            Animated.timing(opacity, {
              toValue: 0.75,
              duration: BREATH_DURATION,
              easing: OPACITY_EXHALE_EASING,
              useNativeDriver: true,
            })
          ),
          ...offsets.flatMap((offset) => [
            Animated.timing(offset.translateX, {
              toValue: 0,
              duration: BREATH_DURATION,
              easing: EXHALE_EASING,
              useNativeDriver: true,
            }),
            Animated.timing(offset.translateY, {
              toValue: 0,
              duration: BREATH_DURATION,
              easing: EXHALE_EASING,
              useNativeDriver: true,
            }),
          ]),
        ]),
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
        // All circles start at the same size
        const baseSize = 100;
        const size = baseSize;
        const offset = offsets[index];

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
                  { translateX: offset.translateX },
                  { translateY: offset.translateY },
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
    borderColor: 'rgba(255, 255, 255, 1)', // Fully opaque border
  },
});
