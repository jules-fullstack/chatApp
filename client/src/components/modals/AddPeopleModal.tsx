import { useState, useEffect } from "react";
import { Modal, Button, Checkbox, ScrollArea } from "@mantine/core";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { Avatar, FormField } from "../ui";
import { useDebounce } from "../../hooks";
import conversationService from "../../services/conversationService";
import userSearchService from "../../services/userSearchService";
import type { SearchedUser, Participant } from "../../types/index";

interface SearchFormData {
  search: string;
}

interface AddPeopleModalProps {
  opened: boolean;
  onClose: () => void;
  conversationId: string;
  existingParticipants: Participant[];
}

export default function AddPeopleModal({
  opened,
  onClose,
  conversationId,
  existingParticipants,
}: AddPeopleModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<SearchedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local search state for the modal
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const {
    register,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<SearchFormData>();

  const searchQuery = watch("search", "");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Local search function
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const users = await userSearchService.searchUsers(query);
      setSearchResults(users);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Search failed");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    searchUsers(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  // Reset state when modal opens
  useEffect(() => {
    if (opened) {
      reset();
      setSelectedUsers([]);
      setSearchResults([]);
      setSearchError(null);
      setError(null);
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [opened, reset]);

  // Filter out existing participants from search results
  const filteredSearchResults = (searchResults || []).filter(
    (user) =>
      !existingParticipants.some((participant) => participant._id === user._id)
  );

  const handleUserSelect = (user: SearchedUser, checked: boolean) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, user]);
    } else {
      setSelectedUsers((prev) => prev.filter((u) => u._id !== user._id));
    }
  };

  const handleRemoveSelected = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== userId));
  };

  const handleClearSearch = () => {
    setValue("search", "");
    setSearchResults([]);
    setSearchError(null);
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const userIds = selectedUsers.map((user) => user._id);
      await conversationService.addMembersToGroup(conversationId, userIds);

      onClose();

      // Reset form and selected users
      reset();
      setSelectedUsers([]);
      setSearchResults([]);
      setSearchError(null);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to add members"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    reset();
    setSelectedUsers([]);
    setSearchResults([]);
    setSearchError(null);
    setError(null);
    setIsLoading(false);
    setIsSearching(false);
    onClose();
  };

  const showClearButton = searchQuery.trim().length > 0;

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      title="Add people"
      size="md"
      centered
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <FormField
            name="search"
            type="text"
            placeholder="Search users..."
            register={register}
            errors={errors}
            containerClassName="flex bg-gray-200 p-2 rounded-2xl"
            inputClassName="w-full focus:outline-none ml-2 pr-8"
            leftIcon={<MagnifyingGlassIcon className="size-6 text-gray-400" />}
            showError={false}
          />
          {showClearButton && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="size-5" />
            </button>
          )}
        </div>

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Selected:</h3>
            <ScrollArea className="h-32">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex-shrink-0 relative text-center"
                  >
                    <button
                      onClick={() => handleRemoveSelected(user._id)}
                      className="absolute -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 z-10"
                    >
                      <XMarkIcon className="size-3" />
                    </button>
                    <div className="flex flex-col items-center w-16">
                      <Avatar user={user} size="lg" />
                      <span className="text-xs text-gray-600 mt-1 truncate w-full">
                        {user.userName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Search Results */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Search results:</h3>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {isSearching ? (
                <div className="text-center py-4 text-gray-500">
                  Searching...
                </div>
              ) : filteredSearchResults.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  {searchQuery.trim()
                    ? "No users found"
                    : "Start typing to search users"}
                </div>
              ) : (
                filteredSearchResults.map((user) => {
                  const isSelected = selectedUsers.some(
                    (u) => u._id === user._id
                  );
                  return (
                    <div
                      key={user._id}
                      className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={(event) =>
                          handleUserSelect(user, event.currentTarget.checked)
                        }
                      />
                      <Avatar user={user} size="md" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{user.userName}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        {searchError && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            Search error: {searchError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleModalClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAddMembers}
            loading={isLoading}
            disabled={selectedUsers.length === 0}
          >
            Add {selectedUsers.length}{" "}
            {selectedUsers.length === 1 ? "person" : "people"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
