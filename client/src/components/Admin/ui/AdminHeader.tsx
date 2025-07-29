import { Box, Title } from "@mantine/core";
import AdminSearchInput from "../AdminSearchInput";
import type { AdminTab } from "../AdminSidebar";
import type { AdminUser } from "../../../types/admin";

interface AdminHeaderProps {
  activeTab: AdminTab;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSearchActive: boolean;
  isLoadingSearch: boolean;
  searchResults: AdminUser[];
}

export function AdminHeader({
  activeTab,
  searchQuery,
  onSearchChange,
  isSearchActive,
  isLoadingSearch,
  searchResults,
}: AdminHeaderProps) {
  const getTitle = () => {
    switch (activeTab) {
      case "users":
        return "Users";
      case "group-chats":
        return "Group Chats";
      default:
        return "Users";
    }
  };

  return (
    <>
      <Box mb="lg">
        <Title order={2}>{getTitle()}</Title>
      </Box>
      
      {/* Search input - only show for users tab */}
      {activeTab === "users" && (
        <AdminSearchInput
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          isSearchActive={isSearchActive}
          isLoadingSearch={isLoadingSearch}
          searchResults={searchResults}
          placeholder="Search users by name or username..."
        />
      )}
    </>
  );
}