'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, Minimize2, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api-client';
import styles from './modal.module.css';
import uploadStyles from './uploadModal.module.css';
import { clz } from '@/lib/clz';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  bucketName: string;
  currentPath: string;
}

interface UploadFile {
  file: File;
  key: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export function UploadModal({ isOpen, onClose, onComplete, bucketName, currentPath }: UploadModalProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const abortRequestedRef = useRef(false);

  // Warn on page close while uploading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    if (isUploading) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    } else {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUploading]);

  // Disable body scroll only when modal is open and not minimized
  useEffect(() => {
    if (isOpen && !isMinimized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen) {
      setIsMinimized(false);
    }
  }, [isOpen]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => {
      let relativeKey = file.name;
      // If directory dropped and browser gives relative path, preserve structure
      if (file.webkitRelativePath && file.webkitRelativePath !== "") {
        relativeKey = file.webkitRelativePath;
      }
      // Always join with currentPath if present
      const s3key = currentPath
        ? `${currentPath.replace(/\\/g, "/")}/${relativeKey.replace(/^[/.]+/, "")}`
        : relativeKey.replace(/^[/.]+/, "");
      return {
        file,
        key: s3key,
        status: 'pending',
        progress: 0,
      };
    });
    setUploadFiles(prev => [...prev, ...newFiles]);
  }, [currentPath]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      setUploadFiles(prev => prev.map(f => 
        f.key === uploadFile.key ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('bucket', bucketName);
      formData.append('key', uploadFile.key);

      const response = await apiFetch('/api/s3', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setUploadFiles(prev => prev.map(f => 
        f.key === uploadFile.key ? { ...f, status: 'completed', progress: 100 } : f
      ));
    } catch (error) {
      console.error('Upload error:', error);
      setUploadFiles(prev => prev.map(f => 
        f.key === uploadFile.key ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        } : f
      ));
    }
  };

  const startUpload = async () => {
    setIsUploading(true);
    abortRequestedRef.current = false;

    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');

    for (const file of pendingFiles) {
      if (abortRequestedRef.current) break;
      await uploadFile(file);
    }

    setIsUploading(false);

    const completedCount = (prev => prev.filter(f => f.status === 'completed').length)(uploadFiles);
    if (completedCount > 0) {
      toast.success(`${completedCount} file(s) uploaded successfully`);
      onComplete();
    }
  };

  const stopUpload = () => {
    abortRequestedRef.current = true;
  };

  const allDone = uploadFiles.length > 0 && uploadFiles.every(f => f.status === 'completed' || f.status === 'error');

  const handleClose = () => {
    if (!isUploading) {
      setUploadFiles([]);
      setIsMinimized(false);
      onClose();
    }
  };

  if (!isOpen && !isMinimized) return null;

  // Overall progress percent
  const overallProgress = uploadFiles.length
    ? Math.round(
        (uploadFiles.reduce((acc, f) => acc + (f.progress || (f.status === 'completed' ? 100 : f.status === 'uploading' ? 0 : 0)), 0) /
          (uploadFiles.length * 100)) * 100
      )
    : 0;

  // Minimized status bar (non-blocking)
  if (isOpen && isMinimized) {
    const total = uploadFiles.length;
    const completed = uploadFiles.filter(f => f.status === 'completed').length;
    const uploading = uploadFiles.filter(f => f.status === 'uploading').length;
    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 2000,
          background: 'var(--theme-bg-primary)',
          border: '1px solid var(--theme-border-primary)',
          borderRadius: 8,
          boxShadow: 'var(--theme-shadow-lg)',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          minWidth: 260,
        }}
        title="Click to open uploader"
      >
        <Upload size={16} />
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--theme-text-secondary)', fontSize: 12, marginBottom: 6 }}>
            {completed}/{total} completed {uploading ? `(uploading ${uploading})` : ''}
          </div>
          <div style={{
            position: 'relative',
            height: 6,
            background: 'var(--theme-bg-tertiary)',
            borderRadius: 999,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${overallProgress}%`,
              background: 'var(--theme-accent-primary)',
              transition: 'width 0.2s ease',
            }} />
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
          title="Restore"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6,
            border: '1px solid var(--theme-border-secondary)',
            background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-secondary)'
          }}
        >
          <Maximize2 size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleClose(); }}
          disabled={isUploading}
          title={isUploading ? 'Uploading in progress' : 'Close'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6,
            border: '1px solid var(--theme-border-secondary)',
            background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-secondary)'
          }}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Upload Files</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setIsMinimized(true)}
              className={clz(styles.closeButton, styles.actionButton)}
              title="Minimize"
            >
              <Minimize2 size={20} />
            </button>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className={clz(styles.closeButton, styles.actionButton)}
              title={isUploading ? 'Uploading in progress' : 'Close'}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className={styles.flexContainer}>
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`${uploadStyles.dropzone} ${isDragActive ? uploadStyles.active : ''}`}
          >
            <input {...getInputProps()} />
            <Upload size={48} className={uploadStyles.uploadIcon} />
            <p className={uploadStyles.dropzoneText}>
              {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
            </p>
            <p className={uploadStyles.pathHint}>
              Upload to: {currentPath || bucketName}
            </p>
          </div>

          {/* File List */}
          {uploadFiles.length > 0 && (
            <div className={uploadStyles.fileList}>
              <h3 className={uploadStyles.fileListTitle}>Files to Upload</h3>
              <div>
                {uploadFiles.map((uploadFile, index) => (
                  <div key={index} className={uploadStyles.fileListItem}>
                    <File size={20} className={uploadStyles.fileIcon} />
                    
                    <div className={uploadStyles.fileInfo}>
                      <div className={uploadStyles.fileName}>
                        {uploadFile.file.name}
                      </div>
                      <div className={uploadStyles.fileSize}>
                        {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      
                      {uploadFile.status === 'uploading' && (
                        <div className={uploadStyles.progressContainer}>
                          <div className={uploadStyles.progressBar}>
                            <div 
                              className={uploadStyles.progressFill}
                              style={{ width: `${uploadFile.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {uploadFile.status === 'completed' && (
                        <div className={uploadStyles.statusSuccess}>✓ Uploaded</div>
                      )}
                      
                      {uploadFile.status === 'error' && (
                        <div className={uploadStyles.statusError}>
                          ✗ {uploadFile.error}
                        </div>
                      )}
                    </div>
                    
                    {uploadFile.status === 'pending' && (
                      <button
                        onClick={() => removeFile(index)}
                        className={uploadStyles.removeButton}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.footer}>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className={styles.buttonCancel}
          >
            {allDone ? 'Close' : 'Cancel'}
          </button>
          {!isUploading ? (
            <button
              onClick={startUpload}
              disabled={uploadFiles.length === 0}
              className={styles.buttonSave}
              style={{ width: 'auto' }}
            >
              Upload {uploadFiles.length} File(s)
            </button>
          ) : (
            <button
              onClick={stopUpload}
              className={styles.buttonSave}
              style={{ width: 'auto', background: 'var(--theme-bg-quinary)', color: 'var(--theme-error)' }}
            >
              Stop upload
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
