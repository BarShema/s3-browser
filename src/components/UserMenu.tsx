import { User, LogOut, Settings } from "lucide-react";
import { ThemeSelector } from "./ThemeSelector";
import styles from "./userMenu.module.css";

export interface UserMenuProps {
  user: { username?: string; email?: string } | null;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export function UserMenu({ user, onLogout, onOpenSettings }: UserMenuProps) {
  return (
    <div className={styles.userMenu}>
      <div className={styles.userInfo}>
        <div className={styles.userDetails}>
          <User size={18} style={{ color: "#6b7280" }} />
          <div className={styles.userInfoDetails}>
            <span className={styles.userName}>{user?.username}</span>
            {user?.email && (
              <span className={styles.userEmail}>{user.email}</span>
            )}
          </div>
        </div>
      </div>
      <ThemeSelector />
      <button
        onClick={onOpenSettings}
        className={styles.settingsButton}
        title="Settings"
      >
        <Settings size={16} />
      </button>
      <button onClick={onLogout} className={styles.logoutButton}>
        <LogOut size={14} />
      </button>
    </div>
  );
}
