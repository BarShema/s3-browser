"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { FileExplorer } from "@/components/FileExplorer";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import styles from "./home.module.css";

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
      <main className={styles.mainContainer}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <div>
                <h1 className={styles.title}>
                  S3 File Browser
                </h1>
                <p className={styles.subtitle}>
                  Browse, manage, and organize your S3 files with ease
                </p>
                {bucketName && (
                  <div className={styles.bucketInfo}>
                    <span className={styles.bucketLabel}>
                      Current Bucket: <span className={styles.bucketName}>{bucketName}</span>
                    </span>
                    <button
                      onClick={() => setBucketName("")}
                      className={styles.changeBucket}
                    >
                      Change Bucket
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.userMenu}>
                <User size={18} style={{ color: "#6b7280" }} />
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user?.username}</span>
                  {user?.email && (
                    <span className={styles.userEmail}>{user.email}</span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className={styles.logoutButton}
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

        {bucketName ? (
          <FileExplorer bucketName={bucketName} />
        ) : (
          <div className={styles.bucketSelectContainer}>
            {isLoadingBuckets ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p className={styles.loadingText}>Loading buckets...</p>
              </div>
            ) : buckets.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>No S3 buckets available</p>
                <p className={styles.emptySubtext}>
                  Please ensure your AWS credentials are configured correctly
                </p>
              </div>
            ) : (
              <>
                <h2 className={styles.bucketSelectTitle}>
                  Select an S3 Bucket
                </h2>
                <div className={styles.bucketGrid}>
                  {buckets.map((bucket) => (
                    <button
                      key={bucket}
                      onClick={() => handleBucketSelect(bucket)}
                      className={styles.bucketCard}
                    >
                      <span>{bucket}</span>
                      <span className={styles.bucketArrow}>→</span>
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
