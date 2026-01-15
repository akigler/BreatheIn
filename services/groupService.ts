import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';

export interface ContactGroup {
  id: string;
  name: string;
  contactIds: string[]; // Array of contact IDs
  createdAt: number;
}

const GROUPS_STORAGE_KEY = 'breathe_in_groups';

/**
 * Get all saved groups
 */
export const getGroups = async (): Promise<ContactGroup[]> => {
  try {
    const groupsJson = await AsyncStorage.getItem(GROUPS_STORAGE_KEY);
    if (!groupsJson) {
      return [];
    }
    return JSON.parse(groupsJson);
  } catch (error) {
    console.error('Error getting groups:', error);
    return [];
  }
};

/**
 * Save a group
 */
export const saveGroup = async (group: ContactGroup): Promise<void> => {
  try {
    const groups = await getGroups();
    const existingIndex = groups.findIndex(g => g.id === group.id);
    
    if (existingIndex >= 0) {
      groups[existingIndex] = group;
    } else {
      groups.push(group);
    }
    
    await AsyncStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch (error) {
    console.error('Error saving group:', error);
    throw error;
  }
};

/**
 * Create a new group
 */
export const createGroup = async (name: string, contactIds: string[]): Promise<ContactGroup> => {
  const group: ContactGroup = {
    id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    contactIds,
    createdAt: Date.now(),
  };
  
  await saveGroup(group);
  return group;
};

/**
 * Delete a group
 */
export const deleteGroup = async (groupId: string): Promise<void> => {
  try {
    const groups = await getGroups();
    const filtered = groups.filter(g => g.id !== groupId);
    await AsyncStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting group:', error);
    throw error;
  }
};

/**
 * Get contacts for a group
 */
export const getGroupContacts = async (group: ContactGroup, allContacts: Contacts.Contact[]): Promise<Contacts.Contact[]> => {
  const contactMap = new Map<string, Contacts.Contact>();
  allContacts.forEach(contact => {
    if (contact.id) {
      contactMap.set(contact.id, contact);
    }
  });
  
  return group.contactIds
    .map(id => contactMap.get(id))
    .filter((contact): contact is Contacts.Contact => contact !== undefined);
};

/**
 * Group service object for easier imports
 */
export const groupService = {
  getGroups,
  saveGroup,
  createGroup,
  deleteGroup,
  getGroupContacts,
};
