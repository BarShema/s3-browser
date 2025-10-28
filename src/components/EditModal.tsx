'use client';

import { useState, useEffect } from 'react';
import { FileItem } from '@/lib/utils';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './modal.module.css';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  file: FileItem | null;
  bucketName: string;
}

export function EditModal({ isOpen, onClose, onComplete, file, bucketName }: EditModalProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && file) {
      loadFileContent();
    }
  }, [isOpen, file]);

  const loadFileContent = async () => {
    if (!file) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/s3/content?path=${encodeURIComponent(`${bucketName}/${file.key}`)}`);
      if (!response.ok) {
        throw new Error('Failed to load file content');
      }
      
      const data = await response.json();
      setContent(data.content);
    } catch (error) {
      console.error('Error loading file content:', error);
      toast.error('Failed to load file content');
    } finally {
      setIsLoading(false);
    }
  };

  const saveFile = async () => {
    if (!file) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/s3/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucket: bucketName,
          key: file.key,
          content: content,
          contentType: 'text/plain',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save file');
      }
      
      toast.success('File saved successfully');
      onComplete();
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setContent('');
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
            className={styles.closeButton}
          >
            <X size={24} />
          </button>
        </div>

        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.loader}>
              <div className={styles.spinner}></div>
              <span className={styles.loadingText}>Loading file content...</span>
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
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
