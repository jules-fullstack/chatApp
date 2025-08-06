import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Accordion } from "@mantine/core";
import { userStore } from "../../store/userStore";
import { Container } from "../ui";
import { useConversationModals, useConversationActions } from "../../hooks";
import { ConversationDetailsHeader } from "./ConversationDetailsHeader";
import { ConversationActions } from "./ConversationActions";
import { ConversationMembers } from "./ConversationMembers";
import { ConversationPrivacy } from "./ConversationPrivacy";
import {
  AddPeopleModal,
  BlockUserModal,
  GroupNameModal,
  InviteUnregisteredUserModal,
  LeaveGroupModal,
  PromoteUserModal,
  RemoveUserModal,
  UnblockUserModal,
} from "../modals";

export default function ConversationDetails() {
  const { user: currentUser } = userStore();

  // Use custom hooks for modal management and business logic
  const modals = useConversationModals();
  const actions = useConversationActions();

  const handlePromoteUser = async () => {
    if (!modals.userToPromote) return;

    actions.setIsPromotingUser(true);
    try {
      await actions.handlePromoteUser(modals.userToPromote._id);
      modals.closePromoteUserModal();
    } catch (error) {
      console.error("Failed to promote user:", error);
    } finally {
      actions.setIsPromotingUser(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!modals.userToRemove) return;

    actions.setIsRemovingUser(true);
    try {
      await actions.handleRemoveUser(modals.userToRemove._id);
      modals.closeRemoveUserModal();
    } catch (error) {
      console.error("Failed to remove user:", error);
    } finally {
      actions.setIsRemovingUser(false);
    }
  };

  const handleBlockUser = async () => {
    if (!modals.userToBlock) return;

    actions.setIsBlockingUser(true);
    try {
      await actions.handleBlockUser(modals.userToBlock._id);
      modals.closeBlockUserModal();
    } catch (error) {
      console.error("Failed to block user:", error);
    } finally {
      actions.setIsBlockingUser(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!modals.userToUnblock) return;

    actions.setIsBlockingUser(true);
    try {
      await actions.handleUnblockUser(modals.userToUnblock._id);
      modals.closeUnblockUserModal();
    } catch (error) {
      console.error("Failed to unblock user:", error);
    } finally {
      actions.setIsBlockingUser(false);
    }
  };

  const handleLeaveGroup = async () => {
    actions.setIsLeavingGroup(true);
    try {
      await actions.handleLeaveGroup();
      modals.closeLeaveGroupModal();
    } catch (error) {
      console.error("Failed to leave group:", error);
    } finally {
      actions.setIsLeavingGroup(false);
    }
  };

  const handleInviteUnregisteredUsers = async (emails: string[]) => {
    actions.setIsInvitingUsers(true);
    try {
      await actions.handleInviteUnregisteredUsers(emails);
      modals.closeInviteUnregisteredModal();
    } catch (error) {
      console.error("Failed to send invitations:", error);
    } finally {
      actions.setIsInvitingUsers(false);
    }
  };

  return (
    <Container size="sm">
      {/* Header Section */}
      <ConversationDetailsHeader
        isGroup={actions.isGroup}
        conversationTitle={actions.conversationTitle}
        avatarUser={actions.avatarUser}
        participants={actions.conversation?.participants || []}
        groupPhoto={actions.conversation?.groupPhoto}
      />

      {/* Main Accordion Sections */}
      <Accordion
        chevron={
          <ChevronRightIcon className="transition-transform duration-300" />
        }
        classNames={{
          chevron: "accordion-chevron",
          item: "no-bottom-border",
        }}
        multiple={true}
      >
        {/* Customize Chat Section */}
        <ConversationActions
          isGroup={actions.isGroup}
          isGroupAdmin={actions.isGroupAdmin}
          isUploadingPhoto={actions.isUploadingPhoto}
          onOpenGroupNameModal={modals.openGroupNameModal}
          onOpenPhotoUpload={actions.handleOpenPhotoUpload}
          onPhotoUpload={actions.handlePhotoUpload}
          fileInputRef={actions.fileInputRef}
        />

        {/* Chat Members Section */}
        <ConversationMembers
          isGroup={actions.isGroup}
          isGroupAdmin={actions.isGroupAdmin}
          participants={actions.conversation?.participants || []}
          currentUserId={currentUser?.id}
          blockedUsers={actions.blockedUsers}
          onMessageUser={actions.handleMessageUser}
          onOpenPromoteUserModal={modals.openPromoteUserModal}
          onOpenRemoveUserModal={modals.openRemoveUserModal}
          onOpenBlockUserModal={modals.openBlockUserModal}
          onOpenUnblockUserModal={modals.openUnblockUserModal}
          onOpenLeaveGroupModal={modals.openLeaveGroupModal}
          onOpenAddPeopleModal={modals.openAddPeopleModal}
          onOpenInviteUnregisteredModal={modals.openInviteUnregisteredModal}
        />

        {/* Privacy & Support Section */}
        <ConversationPrivacy
          isGroup={actions.isGroup}
          participant={actions.conversation?.participant}
          blockedUsers={actions.blockedUsers}
          onOpenLeaveGroupModal={modals.openLeaveGroupModal}
          onOpenBlockUserModal={modals.openBlockUserModal}
          onOpenUnblockUserModal={modals.openUnblockUserModal}
        />
      </Accordion>

      {/* Modals */}
      <GroupNameModal
        opened={modals.isGroupNameModalOpen}
        onClose={modals.closeGroupNameModal}
        onConfirm={actions.handleUpdateGroupName}
        mode="edit"
        currentGroupName={actions.conversation?.groupName || ""}
      />

      <LeaveGroupModal
        opened={modals.isLeaveGroupModalOpen}
        onClose={modals.closeLeaveGroupModal}
        onConfirm={handleLeaveGroup}
        isLoading={actions.isLeavingGroup}
      />

      {actions.conversation && actions.isGroup && (
        <AddPeopleModal
          opened={modals.isAddPeopleModalOpen}
          onClose={modals.closeAddPeopleModal}
          conversationId={actions.conversation._id}
          existingParticipants={actions.conversation.participants || []}
        />
      )}

      {modals.userToPromote && (
        <PromoteUserModal
          opened={modals.isPromoteUserModalOpen}
          onClose={modals.closePromoteUserModal}
          onConfirm={handlePromoteUser}
          isLoading={actions.isPromotingUser}
          userName={modals.userToPromote.userName}
        />
      )}

      {modals.userToRemove && (
        <RemoveUserModal
          opened={modals.isRemoveUserModalOpen}
          onClose={modals.closeRemoveUserModal}
          onConfirm={handleRemoveUser}
          isLoading={actions.isRemovingUser}
          userName={modals.userToRemove.userName}
        />
      )}

      {modals.userToBlock && (
        <BlockUserModal
          opened={modals.isBlockUserModalOpen}
          onClose={modals.closeBlockUserModal}
          onConfirm={handleBlockUser}
          isLoading={actions.isBlockingUser}
          userName={modals.userToBlock.userName}
        />
      )}

      {modals.userToUnblock && (
        <UnblockUserModal
          opened={modals.isUnblockUserModalOpen}
          onClose={modals.closeUnblockUserModal}
          onConfirm={handleUnblockUser}
          isLoading={actions.isBlockingUser}
          userName={modals.userToUnblock.userName}
        />
      )}

      {actions.conversation && actions.isGroup && actions.isGroupAdmin && (
        <InviteUnregisteredUserModal
          opened={modals.isInviteUnregisteredModalOpen}
          onClose={modals.closeInviteUnregisteredModal}
          onConfirm={handleInviteUnregisteredUsers}
          isLoading={actions.isInvitingUsers}
          conversationId={actions.conversation._id}
        />
      )}
    </Container>
  );
}
