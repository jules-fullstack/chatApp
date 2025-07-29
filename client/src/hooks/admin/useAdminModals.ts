import { useState } from "react";
import type { AdminGroupConversation } from "../../types/admin";

interface ConfirmAction {
  type: "remove" | "promote";
  data: string | string[];
}

export function useAdminModals() {
  const [selectedGroupChat, setSelectedGroupChat] = useState<AdminGroupConversation | null>(null);
  const [isAddPeopleModalOpen, setIsAddPeopleModalOpen] = useState(false);
  const [isRemoveMembersModalOpen, setIsRemoveMembersModalOpen] = useState(false);
  const [isPromoteMemberModalOpen, setIsPromoteMemberModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  // Group chat action handlers
  const handleAddPeople = (conversation: AdminGroupConversation) => {
    setSelectedGroupChat(conversation);
    setIsAddPeopleModalOpen(true);
  };

  const handleRemoveMembers = (conversation: AdminGroupConversation) => {
    setSelectedGroupChat(conversation);
    setIsRemoveMembersModalOpen(true);
  };

  const handlePromoteMember = (conversation: AdminGroupConversation) => {
    setSelectedGroupChat(conversation);
    setIsPromoteMemberModalOpen(true);
  };

  const handleConfirmRemoveMembers = (userIds: string[]) => {
    setConfirmAction({
      type: "remove",
      data: userIds,
    });
    setIsRemoveMembersModalOpen(false);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmPromoteMember = (userId: string) => {
    setConfirmAction({
      type: "promote",
      data: userId,
    });
    setIsPromoteMemberModalOpen(false);
    setIsConfirmModalOpen(true);
  };

  const closeAllModals = () => {
    setIsAddPeopleModalOpen(false);
    setIsRemoveMembersModalOpen(false);
    setIsPromoteMemberModalOpen(false);
    setIsConfirmModalOpen(false);
    setConfirmAction(null);
    setSelectedGroupChat(null);
  };

  // Convert AdminParticipant to Participant for modal compatibility
  const convertAdminParticipantsToParticipants = (
    adminParticipants: AdminGroupConversation["participants"]
  ) => {
    return adminParticipants.map((p) => ({
      _id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      userName: p.userName,
      email: p.email,
    }));
  };

  const getConfirmMessage = () => {
    if (!confirmAction || !selectedGroupChat)
      return { title: "", message: "", confirmText: "", color: "blue" };

    if (confirmAction.type === "remove") {
      const userCount = (confirmAction.data as string[]).length;
      return {
        title: "Confirm Remove Members",
        message: `Are you sure you want to remove ${userCount} member(s) from "${selectedGroupChat.groupName || "this group"}"`,
        confirmText: `Remove ${userCount} Member(s)`,
        color: "red",
      };
    } else if (confirmAction.type === "promote") {
      const selectedUser = selectedGroupChat.participants.find(
        (p) => p.id === (confirmAction.data as string)
      );
      return {
        title: "Confirm Promote Member",
        message: `Are you sure you want to promote ${selectedUser?.userName || "this user"} to admin in "${selectedGroupChat.groupName || "this group"}"?`,
        confirmText: "Promote to Admin",
        color: "orange",
      };
    }

    return { title: "", message: "", confirmText: "", color: "blue" };
  };

  return {
    selectedGroupChat,
    isAddPeopleModalOpen,
    isRemoveMembersModalOpen,
    isPromoteMemberModalOpen,
    isConfirmModalOpen,
    confirmAction,
    handleAddPeople,
    handleRemoveMembers,
    handlePromoteMember,
    handleConfirmRemoveMembers,
    handleConfirmPromoteMember,
    closeAllModals,
    convertAdminParticipantsToParticipants,
    getConfirmMessage,
  };
}