import { Box, TextInput, ActionIcon, Text, Loader } from "@mantine/core";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { AdminUser } from "../../types/admin";

interface AdminSearchInputProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSearchActive: boolean;
  isLoadingSearch: boolean;
  searchResults?: AdminUser[];
  placeholder?: string;
  className?: string;
}

export default function AdminSearchInput({
  searchQuery,
  onSearchChange,
  isSearchActive,
  isLoadingSearch,
  searchResults,
  placeholder = "Search users by name or username...",
  className = "max-w-md",
}: AdminSearchInputProps) {
  const handleClearSearch = () => {
    onSearchChange("");
  };

  return (
    <Box mb="md" className={className}>
      <TextInput
        placeholder={placeholder}
        value={searchQuery}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
        leftSection={
          isLoadingSearch ? (
            <Loader size="xs" />
          ) : (
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-500" />
          )
        }
        rightSection={
          searchQuery ? (
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={handleClearSearch}
              aria-label="Clear search"
              size="sm"
            >
              <XMarkIcon className="w-4 h-4" />
            </ActionIcon>
          ) : null
        }
        rightSectionPointerEvents={searchQuery ? "auto" : "none"}
        aria-label="Search users"
        className="w-full"
      />
      {isSearchActive && (
        <Text size="xs" c="dimmed" mt={4}>
          {isLoadingSearch 
            ? "Searching..." 
            : searchResults 
            ? `Found ${searchResults.length} user(s)`
            : "No results"}
        </Text>
      )}
    </Box>
  );
}