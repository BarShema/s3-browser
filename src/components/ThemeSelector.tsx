"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Palette, Sun } from "lucide-react";
import styles from "./themeSelector.module.css";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as "default" | "night");
  };

  const getThemeIcon = (themeName: string) => {
    switch (themeName) {
      case "night":
        return <Moon size={16} />;
      case "default":
        return <Sun size={16} />;
      default:
        return <Palette size={16} />;
    }
  };

  return (
    <div className={styles.themeSelector}>
      <div className={styles.themeIcon}>{getThemeIcon(theme)}</div>
      <select
        id="themeSelector"
        value={theme}
        onChange={handleThemeChange}
        className={styles.themeSelect}
        title="Select theme"
      >
        <option value="default">Default</option>
        <option value="night">Night</option>
      </select>
    </div>
  );
}
