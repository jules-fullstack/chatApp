// client/src/store/userSearchStore.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Media } from "../types";

interface SearchedUser {
  _id: string;
  userName: string;
  firstName: string;
  lastName: string;
  avatar?: Media | string;
}

interface UserSearchState {
  searchQuery: string;
  searchedUsers: SearchedUser[];
  isSearching: boolean;
  isSearchActive: boolean;
  error: string | null;
}

interface UserSearchActions {
  setSearchQuery: (query: string) => void;
  setSearchedUsers: (users: SearchedUser[]) => void;
  setIsSearching: (isSearching: boolean) => void;
  setIsSearchActive: (isActive: boolean) => void;
  setError: (error: string | null) => void;
  clearSearch: () => void;
  searchUsers: (query: string) => Promise<void>;
}

type UserSearchStore = UserSearchState & UserSearchActions;

const initialState: UserSearchState = {
  searchQuery: "",
  searchedUsers: [],
  isSearching: false,
  isSearchActive: false,
  error: null,
};

const useUserSearchStore = create<UserSearchStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });

        if (query.trim()) {
          get().searchUsers(query.trim());
        } else {
          get().clearSearch();
        }
      },

      setSearchedUsers: (users: SearchedUser[]) =>
        set({ searchedUsers: users }),

      setIsSearching: (isSearching: boolean) => set({ isSearching }),

      setIsSearchActive: (isActive: boolean) =>
        set({ isSearchActive: isActive }),

      setError: (error: string | null) => set({ error }),

      clearSearch: () =>
        set({
          searchQuery: "",
          searchedUsers: [],
          isSearchActive: false,
          error: null,
        }),

      searchUsers: async (query: string) => {
        if (!query.trim()) return;

        set({ isSearching: true, error: null, isSearchActive: true });

        try {
          const userSearchService = (
            await import("../services/userSearchService")
          ).default;
          const users = await userSearchService.searchUsers(query);
          set({ searchedUsers: users, isSearching: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "An error occurred",
            isSearching: false,
            searchedUsers: [],
          });
        }
      },
    }),
    {
      name: "user-search-store",
    }
  )
);

export default useUserSearchStore;
