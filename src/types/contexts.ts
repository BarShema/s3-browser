import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/auth";

export type Theme = "default" | "night" | "forest" | "ocean" | "rose" | "desert" | "sunset" | "lavender" | "charcoal" | "emerald" | "aws" | "vscode";

// AuthContext
export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

export interface AuthProviderProps {
  children: ReactNode;
}

// ThemeContext
export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export interface ThemeProviderProps {
  children: ReactNode;
}

