import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions, Animated, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '../store/sessionStore';
import { SESSION_DURATIONS, formatDuration, secondsToMinutes } from '../utils/constants';

const ITEM_HEIGHT = 44;
const WHEEL_HEIGHT = ITEM_HEIGHT * 4;

interface SessionControlsProps {
  onStartSession: (duration: number) => void;
  onStopSession: () => void;
  isActive: boolean;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  onStartSession,
  onStopSession,
  isActive,
}) => {
  const { lastSelectedDuration, setLastSelectedDuration, loadLastSelectedDuration } = useSessionStore();
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(lastSelectedDuration || SESSION_DURATIONS[0]);
  const scrollViewRef = useRef<ScrollView>(null);
  const modalTranslateY = useRef(new Animated.Value(0)).current;

  // Load last selected duration on mount
  useEffect(() => {
    loadLastSelectedDuration();
  }, []);

  // Update selected duration when lastSelectedDuration changes
  useEffect(() => {
    if (lastSelectedDuration) {
      setSelectedDuration(lastSelectedDuration);
    }
  }, [lastSelectedDuration]);
  
  const modalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to vertical drags
        return Math.abs(gestureState.dy) > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        modalTranslateY.setOffset(modalTranslateY._value);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow downward dragging
        if (gestureState.dy > 0) {
          modalTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        modalTranslateY.flattenOffset();
        // If dragged down more than 100px or with velocity, close the modal
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Animated.timing(modalTranslateY, {
            toValue: Dimensions.get('window').height,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowDurationPicker(false);
            modalTranslateY.setValue(0);
          });
        } else {
          // Snap back
          Animated.spring(modalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (showDurationPicker && scrollViewRef.current) {
      // Scroll to selected duration on mount
      const selectedIndex = SESSION_DURATIONS.indexOf(selectedDuration);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: selectedIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, [showDurationPicker, selectedDuration]);

  const handleDurationButtonClick = () => {
    if (!isActive) {
      setShowDurationPicker(true);
    }
  };

  const handleStart = () => {
    if (!isActive) {
      // Immediately start with the selected duration
      const durationMinutes = secondsToMinutes(selectedDuration);
      onStartSession(durationMinutes);
    }
  };

  const handleDurationSelect = (durationSeconds: number) => {
    setSelectedDuration(durationSeconds);
    setLastSelectedDuration(durationSeconds);
    setShowDurationPicker(false);
    modalTranslateY.setValue(0);
  };

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, SESSION_DURATIONS.length - 1));
    const newDuration = SESSION_DURATIONS[clampedIndex];
    if (newDuration !== selectedDuration) {
      setSelectedDuration(newDuration);
    }
  };

  const handleOverlayPress = () => {
    setShowDurationPicker(false);
    modalTranslateY.setValue(0);
  };

  return (
    <View style={styles.container}>
      {/* Duration Button - styled like App + button */}
      <TouchableOpacity
        style={styles.durationButtonContainer}
        onPress={handleDurationButtonClick}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['rgba(0, 50, 60, 0.95)', 'rgba(60, 30, 20, 0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.durationButton}
        >
          <Text style={styles.durationButtonText}>
            - {formatDuration(selectedDuration)} +
          </Text>
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Start Breathing Button */}
      <TouchableOpacity style={styles.startButton} onPress={handleStart}>
        <LinearGradient
          colors={['#C8F0BF', '#BFECF0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          <Text style={styles.startButtonText}>Start Breathing</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={showDurationPicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDurationPicker(false);
          modalTranslateY.setValue(0);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={handleOverlayPress}
          >
            <View style={styles.overlaySpacer} />
          </TouchableOpacity>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: modalTranslateY }],
              },
            ]}
          >
            <View 
              style={styles.draggableArea}
              {...modalPanResponder.panHandlers}
            >
              <View style={styles.dragHandle} />
              <Text style={styles.modalTitle}>Breathe for...</Text>
            </View>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerSelection} />
              <ScrollView
                ref={scrollViewRef}
                style={styles.pickerWheel}
                contentContainerStyle={styles.pickerContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleScroll}
                onScrollEndDrag={handleScroll}
              >
                <View style={{ height: ITEM_HEIGHT }} />
                {SESSION_DURATIONS.map((durationSeconds) => {
                  const isSelected = selectedDuration === durationSeconds;
                  return (
                    <View 
                      key={durationSeconds} 
                      style={[
                        styles.pickerItem,
                        isSelected && styles.pickerItemSelected
                      ]}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          isSelected && styles.pickerItemTextSelected,
                        ]}
                      >
                        {formatDuration(durationSeconds)}
                      </Text>
                    </View>
                  );
                })}
                <View style={{ height: ITEM_HEIGHT }} />
              </ScrollView>
            </View>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => handleDurationSelect(selectedDuration)}
            >
              <LinearGradient
                colors={['#C8F0BF', '#BFECF0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.selectButtonGradient}
              >
                <Text style={styles.selectButtonText}>Select</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  durationButtonContainer: {
    borderRadius: 999,
    overflow: 'hidden',
    alignSelf: 'center',
    // Match the App button size - approximately the same width as the 9am-5pm/App button pair
    width: '48%',
  },
  durationButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 9999,
    overflow: 'hidden',
    shadowColor: '#00FFB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    opacity: 0.9,
  },
  startButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  overlaySpacer: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 0,
  },
  draggableArea: {
    marginBottom: 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  pickerContainer: {
    height: WHEEL_HEIGHT,
    marginBottom: 16,
    position: 'relative',
    justifyContent: 'center',
  },
  pickerSelection: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 16,
    right: 16,
    height: ITEM_HEIGHT,
    zIndex: 0,
  },
  pickerWheel: {
    flex: 1,
  },
  pickerContent: {
    paddingVertical: 0,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerItemText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 20,
    fontWeight: '400',
  },
  pickerItemTextSelected: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 20,
  },
  selectButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#00FFB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  selectButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  selectButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
