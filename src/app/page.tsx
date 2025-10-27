'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileExplorer } from '@/components/FileExplorer';
import { ConfigModal } from '@/components/ConfigModal';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { LogOut, User, ChevronDown } from 'lucide-react';

export default function Home() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [bucketName, setBucketName] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if configuration exists in localStorage
    const savedBucket = localStorage.getItem('s3-bucket-name');
    if (savedBucket) {
      setBucketName(savedBucket);
      setIsConfigured(true);
    } else {
      setIsConfigOpen(true);
    }
  }, []);

  const handleConfigSave = (bucket: string) => {
    setBucketName(bucket);
    setIsConfigured(true);
    setIsConfigOpen(false);
    localStorage.setItem('s3-bucket-name', bucket);
  };

  const handleConfigChange = () => {
    setIsConfigOpen(true);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  S3 File Browser
                </h1>
                <p className="text-gray-600">
                  Browse, manage, and organize your S3 files with ease
                </p>
                {isConfigured && (
                  <div className="mt-4 flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      Bucket: <span className="font-medium text-gray-700">{bucketName}</span>
                    </span>
                    <button
                      onClick={handleConfigChange}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Change Configuration
                    </button>
                  </div>
                )}
              </div>
              
              {/* User Menu */}
              <div className="relative">
                <div className="flex items-center space-x-3 bg-white rounded-lg border border-gray-200 px-4 py-2 shadow-sm">
                  <User size={18} className="text-gray-500" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{user?.username}</span>
                    {user?.email && (
                      <span className="text-xs text-gray-500">{user.email}</span>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="ml-4 px-3 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors flex items-center space-x-2 text-sm"
                  >
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        {isConfigured ? (
          <FileExplorer bucketName={bucketName} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              Please configure your S3 bucket to get started
            </p>
            <button
              onClick={() => setIsConfigOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Configure S3 Bucket
            </button>
          </div>
        )}
      </div>

        <ConfigModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          onSave={handleConfigSave}
          initialBucket={bucketName}
        />

        <Toaster position="top-right" />
      </main>
    </AuthGuard>
  );
}