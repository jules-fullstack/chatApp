import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { useChatStore } from '../store/chatStore';
import { useConversationStore } from '../store/conversationStore';
import { userStore } from '../store/userStore';
import { API_BASE_URL } from '../config';
import { type Participant } from '../types';

interface ConversationActionsHook {
  // State
  blockedUsers: Set<string>;
  isUploadingPhoto: boolean;
  isLeavingGroup: boolean;
  isPromotingUser: boolean;
  isRemovingUser: boolean;
  isBlockingUser: boolean;
  isInvitingUsers: boolean;
  
  // Computed values
  conversation: any;
  isGroup: boolean;
  isGroupAdmin: boolean;
  conversationTitle: string;
  avatarUser: Participant | null;
  
  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  
  // Actions
  handleUpdateGroupName: (groupName: string) => Promise<void>;
  handleLeaveGroup: () => Promise<void>;
  handlePromoteUser: (userId: string) => Promise<void>;
  handleRemoveUser: (userId: string) => Promise<void>;
  handleBlockUser: (userId: string) => Promise<void>;
  handleUnblockUser: (userId: string) => Promise<void>;
  handlePhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleOpenPhotoUpload: () => void;
  handleInviteUnregisteredUsers: (emails: string[]) => Promise<void>;
  handleMessageUser: (participant: Participant) => void;
  setIsLeavingGroup: (loading: boolean) => void;
  setIsPromotingUser: (loading: boolean) => void;
  setIsRemovingUser: (loading: boolean) => void;
  setIsBlockingUser: (loading: boolean) => void;
  setIsInvitingUsers: (loading: boolean) => void;
}

export function useConversationActions(): ConversationActionsHook {
  const {
    activeConversation,
    conversations,
    updateGroupName,
    fallbackParticipant,
    leaveGroup,
    changeGroupAdmin,
    removeMemberFromGroup,
    setActiveConversation,
    setFallbackParticipant,
    setShowConversationDetails,
  } = useConversationStore();
  
  const { blockUser, unblockUser, blockingUpdateTrigger } = useChatStore();
  const { user: currentUser } = userStore();
  
  // Local state
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [isPromotingUser, setIsPromotingUser] = useState(false);
  const [isRemovingUser, setIsRemovingUser] = useState(false);
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [isInvitingUsers, setIsInvitingUsers] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load blocked users on component mount and when blocking status changes
  useEffect(() => {
    const loadBlockedUsers = async () => {
      try {
        const blockedUsersList = await fetch(`${API_BASE_URL}/users/blocked`, {
          credentials: 'include',
        })
          .then((res) => res.json())
          .then((data) => data.blockedUsers || []);

        const blockedIds = new Set<string>(
          blockedUsersList.map(
            (user: { id?: string; _id?: string }) => user.id || user._id
          )
        );
        setBlockedUsers(blockedIds);
      } catch (error) {
        console.error('Error loading blocked users:', error);
      }
    };

    loadBlockedUsers();
  }, [blockingUpdateTrigger]);

  // Computed values
  const conversation = useMemo(() => {
    return conversations.find(
      (conversation) => conversation._id === activeConversation
    );
  }, [conversations, activeConversation]);

  const isGroup = useMemo(() => !!conversation?.isGroup, [conversation]);

  const isGroupAdmin = useMemo(() => {
    return isGroup ? conversation?.groupAdmin?._id === currentUser?.id : false;
  }, [isGroup, conversation, currentUser]);

  const conversationTitle = useMemo(() => {
    if (!conversation && fallbackParticipant) {
      return fallbackParticipant.userName;
    }

    if (!conversation) return '';

    if (isGroup) {
      if (conversation.groupName) {
        return conversation.groupName;
      }
      // For group chats without a group name, show participant usernames excluding current user
      return (
        conversation.participants
          ?.filter((participant: Participant) => participant._id !== currentUser?.id)
          .map((participant: Participant) => participant.userName)
          .join(', ') || ''
      );
    } else {
      // For direct messages, show the other participant's username
      return conversation.participant?.userName || '';
    }
  }, [conversation, fallbackParticipant, isGroup, currentUser]);

  const avatarUser = useMemo(() => {
    if (!conversation && fallbackParticipant) {
      return fallbackParticipant;
    }

    if (!conversation) return null;

    if (isGroup) {
      // For group chats, return null to show group avatar placeholder
      return null;
    } else {
      // For direct messages, show the other participant's avatar
      return conversation.participant || null;
    }
  }, [conversation, fallbackParticipant, isGroup]);

  // Action handlers
  const handleUpdateGroupName = useCallback(async (groupName: string) => {
    if (!conversation || !activeConversation) return;

    try {
      await updateGroupName(activeConversation, groupName);
    } catch (error) {
      console.error('Failed to update group name:', error);
    }
  }, [conversation, activeConversation, updateGroupName]);

  const handleLeaveGroup = useCallback(async () => {
    if (!conversation || !activeConversation) return;

    setIsLeavingGroup(true);
    try {
      await leaveGroup(activeConversation);
    } catch (error) {
      console.error('Failed to leave group:', error);
    } finally {
      setIsLeavingGroup(false);
    }
  }, [conversation, activeConversation, leaveGroup]);

  const handlePromoteUser = useCallback(async (userId: string) => {
    if (!conversation || !activeConversation) return;

    setIsPromotingUser(true);
    try {
      await changeGroupAdmin(activeConversation, userId);
    } catch (error) {
      console.error('Failed to change group admin:', error);
    } finally {
      setIsPromotingUser(false);
    }
  }, [conversation, activeConversation, changeGroupAdmin]);

  const handleRemoveUser = useCallback(async (userId: string) => {
    if (!conversation || !activeConversation) return;

    setIsRemovingUser(true);
    try {
      await removeMemberFromGroup(activeConversation, userId);
    } catch (error) {
      console.error('Failed to remove user from group:', error);
    } finally {
      setIsRemovingUser(false);
    }
  }, [conversation, activeConversation, removeMemberFromGroup]);

  const handleBlockUser = useCallback(async (userId: string) => {
    setIsBlockingUser(true);
    try {
      await blockUser(userId);
      setBlockedUsers((prev) => new Set([...prev, userId]));

      // Force refresh of conversations list to update UI
      setTimeout(() => {
        setShowConversationDetails(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to block user:', error);
    } finally {
      setIsBlockingUser(false);
    }
  }, [blockUser, setShowConversationDetails]);

  const handleUnblockUser = useCallback(async (userId: string) => {
    setIsBlockingUser(true);
    try {
      await unblockUser(userId);
      setBlockedUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      // Force refresh of conversations list to update UI
      setTimeout(() => {
        setShowConversationDetails(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to unblock user:', error);
    } finally {
      setIsBlockingUser(false);
    }
  }, [unblockUser, setShowConversationDetails]);

  const validateImageFile = useCallback((file: File): string | null => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.';
    }

    if (file.size > maxSize) {
      return 'File size must be less than 5MB.';
    }

    return null;
  }, []);

  const handlePhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !conversation || !activeConversation) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      notifications.show({
        title: 'Validation Error',
        message: validationError || 'Error in validating image.',
        color: 'red',
      });
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('groupPhoto', file);

      const response = await fetch(
        `${API_BASE_URL}/conversations/${activeConversation}/photo`,
        {
          method: 'PUT',
          body: formData,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload group photo');
      }

      await response.json();

      // The WebSocket message will handle updating the conversation state
    } catch (error) {
      console.error('Failed to upload group photo:', error);
      alert(
        error instanceof Error ? error.message : 'Failed to upload group photo'
      );
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [conversation, activeConversation, validateImageFile]);

  const handleOpenPhotoUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleInviteUnregisteredUsers = useCallback(async (emails: string[]) => {
    if (!conversation || !activeConversation) return;

    setIsInvitingUsers(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/conversations/${activeConversation}/invite-unregistered`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ emails }),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send invitations');
      }

      notifications.show({
        title: 'Success',
        message: 'Invitations sent successfully!',
        color: 'green',
      });
    } catch (error) {
      console.error('Failed to send invitations:', error);
      notifications.show({
        title: 'Failed',
        message: 'Failed to send invitations.',
        color: 'red',
      });
    } finally {
      setIsInvitingUsers(false);
    }
  }, [conversation, activeConversation]);

  const handleMessageUser = useCallback((participant: Participant) => {
    setFallbackParticipant({
      _id: participant._id,
      firstName: participant.firstName,
      lastName: participant.lastName,
      userName: participant.userName,
      avatar: participant.avatar,
    });

    // Try to find existing conversation with this user
    const existingConversation = conversations.find(
      (conv) => !conv.isGroup && conv.participant?._id === participant._id
    );

    if (existingConversation) {
      setActiveConversation(existingConversation._id);
    } else {
      // For new conversations, we'll use a special format that the frontend can handle
      // The backend will create the conversation when the first message is sent
      setActiveConversation(`user:${participant._id}`);
    }

    // Close the conversation details panel
    setShowConversationDetails(false);
  }, [conversations, setActiveConversation, setFallbackParticipant, setShowConversationDetails]);


  return {
    // State
    blockedUsers,
    isUploadingPhoto,
    isLeavingGroup,
    isPromotingUser,
    isRemovingUser,
    isBlockingUser,
    isInvitingUsers,
    
    // Computed values
    conversation,
    isGroup,
    isGroupAdmin,
    conversationTitle,
    avatarUser,
    
    // Refs
    fileInputRef,
    
    // Actions
    handleUpdateGroupName,
    handleLeaveGroup,
    handlePromoteUser,
    handleRemoveUser,
    handleBlockUser,
    handleUnblockUser,
    handlePhotoUpload,
    handleOpenPhotoUpload,
    handleInviteUnregisteredUsers,
    handleMessageUser,
    setIsLeavingGroup,
    setIsPromotingUser,
    setIsRemovingUser,
    setIsBlockingUser,
    setIsInvitingUsers,
  };
}