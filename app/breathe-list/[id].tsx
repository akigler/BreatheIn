import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBreatheSettingsStore } from '../../store/breatheSettingsStore';
import { AppInfo } from '../../types/breatheSettings';
import { appInterceptionService } from '../../services/appInterceptionService';

export default function BreatheListEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    breatheLists,
    updateBreatheList,
    loadSettings,
  } = useBreatheSettingsStore();

  const [listName, setListName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [showAddApps, setShowAddApps] = useState(false);
  const [installedApps, setInstalledApps] = useState<AppInfo[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    loadSettings();
    loadInstalledApps();
  }, []);

  useEffect(() => {
    const list = breatheLists.find(l => l.id === id);
    if (list) {
      setListName(list.name);
      setSelectedAppIds(new Set(list.apps.map(app => app.id)));
    }
  }, [id, breatheLists]);

  const loadInstalledApps = async () => {
    try {
      setLoadingApps(true);
      const apps = await appInterceptionService.getInstalledApps();
      setInstalledApps(apps);
    } catch (error) {
      console.error('Error loading installed apps:', error);
      // Fallback to empty array
      setInstalledApps([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const currentList = breatheLists.find(l => l.id === id);

  const handleSaveName = async () => {
    if (!listName.trim()) {
      Alert.alert('Error', 'List name cannot be empty');
      return;
    }
    if (currentList) {
      await updateBreatheList(id, { name: listName.trim() });
      setIsEditingName(false);
    }
  };

  const handleToggleApp = (appId: string) => {
    const newSelected = new Set(selectedAppIds);
    if (newSelected.has(appId)) {
      newSelected.delete(appId);
    } else {
      newSelected.add(appId);
    }
    setSelectedAppIds(newSelected);
  };

  const handleSaveApps = async () => {
    if (currentList) {
      const selectedApps = installedApps.filter(app => selectedAppIds.has(app.id));
      await updateBreatheList(id, { apps: selectedApps });
      setShowAddApps(false);
    }
  };

  const handleRemoveApp = async (appId: string) => {
    const newSelected = new Set(selectedAppIds);
    newSelected.delete(appId);
    setSelectedAppIds(newSelected);
    if (currentList) {
      const selectedApps = installedApps.filter(app => newSelected.has(app.id));
      await updateBreatheList(id, { apps: selectedApps });
    }
  };

  const handleDeleteList = async () => {
    Alert.alert(
      'Delete Breathe List?',
      `Are you sure you want to delete "${listName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await useBreatheSettingsStore.getState().removeBreatheList(id);
            router.back();
          },
        },
      ]
    );
  };

  if (!currentList) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>List not found</Text>
      </View>
    );
  }

  const selectedApps = installedApps.filter(app => selectedAppIds.has(app.id));
  const availableApps = installedApps.filter(app => !selectedAppIds.has(app.id));

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            {isEditingName ? (
              <TextInput
                style={styles.titleInput}
                value={listName}
                onChangeText={setListName}
                onBlur={handleSaveName}
                onSubmitEditing={handleSaveName}
                autoFocus
                selectTextOnFocus
              />
            ) : (
              <View style={styles.titleRow}>
                <Ionicons name="stop-circle" size={24} color="#FF006E" />
                <Text style={styles.title}>{listName}</Text>
                <TouchableOpacity
                  onPress={() => setIsEditingName(true)}
                  style={styles.editNameButton}
                >
                  <Ionicons name="pencil" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.placeholder} />
        </View>

        <Text style={styles.description}>
          Breathe List: only these apps will trigger breathing during your session.
        </Text>

        {/* Apps Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="grid" size={20} color="#fff" style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Apps</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            {selectedApps.length}/{installedApps.length} apps
          </Text>
          <TouchableOpacity
            style={styles.addRemoveButton}
            onPress={() => setShowAddApps(true)}
          >
            <Text style={styles.addRemoveButtonText}>Add / Remove</Text>
          </TouchableOpacity>

          {selectedApps.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No apps selected</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap "Add / Remove" to select apps
              </Text>
            </View>
          ) : (
            <View style={styles.appsList}>
              {selectedApps.map((app) => (
                <View key={app.id} style={styles.appItem}>
                  <View style={styles.appIconPlaceholder}>
                    <Text style={styles.appIconText}>{app.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.appName}>{app.name}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveApp(app.id)}
                    style={styles.removeAppButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteList}>
          <Text style={styles.deleteButtonText}>Delete Breathe List</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Apps Modal */}
      {showAddApps && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add / Remove Apps</Text>
              <TouchableOpacity
                onPress={() => setShowAddApps(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {loadingApps ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#00D4FF" />
                  <Text style={styles.loadingText}>Loading apps...</Text>
                </View>
              ) : (
                <>
                  {/* Selected Apps */}
                  {selectedApps.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Selected ({selectedApps.length})</Text>
                  {selectedApps.map((app) => (
                    <TouchableOpacity
                      key={app.id}
                      style={styles.modalAppItem}
                      onPress={() => handleToggleApp(app.id)}
                    >
                      <View
                        style={[
                          styles.modalCheckbox,
                          styles.modalCheckboxSelected,
                        ]}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                      <View style={styles.modalAppIconPlaceholder}>
                        <Text style={styles.modalAppIconText}>
                          {app.name.charAt(0)}
                        </Text>
                      </View>
                      <Text style={styles.modalAppName}>{app.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Available Apps */}
              {availableApps.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    Available ({availableApps.length})
                  </Text>
                  {availableApps.map((app) => (
                    <TouchableOpacity
                      key={app.id}
                      style={styles.modalAppItem}
                      onPress={() => handleToggleApp(app.id)}
                    >
                      <View style={styles.modalCheckbox} />
                      <View style={styles.modalAppIconPlaceholder}>
                        <Text style={styles.modalAppIconText}>
                          {app.name.charAt(0)}
                        </Text>
                      </View>
                      <Text style={styles.modalAppName}>{app.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddApps(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveApps}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#00FFB8',
    paddingBottom: 4,
    minWidth: 200,
  },
  editNameButton: {
    padding: 4,
    marginLeft: 8,
  },
  placeholder: {
    width: 40,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
  },
  addRemoveButton: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  addRemoveButtonText: {
    color: '#00D4FF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 14,
  },
  appsList: {
    gap: 12,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  appIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    flex: 1,
  },
  removeAppButton: {
    padding: 4,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalAppItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
  },
  modalCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalCheckboxSelected: {
    backgroundColor: '#00D4FF',
    borderColor: '#00D4FF',
  },
  modalAppIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalAppIconText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalAppName: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: '#00FFB8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  modalSaveText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginTop: 16,
  },
});
