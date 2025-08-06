import { useEffect, useState } from "react";
import { Container } from "../ui";
import type { AdminTab } from "./AdminSidebar";
import { AddPeopleModal } from "../modals";
import AdminRemoveMembersModal from "./AdminRemoveMembersModal";
import AdminPromoteMemberModal from "./AdminPromoteMemberModal";
import AdminActionConfirmModal from "./AdminActionConfirmModal";

// Import custom hooks
import {
  useAdminUsers,
  useAdminGroupChats,
  useAdminSearch,
  useAdminModals,
} from "../../hooks/admin/";

// Import components
import { AdminUsersTable } from "./tables/AdminUsersTable";
import { AdminGroupChatsTable } from "./tables/AdminGroupChatsTable";
import { AdminPagination } from "./ui/AdminPagination";
import { AdminHeader } from "./ui/AdminHeader";

interface AdminWindowProps {
  activeTab: AdminTab;
}

export default function AdminWindow({ activeTab }: AdminWindowProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Effect to reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Initialize custom hooks
  const search = useAdminSearch({ activeTab });

  const users = useAdminUsers({
    currentPage,
    isSearchActive: search.isSearchActive,
    searchResults: search.searchResults,
    setSearchResults: search.setSearchResults,
  });

  const groupChats = useAdminGroupChats({ currentPage, activeTab });

  const modals = useAdminModals();

  // Execute confirm action
  const executeConfirmAction = () => {
    if (!modals.confirmAction || !modals.selectedGroupChat) return;

    groupChats.executeConfirmAction(
      modals.selectedGroupChat.id,
      modals.confirmAction.type,
      modals.confirmAction.data
    );
    modals.closeAllModals();
  };

  return (
    <main className="flex items-center mx-auto">
      <Container size="lg">
        <div className="p-8">
          <AdminHeader
            activeTab={activeTab}
            searchQuery={search.searchQuery}
            onSearchChange={search.setSearchQuery}
            isSearchActive={search.isSearchActive}
            isLoadingSearch={search.isLoadingSearch}
            searchResults={search.searchResults}
          />

          {activeTab === "users" ? (
            <AdminUsersTable
              displayUsers={users.displayUsers}
              isLoadingUsers={users.isLoadingUsers}
              isErrorUsers={users.isErrorUsers}
              usersError={users.usersError}
              isLoadingSearch={search.isLoadingSearch}
              isSearchActive={search.isSearchActive}
              actionLoading={users.actionLoading}
              onBlockUser={(userId) => users.handleBlockUser.mutate(userId)}
              onUnblockUser={(userId) => users.handleUnblockUser.mutate(userId)}
              isBlockUserPending={users.handleBlockUser.isPending}
              isUnblockUserPending={users.handleUnblockUser.isPending}
            />
          ) : (
            <AdminGroupChatsTable
              groupChatsData={groupChats.groupChatsData}
              isLoadingGroupChats={groupChats.isLoadingGroupChats}
              isErrorGroupChats={groupChats.isErrorGroupChats}
              groupChatsError={groupChats.groupChatsError}
              actionLoading={groupChats.actionLoading}
              isExecutePending={
                groupChats.executeConfirmActionMutation.isPending
              }
              onAddPeople={modals.handleAddPeople}
              onRemoveMembers={modals.handleRemoveMembers}
              onPromoteMember={modals.handlePromoteMember}
            />
          )}

          <AdminPagination
            pagination={
              activeTab === "users"
                ? users.usersData?.pagination
                : groupChats.groupChatsData?.pagination
            }
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            isSearchActive={search.isSearchActive}
          />
        </div>
      </Container>

      {/* Group Chat Action Modals */}
      {modals.selectedGroupChat && (
        <>
          <AddPeopleModal
            opened={modals.isAddPeopleModalOpen}
            onClose={modals.closeAllModals}
            conversationId={modals.selectedGroupChat.id}
            existingParticipants={modals.convertAdminParticipantsToParticipants(
              modals.selectedGroupChat.participants
            )}
            onMembersAdded={groupChats.handleMembersAdded}
          />

          <AdminRemoveMembersModal
            opened={modals.isRemoveMembersModalOpen}
            onClose={modals.closeAllModals}
            onConfirm={modals.handleConfirmRemoveMembers}
            participants={modals.convertAdminParticipantsToParticipants(
              modals.selectedGroupChat.participants
            )}
            groupName={modals.selectedGroupChat.groupName || "Unnamed Group"}
          />

          <AdminPromoteMemberModal
            opened={modals.isPromoteMemberModalOpen}
            onClose={modals.closeAllModals}
            onConfirm={modals.handleConfirmPromoteMember}
            participants={modals.convertAdminParticipantsToParticipants(
              modals.selectedGroupChat.participants
            )}
            groupName={modals.selectedGroupChat.groupName || "Unnamed Group"}
            currentAdminId={modals.selectedGroupChat.groupAdmin?.id}
          />
        </>
      )}

      <AdminActionConfirmModal
        opened={modals.isConfirmModalOpen}
        onClose={modals.closeAllModals}
        onConfirm={executeConfirmAction}
        isLoading={groupChats.executeConfirmActionMutation.isPending}
        {...modals.getConfirmMessage()}
      />
    </main>
  );
}
