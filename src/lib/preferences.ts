/**
 * User preferences management using localStorage
 */

export interface UserPreferences {
  deleteProtection: boolean;
  viewMode: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  deleteProtection: true,
  viewMode: true,
};

const PREFERENCES_KEY = "idits-drive-preferences";

export function getPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Error loading preferences:", error);
  }

  return DEFAULT_PREFERENCES;
}

export function savePreferences(preferences: UserPreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error("Error saving preferences:", error);
  }
}

export function updatePreference<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): void {
  const preferences = getPreferences();
  preferences[key] = value;
  savePreferences(preferences);
}

export function isDeleteProtectionEnabled(): boolean {
  return getPreferences().deleteProtection;
}

export function isViewModeEnabled(): boolean {
  return getPreferences().viewMode;
}

