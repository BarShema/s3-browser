"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DriveCard } from "@/components/DriveCard";
import { SettingsModal } from "@/components/SettingsModal";
import { UserMenu } from "@/components/UserMenu";
import { driveConfig } from "@/config/drives";
import { useAuth } from "@/contexts/AuthContext";
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
                </div>
              </div>

              <UserMenu
                user={user}
                onLogout={handleLogout}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
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
