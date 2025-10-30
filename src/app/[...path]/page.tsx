"use client";

import styles from "@/app/home.module.css";
import { AuthGuard } from "@/components/AuthGuard";
import { FileExplorer } from "@/components/FileExplorer";
import { SettingsModal } from "@/components/SettingsModal";
import { UserMenu } from "@/components/UserMenu";
import { driveConfig } from "@/config/drives";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";

export default function Home() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Get bucket name from URL path
  const bucketName = Array.isArray(params.path)
    ? params.path[0] || ""
    : params.path || "";

  const buckets = driveConfig.drives;

  const handleBucketSelect = (bucket: string) => {
    router.push(`/${bucket}`);
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
              <div className={styles.headerLeft}>
                <div>
                  <h1 className={styles.title}>
                    {/* <img
                      src="/logo.svg"
                      alt="Idit File Browser Logo"
                      className={styles.logo}
                    /> */}
                    Idit File Browser
                  </h1>

                  <p className={styles.subtitle}>
                    Browse, manage, and organize your files with ease
                  </p>
                  {bucketName && (
                    <div className={styles.bucketInfo}>
                      <span className={styles.bucketLabel}>
                        Current Drive:{" "}
                        <span className={styles.bucketName}>{bucketName}</span>
                        <Link href="/" className={styles.changeBucket}>
                          Change
                        </Link>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <UserMenu
                user={user}
                onLogout={handleLogout}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </div>
          </div>

          {bucketName ? (
            <FileExplorer
              bucketName={bucketName}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          ) : (
            <div className={styles.bucketSelectContainer}>
              <h2 className={styles.bucketSelectTitle}>Select an S3 Bucket</h2>
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
            </div>
          )}

          <Toaster position="top-right" />
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        </div>
      </main>
    </AuthGuard>
  );
}
