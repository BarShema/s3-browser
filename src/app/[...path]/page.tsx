"use client";

import styles from "@/app/home.module.css";
import { AuthGuard } from "@/components/AuthGuard";
import { FileExplorer } from "@/components/FileExplorer";
import { PageHeader } from "@/components/pageHeader";
import { SettingsModal } from "@/components/SettingsModal";
import { driveConfig } from "@/config/drives";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";

export default function Home() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Get drive name from URL path
  const driveName = Array.isArray(params.path)
    ? params.path[0] || ""
    : params.path || "";

  const drives = driveConfig.drives;

  const handleDriveSelect = (drive: string) => {
    router.push(`/${drive}`);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

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
                  <button
                    key={drive}
                    onClick={() => handleDriveSelect(drive)}
                    className={styles.driveCard}
                  >
                    <span>{drive}</span>
                    <span className={styles.driveArrow}>→</span>
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
