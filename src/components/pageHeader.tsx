import Link from "next/link";
import { UserMenu } from "./UserMenu";
import styles from "./pageHeader.module.css";

export interface PageHeaderProps {
  bucketName: string;
  user: { username?: string; email?: string } | null;
  handleLogout: () => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
}

export function PageHeader({
  bucketName,
  user,
  handleLogout,
  setIsSettingsOpen,
}: PageHeaderProps) {
  return (
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
  );
}
