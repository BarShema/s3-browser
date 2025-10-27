'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, Folder } from 'lucide-react';
import toast from 'react-hot-toast';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upload Files</h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
            </p>
            <p className="text-sm text-gray-500">
              Upload to: {currentPath || 'Root'}
            </p>
          </div>

          {/* File List */}
          {uploadFiles.length > 0 && (
            <div className="mt-6 flex-1 overflow-auto">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Files to Upload</h3>
              <div className="space-y-2">
                {uploadFiles.map((uploadFile, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <File size={20} className="text-gray-500" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {uploadFile.file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      
                      {uploadFile.status === 'uploading' && (
                        <div className="mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadFile.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {uploadFile.status === 'completed' && (
                        <div className="text-xs text-green-600 mt-1">✓ Uploaded</div>
                      )}
                      
                      {uploadFile.status === 'error' && (
                        <div className="text-xs text-red-600 mt-1">
                          ✗ {uploadFile.error}
                        </div>
                      )}
                    </div>
                    
                    {uploadFile.status === 'pending' && (
                      <button
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-red-600"
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
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={startUpload}
            disabled={isUploading || uploadFiles.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : `Upload ${uploadFiles.length} File(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
