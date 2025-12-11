import { LogOut, Menu, Settings, User } from "lucide-react";
import { useState } from "react";
import type { UserMenuProps } from "@/types";
import { ThemeSelector } from "./ThemeSelector";
import styles from "./userMenu.module.css";

export function UserMenu({ user, onLogout, onOpenSettings }: UserMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <div className={styles.userMenu}>
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(true)}
          aria-label="Open user menu"
        >
          <Menu size={24} color={"var(--theme-text-octonary)"}/>
        </button>
        <div className={`${styles.menuContent} ${menuOpen ? styles.open : ""}`}>
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
          <div className={styles.hamburgerButtons}>
            <button
              onClick={onOpenSettings}
              className={styles.settingsButton}
              title="Settings"
            >
              <Settings size={16} />
            </button>
            <ThemeSelector />
            <button onClick={onLogout} className={styles.logoutButton}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
      <div
        className={`${styles.menuOverlay} ${menuOpen ? styles.open : ""}`}
        onClick={() => setMenuOpen(false)}
      />
    </>
  );
}
