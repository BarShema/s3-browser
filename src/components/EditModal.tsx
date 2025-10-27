'use client';

import { useState, useEffect } from 'react';
import { FileItem } from '@/lib/utils';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

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
      const response = await fetch(`/api/s3/content?bucket=${bucketName}&key=${file.key}`);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Edit: {file.name}</h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading file content...</span>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full p-4 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="File content will appear here..."
            />
          )}
        </div>

        <div className="flex justify-end space-x-3 p-4 border-t">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={saveFile}
            disabled={isSaving || isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
