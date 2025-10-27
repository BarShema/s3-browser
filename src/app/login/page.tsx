"use client";

import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, Lock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import styles from "./login.module.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if not loading and authenticated
    if (!authLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signIn(username, password);
      toast.success("Login successful!");
      router.push("/");
    } catch (err) {
      console.error("Login error:", err);

      // Parse Cognito error messages
      let errorMessage = "Invalid username or password";

      if (
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof err.message === "string"
      ) {
        if (err.message.includes("UserNotConfirmedException")) {
          errorMessage = "Please verify your email before signing in";
        } else if (err.message.includes("PasswordResetRequiredException")) {
          errorMessage = "Password reset required. Please reset your password";
        } else if (err.message.includes("UserNotFoundException")) {
          errorMessage = "User not found. Please check your username";
        } else if (err.message.includes("NotAuthorizedException")) {
          errorMessage = "Incorrect username or password";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <div className={styles.loginHeader}>
          <div className={styles.iconContainer}>
            <Lock className={styles.iconLock} />
          </div>
          <h1 className={styles.loginTitle}>S3 File Browser</h1>
          <p className={styles.loginSubtitle}>Sign in to access your files</p>
        </div>

        <div className={styles.loginForm}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            {error && (
              <div className={styles.errorMessage}>
                <AlertCircle className={styles.errorIcon} />
                <span>{error}</span>
              </div>
            )}

            <div className={styles.formField}>
              <label htmlFor="username" className={styles.fieldLabel}>
                Username
              </label>
              <div className={styles.inputWrapper}>
                <User className={styles.inputIcon} />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={styles.loginInput}
                  placeholder="Enter your username"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className={styles.formField}>
              <label htmlFor="password" className={styles.fieldLabel}>
                Password
              </label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.loginInput}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={styles.loginButton}
              style={{
                backgroundColor: isLoading ? "rgba(37, 99, 235, 0.5)" : undefined,
              }}
            >
              {isLoading ? (
                <>
                  <svg
                    style={{ width: "1.25rem", height: "1.25rem", marginRight: "0.75rem", animation: "spin 1s linear infinite" }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      style={{ opacity: 0.25 }}
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      style={{ opacity: 0.75 }}
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <div className={styles.loginFooter}>
          <p>🔒 Secure access to your S3 file storage</p>
        </div>
      </div>
    </div>
  );
}
