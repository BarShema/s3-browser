"use client";

import { Settings } from "lucide-react";
import { useEffect } from "react";
import type { DeleteProtectionModalProps } from "@/types";
import styles from "./deleteProtectionModal.module.css";

export function DeleteProtectionModal({
  isOpen,
  onClose,
  onGoToSettings,
}: DeleteProtectionModalProps) {
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

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Delete Protection Active</h3>
        </div>

        <div className={styles.content}>
          <p className={styles.message}>
            Delete protection is on. To delete items please disable delete
            protection. Go to settings
          </p>
        </div>

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={onGoToSettings} className={styles.settingsButton}>
            <Settings size={16} />
            <span>Go to Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}

