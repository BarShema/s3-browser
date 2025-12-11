"use client";

import Link from "next/link";

import type { PageHeaderProps } from "@/types";
import { UserMenu } from "./UserMenu";
import styles from "./PageHeader.module.css";

export function PageHeader({
  driveName,
  user,
  handleLogout,
  setIsSettingsOpen,
}: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.headerLeft}>
          <div>
            <h1 className={styles.title}>Idit File Browser</h1>

            <p className={styles.subtitle}>
              Browse, manage, and organize your files with ease
            </p>
            {driveName && (
              <div className={styles.driveInfo}>
                <span className={styles.driveLabel}>
                  Current Drive:{" "}
                  <span className={styles.driveName}>{driveName}</span>
                  <Link href="/" className={styles.changeDrive}>
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
  );
}
