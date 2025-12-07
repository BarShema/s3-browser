"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DriveCard } from "@/components/DriveCard";
import { PageHeader } from "@/components/PageHeader";
import { SettingsModal } from "@/components/SettingsModal";
import { driveConfig } from "@/config/drives";
import { useAuth } from "@/contexts/AuthContext";
import { useDriveSelect, useLogout } from "@/hooks/useLogout";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import styles from "./home.module.css";

export default function Home() {
  const { user } = useAuth();
  const { handleLogout } = useLogout();
  const { handleDriveSelect } = useDriveSelect();
  const drives = driveConfig.drives;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <AuthGuard>
      <main className={styles.mainContainer}>
        <div className={styles.container}>
          <PageHeader
            driveName={""}
            user={user}
            handleLogout={handleLogout}
            setIsSettingsOpen={setIsSettingsOpen}
          />

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
