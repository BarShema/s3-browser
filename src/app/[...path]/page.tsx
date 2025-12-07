"use client";

import styles from "@/app/home.module.css";
import { AuthGuard } from "@/components/AuthGuard";
import { DriveCard } from "@/components/DriveCard";
import { FileExplorer } from "@/components/FileExplorer";
import { PageHeader } from "@/components/pageHeader";
import { SettingsModal } from "@/components/SettingsModal";
import { driveConfig } from "@/config/drives";
import { useAuth } from "@/contexts/AuthContext";
import { useDriveSelect, useLogout } from "@/hooks/useLogout";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

export default function Home() {
  const { user } = useAuth();
  const { handleLogout } = useLogout();
  const { handleDriveSelect } = useDriveSelect();
  const params = useParams();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Get drive name from URL path
  const driveName = Array.isArray(params.path)
    ? params.path[0] || ""
    : params.path || "";

  const drives = driveConfig.drives;

  return (
    <AuthGuard>
      <main className={styles.mainContainer}>
        <div className={styles.container}>
          <PageHeader
            driveName={driveName}
            user={user}
            handleLogout={handleLogout}
            setIsSettingsOpen={setIsSettingsOpen}
          />

          {driveName ? (
            <FileExplorer
              driveName={driveName}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          ) : (
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
