"use client";

import styles from "@/app/home.module.css";
import { AuthGuard } from "@/components/AuthGuard";
import { DriveCard } from "@/components/DriveCard";
import { FileExplorer } from "@/components/FileExplorer";
import { PageHeader } from "@/components/pageHeader";
import { SettingsModal } from "@/components/SettingsModal";
import { driveConfig } from "@/config/drives";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Toaster, toast } from "react-hot-toast";

export default function DynamicPathPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Get bucket name from URL path using pathname
  // pathname will be like "/", "/idits-drive", "/idits-drive/folder", etc.
  const bucketName = useMemo(() => {
    if (!pathname || pathname === "/" || pathname === "/login") {
      return "";
    }
    // Remove leading slash and get first segment
    const segments = pathname.split("/").filter(Boolean);
    return segments[0] || "";
  }, [pathname]);

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
          <PageHeader
            bucketName={bucketName}
            user={user}
            handleLogout={handleLogout}
            setIsSettingsOpen={setIsSettingsOpen}
          />

          {bucketName ? (
            <FileExplorer
              bucketName={bucketName}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          ) : (
            <div className={styles.driveSelectContainer}>
              <h2 className={styles.driveSelectTitle}>Select a Drive</h2>
              <div className={styles.driveGrid}>
                {buckets.map((bucket) => (
                  <DriveCard
                    key={bucket}
                    drive={bucket}
                    onClick={() => handleBucketSelect(bucket)}
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

