import { create } from "zustand";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  role: "user" | "superAdmin";
  avatar?: string;
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
      const response = await fetch("http://localhost:3000/api/auth/check", {
        method: "GET",
        credentials: "include",
      });
      
      if (response.ok) {
        const userData = await response.json();
        set({ user: userData.user, isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      set({ user: null, isLoading: false });
    }
  },
}));
