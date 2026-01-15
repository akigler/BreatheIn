import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useBreatheSettingsStore } from '../store/breatheSettingsStore';
import { AppInfo, TimeWindow } from '../types/breatheSettings';

export const BreatheSettingsButton: React.FC = () => {
  const router = useRouter();
  const {
    selectedApps,
    breatheLists,
    timeWindows,
    setTimeWindows,
    loadSettings,
  } = useBreatheSettingsStore();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Use the first time window, or default to 9-5 pm
    if (timeWindows.length > 0) {
      const firstWindow = timeWindows[0];
      setStartTime(firstWindow.start);
      setEndTime(firstWindow.end);
    } else {
      // Default to 9-5 pm
      setStartTime('09:00');
      setEndTime('17:00');
    }
  }, [timeWindows]);

  // Get all apps from selected apps and breathe lists
  const getAllApps = (): AppInfo[] => {
    const apps: AppInfo[] = [...selectedApps];
    
    // Add apps from all breathe lists
    breatheLists.forEach((list) => {
      list.apps.forEach((app) => {
        if (!apps.find((a) => a.id === app.id)) {
          apps.push(app);
        }
      });
    });

    return apps;
  };

  const apps = getAllApps();
  const displayApps = apps.slice(0, 3); // Show max 3 app icons
  const hasApps = apps.length > 0;

  const formatTimeDisplay = (start: string, end: string): string => {
    const [startHour, startMin] = start.split(':');
    const [endHour, endMin] = end.split(':');
    
    const startHourNum = parseInt(startHour);
    const endHourNum = parseInt(endHour);
    
    const startAmPm = startHourNum >= 12 ? 'pm' : 'am';
    const endAmPm = endHourNum >= 12 ? 'pm' : 'am';
    
    const startDisplayHour = startHourNum % 12 || 12;
    const endDisplayHour = endHourNum % 12 || 12;
    
    // Format: "9-5 pm" style (no minutes if :00, combine am/pm if same)
    if (startMin === '00' && endMin === '00') {
      if (startAmPm === endAmPm) {
        return `${startDisplayHour}-${endDisplayHour} ${endAmPm}`;
      } else {
        return `${startDisplayHour}${startAmPm}-${endDisplayHour}${endAmPm}`;
      }
    } else {
      return `${startDisplayHour}${startMin !== '00' ? `:${startMin}` : ''}${startAmPm}-${endDisplayHour}${endMin !== '00' ? `:${endMin}` : ''}${endAmPm}`;
    }
  };

  const handleTimeClick = () => {
    setShowTimePicker(true);
  };

  const handleTimeSave = async () => {
    const newWindow: TimeWindow = { start: startTime, end: endTime };
    
    // Replace first time window or add new one
    if (timeWindows.length > 0) {
      const newWindows = [...timeWindows];
      newWindows[0] = newWindow;
      await setTimeWindows(newWindows);
    } else {
      await setTimeWindows([newWindow]);
    }
    
    setShowTimePicker(false);
  };

  const handleBreatheClick = () => {
    router.push('/breathe-settings');
  };

  return (
    <View style={styles.container}>
      {/* Left: Time Window */}
      <TouchableOpacity
        onPress={handleTimeClick}
        activeOpacity={0.7}
        style={styles.timeButtonContainer}
      >
        <View style={styles.timeButton}>
          <Text style={styles.timeText}>
            {formatTimeDisplay(startTime, endTime)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Right: Breathe with Apps */}
      <TouchableOpacity
        onPress={handleBreatheClick}
        activeOpacity={0.7}
        style={styles.breatheButtonContainer}
      >
        <LinearGradient
          colors={['rgba(0, 50, 60, 0.95)', 'rgba(60, 30, 20, 0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.breatheButton}
        >
          <View style={styles.breatheButtonContent}>
            <Text style={styles.breatheText}>App</Text>
          </View>
          <View style={styles.plusButton}>
            <Text style={styles.plusButtonText}>+</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTimePicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Active Time Window</Text>

            <View style={styles.timeInputContainer}>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>Start Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>End Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="17:00"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleTimeSave}
              >
                <LinearGradient
                  colors={['#A8E6CF', '#D4EDF7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalSaveButtonGradient}
                >
                  <Text style={styles.modalSaveText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  timeButtonContainer: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  timeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  timeText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  breatheButtonContainer: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  breatheButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(40, 40, 40, 0.95)',
    gap: 12,
  },
  breatheButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breatheText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  appIconText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  moreAppsIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  moreAppsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addAppsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  plusButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(60, 60, 60, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  timeInputContainer: {
    marginBottom: 20,
  },
  timeInputGroup: {
    marginBottom: 16,
  },
  timeInputLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  timeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalCancelText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSaveButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
