"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { BucketCard } from "@/components/BucketCard";
import { bucketConfig } from "@/config/buckets";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
import styles from "./home.module.css";

export default function Home() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const buckets = bucketConfig.buckets;

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
              </div>

              <div className={styles.userMenu}>
                <User size={18} style={{ color: "#6b7280" }} />
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user?.username}</span>
                  {user?.email && (
                    <span className={styles.userEmail}>{user.email}</span>
                  )}
                </div>
                <button onClick={handleLogout} className={styles.logoutButton}>
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          <div className={styles.bucketSelectContainer}>
            <h2 className={styles.bucketSelectTitle}>Select an S3 Bucket</h2>
            <div className={styles.bucketGrid}>
              {buckets.map((bucket) => (
                <BucketCard
                  key={bucket}
                  bucket={bucket}
                  onClick={() => handleBucketSelect(bucket)}
                />
              ))}
            </div>
          </div>

          <Toaster position="top-right" />
        </div>
      </main>
    </AuthGuard>
  );
}
