"use client";

import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import toast from "react-hot-toast";

import { api } from "@/lib/api";
import { clz } from "@/lib/clz";
import { FileItem } from "@/lib/utils";
import styles from "./modal.module.css";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  file: FileItem | null;
  driveName: string;
}

export function EditModal({
  isOpen,
  onClose,
  onComplete,
  file,
  driveName,
}: EditModalProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    if (isOpen && file) {
      loadFileContent();
    }
  }, [isOpen, file]);

  const loadFileContent = async () => {
    if (!file) return;

    setIsLoading(true);
    try {
      const data = await api.drive.file.getContent({
        path: `${driveName}/${file.key}`,
      });
      setContent(data.content);
    } catch (error) {
      toast.error("Failed to load file content");
    } finally {
      setIsLoading(false);
    }
  };

  const saveFile = async () => {
    if (!file) return;

    setIsSaving(true);
    try {
      await api.drive.file.saveContent({
        drive: driveName,
        key: file.key,
        content: content,
        contentType: "text/plain",
      });

      toast.success("File saved successfully");
      onComplete();
    } catch (error) {
      toast.error("Failed to save file");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setContent("");
      onClose();
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${styles.modalLarge}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit: {file.name}</h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className={clz(styles.closeButton, styles.actionButton)}
          >
            <X size={24} />
          </button>
        </div>

        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.loader}>
              <div className={styles.spinner}></div>
              <span className={styles.loadingText}>
                Loading file content...
              </span>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={styles.textarea}
              placeholder="File content will appear here..."
            />
          )}
        </div>

        <div className={styles.footer}>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className={styles.buttonCancel}
          >
            Cancel
          </button>
          <button
            onClick={saveFile}
            disabled={isSaving || isLoading}
            className={styles.buttonSave}
          >
            <Save size={16} />
            <span>{isSaving ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
