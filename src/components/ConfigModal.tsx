"use client";

import React, { useState, useEffect } from "react";
import configStyles from "./configModal.module.css";
import styles from "./modal.module.css";

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bucket: string) => void;
  initialBucket?: string;
}

export function ConfigModal({
  isOpen,
  onClose,
  onSave,
  initialBucket = "",
}: ConfigModalProps) {
  const [bucket, setBucket] = useState(initialBucket);

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
    if (bucket.trim()) {
      onSave(bucket.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={configStyles.modalContent}>
          <h2 className={configStyles.title}>Configure S3 Bucket</h2>

          <form onSubmit={handleSubmit}>
            <div className={configStyles.formField}>
              <label htmlFor="bucket" className={configStyles.label}>
                S3 Bucket Name
              </label>
              <input
                type="text"
                id="bucket"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                className={configStyles.input}
                placeholder="Enter your S3 bucket name"
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
                <div>AWS_REGION (optional, defaults to eu-west-1)</div>
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
