'use client';

import { useState } from 'react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bucket: string) => void;
  initialBucket?: string;
}

export function ConfigModal({ isOpen, onClose, onSave, initialBucket = '' }: ConfigModalProps) {
  const [bucket, setBucket] = useState(initialBucket);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bucket.trim()) {
      onSave(bucket.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4">Configure S3 Bucket</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="bucket" className="block text-sm font-medium text-gray-700 mb-2">
              S3 Bucket Name
            </label>
            <input
              type="text"
              id="bucket"
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your S3 bucket name"
              required
            />
          </div>

          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Environment Variables Required:</h3>
              <div className="text-xs text-blue-700 space-y-1">
                <div>AWS_ACCESS_KEY_ID</div>
                <div>AWS_SECRET_ACCESS_KEY</div>
                <div>AWS_REGION (optional, defaults to us-east-1)</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
