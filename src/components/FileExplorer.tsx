'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileList } from '@/components/FileList';
import { FileGrid } from '@/components/FileGrid';
import { FilePreview } from '@/components/FilePreview';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Toolbar } from '@/components/Toolbar';
import { UploadModal } from '@/components/UploadModal';
import { EditModal } from '@/components/EditModal';
import { FileItem, DirectoryItem, ViewMode } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FileExplorerProps {
  bucketName: string;
}

export function FileExplorer({ bucketName }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const loadFiles = useCallback(async (path: string = '') => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/s3?bucket=${bucketName}&prefix=${path}`);
      if (!response.ok) {
        throw new Error('Failed to load files');
      }
      
      const data = await response.json();
      
      // Convert S3 objects to our item types
      const fileItems = data.files.map((file: any) => ({
        ...file,
        id: Math.random().toString(36).substr(2, 9),
      }));
      
      const directoryItems = data.directories.map((dir: any) => ({
        ...dir,
        id: Math.random().toString(36).substr(2, 9),
      }));
      
      setFiles(fileItems);
      setDirectories(directoryItems);
      setSelectedItems([]);
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [bucketName]);

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath, loadFiles]);

  const handleDirectoryClick = (directory: DirectoryItem) => {
    const newPath = directory.key;
    setCurrentPath(newPath);
  };

  const handleBreadcrumbClick = (path: string) => {
    setCurrentPath(path);
  };

  const handleFileDoubleClick = (file: FileItem) => {
    if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json')) {
      setEditingFile(file);
      setIsEditModalOpen(true);
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (isImage(file.name) || isVideo(file.name)) {
      setPreviewFile(file);
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const response = await fetch(`/api/s3/download?bucket=${bucketName}&key=${file.key}`);
      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }
      
      const data = await response.json();
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/s3?bucket=${bucketName}&key=${file.key}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete file');
      }
      
      toast.success('File deleted successfully');
      loadFiles(currentPath);
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleRename = async (file: FileItem, newName: string) => {
    if (newName === file.name) return;

    const newKey = currentPath ? `${currentPath}/${newName}` : newName;
    
    try {
      const response = await fetch('/api/s3', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucket: bucketName,
          oldKey: file.key,
          newKey: newKey,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to rename file');
      }
      
      toast.success('File renamed successfully');
      loadFiles(currentPath);
    } catch (error) {
      console.error('Error renaming file:', error);
      toast.error('Failed to rename file');
    }
  };

  const handleUploadComplete = () => {
    loadFiles(currentPath);
    setIsUploadModalOpen(false);
  };

  const handleEditComplete = () => {
    loadFiles(currentPath);
    setIsEditModalOpen(false);
    setEditingFile(null);
  };

  const handleClosePreview = () => {
    setPreviewFile(null);
  };

  const allItems = [...directories, ...files];

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onUpload={() => setIsUploadModalOpen(true)}
        selectedCount={selectedItems.length}
        onDelete={() => {
          const selectedFiles = files.filter(f => selectedItems.includes(f.id));
          selectedFiles.forEach(handleDelete);
        }}
      />

      <Breadcrumb
        currentPath={currentPath}
        onPathClick={handleBreadcrumbClick}
      />

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : (
          <>
            {viewMode === 'list' && (
              <FileList
                items={allItems}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
                onDirectoryClick={handleDirectoryClick}
                onFileClick={handleFileClick}
                onFileDoubleClick={handleFileDoubleClick}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            )}
            
            {viewMode === 'grid' && (
              <FileGrid
                items={allItems}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
                onDirectoryClick={handleDirectoryClick}
                onFileClick={handleFileClick}
                onFileDoubleClick={handleFileDoubleClick}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            )}
            
            {viewMode === 'preview' && (
              <FilePreview
                items={allItems}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
                onDirectoryClick={handleDirectoryClick}
                onFileClick={handleFileClick}
                onFileDoubleClick={handleFileDoubleClick}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            )}
          </>
        )}
      </div>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onComplete={handleUploadComplete}
        bucketName={bucketName}
        currentPath={currentPath}
      />

      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onComplete={handleEditComplete}
        file={editingFile}
        bucketName={bucketName}
      />

      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{previewFile.name}</h3>
              <button
                onClick={handleClosePreview}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {isImage(previewFile.name) && (
              <img
                src={`/api/s3/download?bucket=${bucketName}&key=${previewFile.key}`}
                alt={previewFile.name}
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
            {isVideo(previewFile.name) && (
              <video
                controls
                className="max-w-full max-h-[70vh]"
              >
                <source
                  src={`/api/s3/download?bucket=${bucketName}&key=${previewFile.key}`}
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function isImage(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff'];
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return imageExtensions.includes(extension);
}

function isVideo(filename: string): boolean {
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'];
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return videoExtensions.includes(extension);
}
