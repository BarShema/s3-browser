"use client";

import { useEffect, useState } from "react";

import configStyles from "./configModal.module.css";
import styles from "./modal.module.css";

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (drive: string) => void;
  initialDrive?: string;
}

export function ConfigModal({
  isOpen,
  onClose,
  onSave,
  initialDrive = "",
}: ConfigModalProps) {
  const [drive, setDrive] = useState(initialDrive);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (drive.trim()) {
      onSave(drive.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={configStyles.modalContent}>
          <h2 className={configStyles.title}>Configure Drive</h2>

          <form onSubmit={handleSubmit}>
            <div className={configStyles.formField}>
              <label htmlFor="drive" className={configStyles.label}>
                Drive Name
              </label>
              <input
                type="text"
                id="drive"
                value={drive}
                onChange={(e) => setDrive(e.target.value)}
                className={configStyles.input}
                placeholder="Enter your drive name"
                required
              />
            </div>

            <div className={configStyles.infoBox}>
              <h3 className={configStyles.infoTitle}>
                Environment Variables Required:
              </h3>
              <div className={configStyles.infoList}>
                <div>AWS_ACCESS_KEY_ID</div>
                <div>AWS_SECRET_ACCESS_KEY</div>
                <div>AWS_REGION (optional, defaults to us-east-1)</div>
              </div>
            </div>

            <div className={styles.footer}>
              <button
                type="button"
                onClick={onClose}
                className={styles.buttonCancel}
              >
                Cancel
              </button>
              <button type="submit" className={styles.buttonSave}>
                Save Configuration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
