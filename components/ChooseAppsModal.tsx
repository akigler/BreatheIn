import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBreatheSettingsStore } from '../store/breatheSettingsStore';
import { AppInfo } from '../types/breatheSettings';
import { appInterceptionService } from '../services/appInterceptionService';

const APP_CATEGORIES = [
  { id: 'all', name: 'All Apps & Categories', icon: 'grid', color: '#00D4FF' },
  { id: 'social', name: 'Social', icon: 'chatbubbles', color: '#FF006E' },
  { id: 'games', name: 'Games', icon: 'game-controller', color: '#00D4FF' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#FF3B30' },
  { id: 'productivity', name: 'Productivity & Finance', icon: 'briefcase', color: '#00D4FF' },
  { id: 'shopping', name: 'Shopping & Food', icon: 'bag', color: '#00D4FF' },
  { id: 'education', name: 'Education', icon: 'school', color: '#00D4FF' },
  { id: 'health', name: 'Health & Fitness', icon: 'fitness', color: '#00D4FF' },
  { id: 'reading', name: 'Information & Reading', icon: 'book', color: '#00D4FF' },
  { id: 'other', name: 'Other', icon: 'apps', color: 'rgba(255,255,255,0.6)' },
];

// Map package id or app name to category so lists aren't empty (plugin returns "other" for all)
function categoryForApp(app: AppInfo): string {
  const cat = app.category && app.category !== 'other' ? app.category : null;
  if (cat) return cat;
  const id = (app.id || '').toLowerCase();
  const name = (app.name || '').toLowerCase();
  const s = id + ' ' + name;
  if (/\b(instagram|twitter|x\.android|facebook|tiktok|snapchat|linkedin|discord|reddit|whatsapp|telegram|threads)\b/.test(s)) return 'social';
  if (/\b(game|play\.google\.games)\b/.test(s)) return 'games';
  if (/\b(netflix|youtube|spotify|hulu|twitch|prime video)\b/.test(s)) return 'entertainment';
  if (/\b(amazon|uber|doordash|instacart|target|walmart|grubhub)\b/.test(s)) return 'shopping';
  if (/\b(gmail|calendar|drive|docs|slack|notion|outlook|bank|chase|venmo)\b/.test(s)) return 'productivity';
  if (/\b(duolingo|course|learn|edx|khan)\b/.test(s)) return 'education';
  if (/\b(fitness|health|meditation|peloton|strava)\b/.test(s)) return 'health';
  if (/\b(reader|kindle|news|medium)\b/.test(s)) return 'reading';
  return 'other';
}

interface ChooseAppsModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (apps: AppInfo[]) => void;
}

export function ChooseAppsModal({ visible, onClose, onSave }: ChooseAppsModalProps) {
  const { selectedApps } = useBreatheSettingsStore();
  const [installedApps, setInstalledApps] = useState<AppInfo[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAccessibility, setHasAccessibility] = useState<boolean | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedAppIds(new Set(selectedApps.map((app) => app.id)));
      loadApps();
      if (Platform.OS === 'android') {
        appInterceptionService.hasPermissions().then(setHasAccessibility);
      } else {
        setHasAccessibility(true);
      }
    }
  }, [visible, selectedApps]);

  // When user returns from Settings (e.g. after turning on Accessibility), re-check and reload
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        appInterceptionService.hasPermissions().then(setHasAccessibility);
        loadApps();
      }
    });
    return () => subscription.remove();
  }, [visible]);

  const loadApps = async () => {
    setLoading(true);
    try {
      const apps = await appInterceptionService.getInstalledApps();
      setInstalledApps(apps);
      if (Platform.OS === 'android') {
        const has = await appInterceptionService.hasPermissions();
        setHasAccessibility(has);
      }
    } catch (err) {
      console.error('Error loading installed apps:', err);
      setInstalledApps([]);
      if (Platform.OS === 'android') setHasAccessibility(false);
    } finally {
      setLoading(false);
    }
  };

  // Only show "need access" when accessibility is actually off (not when list is empty)
  const needsAccess = Platform.OS === 'android' && hasAccessibility === false;

  const toggleApp = (app: AppInfo) => {
    const next = new Set(selectedAppIds);
    if (next.has(app.id)) next.delete(app.id);
    else next.add(app.id);
    setSelectedAppIds(next);
  };

  const toggleCategory = (categoryId: string) => {
    const next = new Set(expandedCategories);
    if (next.has(categoryId)) next.delete(categoryId);
    else next.add(categoryId);
    setExpandedCategories(next);
  };

  const getCategoryApps = (categoryId: string) => {
    if (categoryId === 'all') return installedApps;
    return installedApps.filter((app) => categoryForApp(app) === categoryId);
  };

  const getCategorySelectedCount = (categoryId: string) => {
    return getCategoryApps(categoryId).filter((app) => selectedAppIds.has(app.id)).length;
  };

  const filteredBySearch = (apps: AppInfo[]) => {
    if (!searchQuery.trim()) return apps;
    const q = searchQuery.toLowerCase();
    return apps.filter((app) => app.name.toLowerCase().includes(q));
  };

  const handleSave = () => {
    const appsToSave = installedApps.filter((app) => selectedAppIds.has(app.id));
    onSave(appsToSave);
    onClose();
  };

  const selectedCount = selectedAppIds.size;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.grabBar} />

          <Text style={styles.instruction}>
            Select apps/websites, tap "›" to expand
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#00D4FF" />
              <Text style={styles.loadingText}>Loading apps from your phone...</Text>
            </View>
          ) : needsAccess ? (
            <>
              <View style={styles.needAccessCard}>
                <Ionicons name="warning" size={32} color="#FFB800" style={styles.needAccessIcon} />
                <Text style={styles.needAccessTitle}>Give access to see all your apps</Text>
                <Text style={styles.needAccessText}>
                  Breathe In needs to be enabled in Accessibility so it can see your installed apps and show a breathing moment when you open them.
                </Text>
                <TouchableOpacity
                  style={styles.needAccessButton}
                  onPress={() => appInterceptionService.requestPermissions()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.needAccessButtonText}>Open Accessibility Settings</Text>
                </TouchableOpacity>
                <Text style={styles.needAccessSteps}>
                  In the next screen, find "Breathe In" and turn it On.
                </Text>
                <TouchableOpacity
                  style={styles.refreshAccessButton}
                  onPress={async () => {
                    const has = await appInterceptionService.hasPermissions();
                    setHasAccessibility(has);
                    await loadApps();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={18} color="#00FFB8" style={styles.refreshAccessButtonIcon} />
                  <Text style={styles.refreshAccessButtonText}>I've enabled it — refresh</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.cancelButtonStandalone} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={20} color="rgba(255,255,255,0.6)" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {APP_CATEGORIES.map((category) => {
                  const categoryApps = getCategoryApps(category.id);
                  const filtered = filteredBySearch(categoryApps);
                  if (filtered.length === 0) return null;

                  const isExpanded = expandedCategories.has(category.id);
                  const selectedInCategory = getCategorySelectedCount(category.id);

                  return (
                    <View key={category.id} style={styles.categoryBlock}>
                      <TouchableOpacity
                        style={styles.categoryRow}
                        onPress={() => toggleCategory(category.id)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.categoryIconWrap,
                            { backgroundColor: `${category.color}20` },
                          ]}
                        >
                          <Ionicons
                            name={category.icon as any}
                            size={20}
                            color={category.color}
                          />
                        </View>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        {selectedInCategory > 0 && (
                          <Text style={styles.categoryCount}>{selectedInCategory}</Text>
                        )}
                        <Ionicons
                          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                          size={20}
                          color="rgba(255,255,255,0.6)"
                        />
                      </TouchableOpacity>

                      {isExpanded &&
                        filtered.map((app) => {
                          const isSelected = selectedAppIds.has(app.id);
                          return (
                            <TouchableOpacity
                              key={app.id}
                              style={styles.appRow}
                              onPress={() => toggleApp(app)}
                              activeOpacity={0.7}
                            >
                              <View
                                style={[
                                  styles.checkbox,
                                  isSelected && styles.checkboxSelected,
                                ]}
                              >
                                {isSelected && (
                                  <Ionicons name="checkmark" size={16} color="#fff" />
                                )}
                              </View>
                              <View style={styles.appIconPlaceholder}>
                                <Text style={styles.appIconText}>
                                  {app.name.charAt(0)}
                                </Text>
                              </View>
                              <Text style={styles.appName}>{app.name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.footer}>
                <Text style={styles.selectedLabel}>
                  {selectedCount} {selectedCount === 1 ? 'APP' : 'APPS'} SELECTED
                </Text>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  grabBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  instruction: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 4,
  },
  scroll: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 12,
  },
  categoryBlock: {
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  categoryCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginRight: 8,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginLeft: 12,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: '#00D4FF',
    borderColor: '#00D4FF',
  },
  appIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
    marginTop: 8,
  },
  selectedLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  saveButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  needAccessCard: {
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  needAccessIcon: {
    marginBottom: 12,
  },
  needAccessTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  needAccessText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
    marginBottom: 16,
  },
  needAccessButton: {
    backgroundColor: '#00FFB8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  needAccessButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  needAccessSteps: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
  },
  refreshAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 184, 0.4)',
    borderRadius: 12,
  },
  refreshAccessButtonIcon: {
    marginRight: 8,
  },
  refreshAccessButtonText: {
    color: '#00FFB8',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButtonStandalone: {
    paddingVertical: 14,
    alignItems: 'center',
  },
});
