import { View, StyleSheet } from 'react-native';

/**
 * Placeholder route for breathein://overlay deep link.
 * Expo Router matches this so we don't get "Unmatched Route".
 * The actual overlay UI is shown by _layout (BreathingOverlay);
 * this screen stays blank. User is redirected to home after overlay is dismissed.
 */
export default function OverlayRoute() {
  return <View style={StyleSheet.absoluteFill} />;
}
