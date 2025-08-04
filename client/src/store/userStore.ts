import { create } from "zustand";
import type { Media } from "../types";
import { API_BASE_URL } from "../config";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  role: "user" | "superAdmin";
  avatar?: Media | string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  checkAuthStatus: () => Promise<void>;
}

export const userStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  checkAuthStatus: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/check`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        set({ user: userData.user, isLoading: false });
      } else {
        // 401 is expected for unauthenticated users (like those clicking invitation links)
        set({ user: null, isLoading: false });
      }
    } catch (error) {
      // Network errors or other issues - don't log 401s as they're expected
      set({ user: null, isLoading: false });
    }
  },
}));
