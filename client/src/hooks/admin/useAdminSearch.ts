import { useState, useEffect } from "react";
import adminSearchService from "../../services/adminSearchService";
import {useDebounce} from "../useDebounce";
import type { AdminUser } from "../../types/admin";

interface UseAdminSearchProps {
  activeTab: string;
}

export function useAdminSearch({ activeTab }: UseAdminSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Effect to reset search when tab changes
  useEffect(() => {
    setSearchQuery("");
    setSearchResults([]);
  }, [activeTab]);

  // Effect for debounced search
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchQuery.trim() || activeTab !== "users") {
        setSearchResults([]);
        setIsLoadingSearch(false);
        return;
      }

      setIsLoadingSearch(true);
      try {
        const results = await adminSearchService.searchUsers(debouncedSearchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsLoadingSearch(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, activeTab]);

  // Computed values
  const isSearchActive = searchQuery.trim().length > 0;

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isLoadingSearch,
    isSearchActive,
  };
}