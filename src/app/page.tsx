"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { FileExplorer } from "@/components/FileExplorer";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";

export default function Home() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [bucketName, setBucketName] = useState("");
  const [buckets, setBuckets] = useState<string[]>([]);
  const [isLoadingBuckets, setIsLoadingBuckets] = useState(false);

  useEffect(() => {
    const loadBuckets = async () => {
      setIsLoadingBuckets(true);
      try {
        const response = await fetch("/api/s3/buckets");
        if (!response.ok) {
          throw new Error("Failed to load buckets");
        }
        const data = await response.json();
        setBuckets(data.buckets.map((b: { name: string }) => b.name));
      } catch (error) {
        console.error("Error loading buckets:", error);
        toast.error("Failed to load S3 buckets");
      } finally {
        setIsLoadingBuckets(false);
      }
    };

    loadBuckets();
  }, []);

  useEffect(() => {
    const savedBucket = localStorage.getItem("s3-bucket-name");
    if (savedBucket) {
      setBucketName(savedBucket);
    }
  }, []);

  const handleBucketSelect = (bucket: string) => {
    setBucketName(bucket);
    localStorage.setItem("s3-bucket-name", bucket);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
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
                {bucketName && (
                  <div className="mt-4 flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      Current Bucket:{" "}
                      <span className="font-medium text-gray-700">
                        {bucketName}
                      </span>
                    </span>
                    <button
                      onClick={() => setBucketName("")}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Change Bucket
                    </button>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <div className="flex items-center space-x-3 bg-white rounded-lg border border-gray-200 px-4 py-2 shadow-sm">
                  <User size={18} className="text-gray-500" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {user?.username}
                    </span>
                    {user?.email && (
                      <span className="text-xs text-gray-500">
                        {user.email}
                      </span>
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

        {bucketName ? (
          <FileExplorer bucketName={bucketName} />
        ) : (
          <div className="py-12">
            {isLoadingBuckets ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading buckets...</p>
              </div>
            ) : buckets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No S3 buckets available</p>
                <p className="text-sm text-gray-400">
                  Please ensure your AWS credentials are configured correctly
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Select an S3 Bucket
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {buckets.map((bucket) => (
                    <button
                      key={bucket}
                      onClick={() => handleBucketSelect(bucket)}
                      className="px-6 py-4 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {bucket}
                        </span>
                        <span className="text-blue-600">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <Toaster position="top-right" />
        </div>
      </main>
    </AuthGuard>
  );
}
