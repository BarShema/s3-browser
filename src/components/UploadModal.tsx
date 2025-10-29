'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, Folder } from 'lucide-react';
import toast from 'react-hot-toast';
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      key: currentPath ? `${currentPath}/${file.name}` : file.name,
      status: 'pending',
      progress: 0,
    }));
    
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

      const response = await fetch('/api/s3', {
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
    
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    
    for (const file of pendingFiles) {
      await uploadFile(file);
    }
    
    setIsUploading(false);
    
    const completedCount = uploadFiles.filter(f => f.status === 'completed').length;
    if (completedCount > 0) {
      toast.success(`${completedCount} file(s) uploaded successfully`);
      onComplete();
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setUploadFiles([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Upload Files</h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className={clz(styles.closeButton, styles.actionButton)}
          >
            <X size={24} />
          </button>
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
            Cancel
          </button>
          <button
            onClick={startUpload}
            disabled={isUploading || uploadFiles.length === 0}
            className={styles.buttonSave}
            style={{ width: 'auto' }}
          >
            {isUploading ? 'Uploading...' : `Upload ${uploadFiles.length} File(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
