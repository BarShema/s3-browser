"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DriveCard } from "@/components/DriveCard";
import { ThemeSelector } from "@/components/ThemeSelector";
import { SettingsModal } from "@/components/SettingsModal";
import { driveConfig } from "@/config/drives";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import styles from "./home.module.css";

export default function Home() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const drives = driveConfig.drives;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleDriveSelect = (drive: string) => {
    router.push(`/${drive}`);
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
                <ThemeSelector />
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className={styles.settingsButton}
                  title="Settings"
                >
                  <Settings size={16} />
                </button>
                <button onClick={handleLogout} className={styles.logoutButton}>
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          <div className={styles.driveSelectContainer}>
            <h2 className={styles.driveSelectTitle}>Select a Drive</h2>
            <div className={styles.driveGrid}>
              {drives.map((drive) => (
                <DriveCard
                  key={drive}
                  drive={drive}
                  onClick={() => handleDriveSelect(drive)}
                />
              ))}
            </div>
          </div>

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
