import MessageTab from "./MessageTab";
import useUserSearchStore from "../store/userSearchStore";
import { Loader } from "@mantine/core";

export default function Inbox() {
  const { searchedUsers, isSearching, isSearchActive, error, searchQuery } =
    useUserSearchStore();

  const renderSearchResults = () => {
    if (isSearching) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader size={6} color="gray" />
          <span className="ml-2 text-gray-500">Searching...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-8">
          <span className="text-red-500 text-sm">{error}</span>
        </div>
      );
    }

    if (searchedUsers.length === 0 && searchQuery.trim()) {
      return (
        <div className="flex items-center justify-center py-8">
          <span className="text-gray-500 text-sm">No users found</span>
        </div>
      );
    }

    return searchedUsers.map((user) => (
      <MessageTab
        key={user._id}
        type="minimal"
        username={user.userName}
        onClick={() => {
          // TODO: Handle user selection (start chat, etc.)
          console.log("Selected user:", user);
        }}
      />
    ));
  };

  const renderDefaultContent = () => {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-gray-500 text-sm">No conversations yet</span>
      </div>
    );
  };

  return (
    <div className="space-y-2 px-2">
      {isSearchActive ? renderSearchResults() : renderDefaultContent()}
    </div>
  );
}
