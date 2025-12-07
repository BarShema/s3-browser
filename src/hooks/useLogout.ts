import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

/**
 * Custom hook for handling logout functionality
 * Centralizes logout logic to avoid duplication
 */
export function useLogout() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  return { handleLogout };
}

/**
 * Custom hook for handling drive selection
 * Centralizes drive selection logic
 */
export function useDriveSelect() {
  const router = useRouter();

  const handleDriveSelect = (drive: string) => {
    router.push(`/${drive}`);
  };

  return { handleDriveSelect };
}

