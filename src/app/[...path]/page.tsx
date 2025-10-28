"use client";

import styles from "@/app/home.module.css";
import { AuthGuard } from "@/components/AuthGuard";
import { FileExplorer } from "@/components/FileExplorer";
import { ThemeSelector } from "@/components/ThemeSelector";
import { driveConfig } from "@/config/drives";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";

export default function Home() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();

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
              <div>
                <h1 className={styles.title}>Idit File Browser</h1>
                <p className={styles.subtitle}>
                  Browse, manage, and organize your S3 files with ease
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

              <div className={styles.userMenu}>
                <User size={18} style={{ color: "#6b7280" }} />
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user?.username}</span>
                  {user?.email && (
                    <span className={styles.userEmail}>{user.email}</span>
                  )}
                </div>
                <ThemeSelector />
                <button onClick={handleLogout} className={styles.logoutButton}>
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
        </div>
      </main>
    </AuthGuard>
  );
}
