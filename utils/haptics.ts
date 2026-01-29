import * as Haptics from 'expo-haptics';
import { Vibration, Platform } from 'react-native';

/**
 * Creates a vibration pattern that mimics a sound bowl massage
 * - Initial strike (strong vibration)
 * - Build-up of resonance (increasing intensity)
 * - Sustained harmonic vibrations (continuous, rhythmic)
 * - Gradual fade-out
 */
export class SoundBowlHaptics {
  private intervalId: NodeJS.Timeout | null = null;
  private vibrationPatternId: NodeJS.Timeout | null = null;
  private isActive = false;

  /**
   * Start the sound bowl vibration pattern
   * @param duration - Duration in milliseconds (default: 5000ms / 5 seconds)
   */
  async start(duration: number = 5000): Promise<void> {
    if (this.isActive) {
      this.stop();
    }

    this.isActive = true;

    // Initial strike - strong impact
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Small delay before resonance build-up
    await new Promise(resolve => setTimeout(resolve, 100));

    // Build-up phase: increasing intensity over 800ms
    const buildUpSteps = 4;
    const buildUpDuration = 800;
    const buildUpInterval = buildUpDuration / buildUpSteps;

    for (let i = 0; i < buildUpSteps; i++) {
      const intensity = (i + 1) / buildUpSteps;
      // Use medium impact for build-up
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await new Promise(resolve => setTimeout(resolve, buildUpInterval));
    }

    // Sustained harmonic vibrations - rhythmic pulses
    const sustainDuration = duration - 100 - buildUpDuration - 500; // Reserve 500ms for fade-out
    const pulseInterval = 150; // Pulse every 150ms for harmonic effect
    const pulses = Math.floor(sustainDuration / pulseInterval);

    let pulseCount = 0;
    this.intervalId = setInterval(async () => {
      if (pulseCount >= pulses || !this.isActive) {
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
        // Fade-out phase
        await this.fadeOut();
        return;
      }

      // Alternating between light and medium for harmonic resonance
      const style = pulseCount % 2 === 0 
        ? Haptics.ImpactFeedbackStyle.Light 
        : Haptics.ImpactFeedbackStyle.Medium;
      
      await Haptics.impactAsync(style);
      pulseCount++;
    }, pulseInterval);
  }

  /**
   * Fade-out phase - gradually decreasing vibrations
   */
  private async fadeOut(): Promise<void> {
    if (!this.isActive) return;

    const fadeSteps = 3;
    const fadeInterval = 150;

    for (let i = fadeSteps; i > 0; i--) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await new Promise(resolve => setTimeout(resolve, fadeInterval * i));
    }

    this.isActive = false;
  }

  /**
   * Stop the vibration pattern immediately
   */
  stop(): void {
    this.isActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.vibrationPatternId) {
      clearTimeout(this.vibrationPatternId);
      this.vibrationPatternId = null;
    }
    // Cancel any ongoing vibration
    if (Platform.OS === 'android') {
      Vibration.cancel();
    }
  }

  /**
   * Start continuous vibration synchronized with audio playback
   * Uses native Vibration API for smoother continuous feel (where supported)
   * Falls back to very frequent light haptics for iOS
   */
  async startContinuous(): Promise<void> {
    if (this.isActive) {
      this.stop();
    }

    this.isActive = true;

    // Initial strike - strong but brief
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise(resolve => setTimeout(resolve, 50));

    // Smooth build-up phase
    const buildUpSteps = 6;
    for (let i = 0; i < buildUpSteps; i++) {
      if (!this.isActive) return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await new Promise(resolve => setTimeout(resolve, 40));
    }

    // For Android: Use Vibration API with a pattern for smoother continuous feel
    if (Platform.OS === 'android') {
      // Create a pattern: vibrate for 30ms, pause for 20ms, repeat
      // This creates a smoother feel than discrete haptics
      const pattern = [0, 30, 20, 30, 20, 30, 20, 30, 20, 30, 20, 30, 20, 30, 20, 30];
      
      // Repeat the pattern continuously
      const repeatPattern = () => {
        if (!this.isActive) return;
        Vibration.vibrate(pattern, true); // true = repeat
        this.vibrationPatternId = setTimeout(repeatPattern, 800);
      };
      repeatPattern();
    } else {
      // iOS: Use very frequent, very light haptics for smoothest possible feel
      // iOS doesn't support continuous vibration patterns, so we approximate with rapid light pulses
      let pulseCount = 0;
      this.intervalId = setInterval(async () => {
        if (!this.isActive) {
          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
          }
          return;
        }

        // Use only the lightest haptic for maximum smoothness
        // Very short interval (30ms) to minimize jaggedness
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        pulseCount++;
      }, 30); // 30ms interval - as fast as possible while still being felt
    }
  }
}
