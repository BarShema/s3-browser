"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import {
  getPreferences,
  savePreferences,
  type UserPreferences,
} from "@/lib/preferences";
import type { SettingsModalProps } from "@/types";
import styles from "./settingsModal.module.css";

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(
    getPreferences()
  );

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setPreferences(getPreferences());
    }
  }, [isOpen]);

  const handleToggle = (key: keyof UserPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
    toast.success("Setting updated");
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Safety</h3>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <label className={styles.settingLabel}>
                  Delete Protection
                </label>
                <p className={styles.settingDescription}>
                  When enabled, you'll need to disable this setting before
                  deleting files to prevent accidental deletions.
                </p>
              </div>
              <div className={styles.switchContainer}>
                <input
                  type="checkbox"
                  id="deleteProtection"
                  className={styles.switch}
                  checked={preferences.deleteProtection}
                  onChange={(e) =>
                    handleToggle("deleteProtection", e.target.checked)
                  }
                />
                <label
                  htmlFor="deleteProtection"
                  className={`${styles.switchLabel} ${
                    preferences.deleteProtection ? styles.switchOn : ""
                  }`}
                >
                  <span className={styles.switchSlider}></span>
                </label>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>View</h3>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <label className={styles.settingLabel}>View Mode</label>
                <p className={styles.settingDescription}>
                  When enabled, the app shows data only (no edit/rename/delete UI).
                </p>
              </div>
              <div className={styles.switchContainer}>
                <input
                  type="checkbox"
                  id="viewMode"
                  className={styles.switch}
                  checked={preferences.viewMode}
                  onChange={(e) => handleToggle("viewMode", e.target.checked)}
                />
                <label
                  htmlFor="viewMode"
                  className={`${styles.switchLabel} ${
                    preferences.viewMode ? styles.switchOn : ""
                  }`}
                >
                  <span className={styles.switchSlider}></span>
                </label>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

