"use client";

import { useTheme } from "@/contexts/ThemeContext";
import styles from "./themeSelector.module.css";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as "default" | "night");
  };

  return (
    <div className={styles.themeSelector}>
      <select
        id="themeSelector"
        value={theme}
        onChange={handleThemeChange}
        className={styles.themeSelect}
        title="Select theme"
      >
        <option value="default">Default</option>
        <option value="night">Night</option>
        <option value="forest">Forest</option>
        <option value="ocean">Ocean</option>
        <option value="rose">Rose</option>
        <option value="desert">Desert</option>
        <option value="sunset">Sunset</option>
        <option value="lavender">Lavender</option>
        <option value="charcoal">Charcoal</option>
        <option value="emerald">Emerald</option>
        <option value="aws">AWS</option>
        <option value="vscode">VSCode</option>
      </select>
    </div>
  );
}
