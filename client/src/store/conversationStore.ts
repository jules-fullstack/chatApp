import { create } from "zustand";
import { persist } from "zustand/middleware";
import { userStore } from "./userStore";
import { API_BASE_URL } from "../config";
import type { Participant, Message, Conversation } from "../types";

interface ConversationState {
  // Active conversation
  activeConversation: string | null;

  // Messages
  messages: Message[];
  conversations: Conversation[];
  hasMoreMessages: boolean;
  messagesNextCursor: string | null;
  isLoadingOlderMessages: boolean;

  // Loading states
  isConversationsLoading: boolean;
  isMessagesLoading: boolean;

  // Fallback participant for new conversations
  fallbackParticipant: Participant | null;
  setFallbackParticipant: (participant: Participant | null) => void;

  // New message state
  isNewMessage: boolean;
  newMessageRecipients: Participant[];
  setNewMessage: (isNew: boolean, recipients?: Participant[]) => void;
  addRecipient: (recipient: Participant) => void;
  removeRecipient: (recipientId: string) => void;
  clearRecipients: () => void;

  // UI state
  showConversationDetails: boolean;
  setShowConversationDetails: (show: boolean) => void;
  toggleConversationDetails: () => void;

  // Core actions
  setActiveConversation: (userId: string) => void;
  startNewMessage: () => void;

  // Message actions
  sendMessage: (
    recipientIds: string[],
    content: string,
    groupName?: string,
    messageType?: string,
    images?: string[]
  ) => Promise<void>;
  loadMessages: (userId: string) => Promise<void>;
  loadOlderMessages: (conversationId: string) => Promise<void>;
  loadConversations: () => Promise<void>;

  // Message handling
  handleIncomingMessage: (message: Message) => void;
  getUserInfoFromConversations: (userId: string) => Partial<{
    userName?: string;
    firstName?: string;
    lastName?: string;
  }>;

  // Read status actions
  markConversationAsRead: (conversationId: string) => Promise<void>;
  handleConversationRead: (data: unknown) => void;

  // Group management actions
  updateGroupName: (conversationId: string, groupName: string) => Promise<void>;
  handleGroupNameUpdated: (data: unknown) => void;
  handleGroupPhotoUpdated: (data: unknown) => void;
  leaveGroup: (conversationId: string) => Promise<void>;
  handleUserLeftGroup: (data: unknown) => void;
  handleMembersAddedToGroup: (data: unknown) => void;
  changeGroupAdmin: (
    conversationId: string,
    newAdminId: string
  ) => Promise<void>;
  handleGroupAdminChanged: (data: unknown) => void;
  removeMemberFromGroup: (
    conversationId: string,
    userToRemoveId: string
  ) => Promise<void>;
  handleMemberRemovedFromGroup: (data: unknown) => void;
  handleRemovedFromGroup: (data: unknown) => void;

  // Message filtering for blocking
  filterMessagesForBlocking: (
    blockedUserIds: Set<string>,
    usersWhoBlockedMe: Set<string>
  ) => void;

  // Reset
  resetConversationStore: () => void;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      activeConversation: null,
      messages: [],
      conversations: [],
      hasMoreMessages: false,
      messagesNextCursor: null,
      isLoadingOlderMessages: false,
      isConversationsLoading: false,
      isMessagesLoading: false,
      fallbackParticipant: null,
      isNewMessage: false,
      newMessageRecipients: [],
      showConversationDetails: false,

      setFallbackParticipant: (participant: Participant | null) => {
        set({ fallbackParticipant: participant });
      },

      setNewMessage: (isNew: boolean, recipients?: Participant[]) => {
        set({
          isNewMessage: isNew,
          newMessageRecipients: recipients || [],
          messages: isNew ? [] : get().messages,
        });
      },

      addRecipient: (recipient: Participant) => {
        const current = get().newMessageRecipients;
        if (!current.find((r) => r._id === recipient._id)) {
          set({
            newMessageRecipients: [...current, recipient],
          });
        }
      },

      removeRecipient: (recipientId: string) => {
        set({
          newMessageRecipients: get().newMessageRecipients.filter(
            (r) => r._id !== recipientId
          ),
        });
      },

      clearRecipients: () => {
        set({ newMessageRecipients: [] });
      },

      startNewMessage: () => {
        set({
          isNewMessage: true,
          newMessageRecipients: [],
          activeConversation: null,
          messages: [],
          fallbackParticipant: null,
        });
      },

      setShowConversationDetails: (show: boolean) => {
        set({ showConversationDetails: show });
      },

      toggleConversationDetails: () => {
        set({ showConversationDetails: !get().showConversationDetails });
      },

      setActiveConversation: (conversationId: string) => {
        set({
          activeConversation: conversationId,
          messages: [],
          hasMoreMessages: false,
          messagesNextCursor: null,
          isNewMessage: false,
          newMessageRecipients: [],
        });
        get().loadMessages(conversationId);

        // Also mark conversation as read when switching to it (for immediate UI update)
        if (!conversationId.startsWith("user:")) {
          get().markConversationAsRead(conversationId);
        }
      },

      sendMessage: async (
        targets: string[],
        content: string,
        groupName?: string,
        messageType?: string,
        images?: string[]
      ) => {
        try {
          const { isNewMessage, activeConversation } = get();

          let requestBody;
          if (isNewMessage) {
            // New message - send to multiple recipients
            requestBody = {
              recipientIds: targets,
              content,
              messageType: messageType || "text",
              ...(groupName !== undefined && { groupName }),
              ...(images && images.length > 0 && { images }),
            };
          } else if (activeConversation?.startsWith("user:")) {
            // Direct message to a user (new conversation)
            const userId = activeConversation.replace("user:", "");
            requestBody = {
              recipientIds: [userId],
              content,
              messageType: messageType || "text",
              ...(images && images.length > 0 && { images }),
            };
          } else {
            // Existing conversation - send to conversation
            requestBody = {
              conversationId: activeConversation,
              content,
              messageType: messageType || "text",
              ...(images && images.length > 0 && { images }),
            };
          }

          const response = await fetch(`${API_BASE_URL}/messages/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            throw new Error("Failed to send message");
          }

          const result = await response.json();

          set((state) => ({
            messages: [...state.messages, result.data],
            isNewMessage: false,
            newMessageRecipients: [],
            activeConversation: result.data.conversation || activeConversation,
          }));

          get().loadConversations();
        } catch (error) {
          console.error("Error sending message:", error);
          throw error;
        }
      },

      loadMessages: async (conversationId: string) => {
        set({ isMessagesLoading: true });
        try {
          let url;
          if (conversationId.startsWith("user:")) {
            // Direct message to a user - use legacy endpoint
            const userId = conversationId.replace("user:", "");
            url = `${API_BASE_URL}/messages/conversation/user/${userId}?limit=50`;
          } else {
            // Existing conversation - load most recent 50 messages
            url = `${API_BASE_URL}/messages/conversation/${conversationId}?limit=50`;
          }

          const response = await fetch(url, {
            credentials: "include",
          });

          if (!response.ok) {
            // If conversation doesn't exist yet, that's okay
            if (response.status === 403 || response.status === 404) {
              set({
                messages: [],
                hasMoreMessages: false,
                messagesNextCursor: null,
              });
              return;
            }
            throw new Error("Failed to load messages");
          }

          const result = await response.json();
          set({
            messages: result.messages || [],
            hasMoreMessages: result.pagination?.hasMore || false,
            messagesNextCursor: result.pagination?.nextCursor || null,
          });
        } catch (error) {
          console.error("Error loading messages:", error);
          set({
            messages: [],
            hasMoreMessages: false,
            messagesNextCursor: null,
          });
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      loadOlderMessages: async (conversationId: string) => {
        const { isLoadingOlderMessages, messagesNextCursor, hasMoreMessages } =
          get();

        if (isLoadingOlderMessages || !hasMoreMessages || !messagesNextCursor) {
          return;
        }

        set({ isLoadingOlderMessages: true });
        try {
          let url;
          if (conversationId.startsWith("user:")) {
            // Direct message to a user - use legacy endpoint
            const userId = conversationId.replace("user:", "");
            url = `${API_BASE_URL}/messages/conversation/user/${userId}?limit=50&before=${messagesNextCursor}`;
          } else {
            // Existing conversation
            url = `${API_BASE_URL}/messages/conversation/${conversationId}?limit=50&before=${messagesNextCursor}`;
          }

          const response = await fetch(url, {
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error("Failed to load older messages");
          }

          const result = await response.json();
          const olderMessages = result.messages || [];

          set((state) => ({
            messages: [...olderMessages, ...state.messages],
            hasMoreMessages: result.pagination?.hasMore || false,
            messagesNextCursor: result.pagination?.nextCursor || null,
          }));
        } catch (error) {
          console.error("Error loading older messages:", error);
        } finally {
          set({ isLoadingOlderMessages: false });
        }
      },

      loadConversations: async () => {
        set({ isConversationsLoading: true });
        try {
          const response = await fetch(`${API_BASE_URL}/conversations`, {
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error("Failed to load conversations");
          }

          const conversations = await response.json();
          set({ conversations });
        } catch (error) {
          console.error("Error loading conversations:", error);
        } finally {
          set({ isConversationsLoading: false });
        }
      },

      handleIncomingMessage: (message: Message) => {
        const { activeConversation } = get();

        // Ensure message has required properties
        if (!message || !message.sender) {
          console.error("Invalid message received:", message);
          return;
        }

        // If this message is for the active conversation, add it to messages
        // For group chats, we need to check the conversation ID
        if (
          message.conversation &&
          activeConversation === message.conversation
        ) {
          set((state) => ({
            messages: [...state.messages, message],
          }));
        } else if (
          !message.conversation &&
          activeConversation === message.sender._id
        ) {
          // Legacy direct message handling
          set((state) => ({
            messages: [...state.messages, message],
          }));
        }

        // Refresh conversations to update last message and unread count
        get().loadConversations();
      },

      getUserInfoFromConversations: (userId: string) => {
        const { conversations } = get();

        // Find the user in conversations
        for (const conversation of conversations) {
          if (conversation.isGroup && conversation.participants) {
            const participant = conversation.participants.find(
              (p) => p._id === userId
            );
            if (participant) {
              return {
                userName: participant.userName,
                firstName: participant.firstName,
                lastName: participant.lastName,
              };
            }
          } else if (
            !conversation.isGroup &&
            conversation.participant &&
            conversation.participant._id === userId
          ) {
            return {
              userName: conversation.participant.userName,
              firstName: conversation.participant.firstName,
              lastName: conversation.participant.lastName,
            };
          }
        }
        return {};
      },

      markConversationAsRead: async (conversationId: string) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/conversations/${conversationId}/read`,
            {
              method: "PATCH",
              credentials: "include",
            }
          );

          if (!response.ok) {
            throw new Error("Failed to mark conversation as read");
          }

          const result = await response.json();
          const currentUserId = userStore.getState().user?.id || "";

          // Update local state - update conversation read timestamp and unread count
          set((state) => ({
            conversations: state.conversations.map((conv) => {
              if (conv._id === conversationId) {
                const updatedConv = {
                  ...conv,
                  unreadCount: 0,
                  readAt: {
                    ...conv.readAt,
                    [currentUserId]: result.readAt || new Date().toISOString(),
                  },
                };
                return updatedConv;
              }
              return conv;
            }),
          }));
        } catch (error) {
          console.error("Error marking conversation as read:", error);
        }
      },

      handleConversationRead: (data: unknown) => {
        const { conversationId, readBy, readAt } = data as {
          conversationId: string;
          readBy: { userId: string };
          readAt: string;
        };

        // Update conversation read timestamp in local state
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv._id === conversationId) {
              const updatedConv = {
                ...conv,
                readAt: {
                  ...conv.readAt,
                  [readBy.userId]: readAt || new Date().toISOString(),
                },
              };
              return updatedConv;
            }
            return conv;
          }),
        }));
      },

      updateGroupName: async (conversationId: string, groupName: string) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/conversations/${conversationId}/name`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({ groupName }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to update group name");
          }

          const result = await response.json();

          // Update local state immediately
          set((state) => ({
            conversations: state.conversations.map((conv) => {
              if (conv._id === conversationId) {
                return {
                  ...conv,
                  groupName: result.groupName,
                };
              }
              return conv;
            }),
          }));
        } catch (error) {
          console.error("Error updating group name:", error);
          throw error;
        }
      },

      handleGroupNameUpdated: (data: unknown) => {
        const { conversationId, groupName, conversation } = data as {
          conversationId: string;
          groupName: string;
          conversation: Conversation;
        };

        // Update conversation in local state with full conversation data
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv._id === conversationId) {
              return {
                ...conv,
                groupName,
                // Update with any other fields from the populated conversation
                participants: conversation.participants || conv.participants,
                groupAdmin: conversation.groupAdmin || conv.groupAdmin,
              };
            }
            return conv;
          }),
        }));
      },

      handleGroupPhotoUpdated: (data: unknown) => {
        const { conversationId, groupPhoto } = data as {
          conversationId: string;
          groupPhoto: {
            _id: string;
            url: string;
            filename: string;
            originalName: string;
            mimeType: string;
            metadata: {
              width?: number;
              height?: number;
              blurhash?: string;
              alt?: string;
            };
          };
        };

        // Update conversation in local state with new group photo
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv._id === conversationId) {
              return {
                ...conv,
                groupPhoto: {
                  _id: groupPhoto._id,
                  filename: groupPhoto.filename,
                  originalName: groupPhoto.originalName,
                  mimeType: groupPhoto.mimeType,
                  size: 0, // Size not provided in WebSocket message
                  url: groupPhoto.url,
                  metadata: groupPhoto.metadata,
                },
              };
            }
            return conv;
          }),
        }));
      },

      leaveGroup: async (conversationId: string) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/conversations/${conversationId}/leave`,
            {
              method: "POST",
              credentials: "include",
            }
          );

          if (!response.ok) {
            throw new Error("Failed to leave group");
          }

          // Remove conversation from local state
          set((state) => ({
            conversations: state.conversations.filter(
              (conv) => conv._id !== conversationId
            ),
            // If this was the active conversation, clear it
            activeConversation:
              state.activeConversation === conversationId
                ? null
                : state.activeConversation,
            messages:
              state.activeConversation === conversationId ? [] : state.messages,
            showConversationDetails: false,
          }));
        } catch (error) {
          console.error("Error leaving group:", error);
          throw error;
        }
      },

      handleUserLeftGroup: (data: unknown) => {
        const { conversationId, leftUser, newAdmin, isActive } = data as {
          conversationId: string;
          leftUser: { userId: string };
          newAdmin: string;
          isActive: boolean;
        };

        // Update conversation in local state
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv._id === conversationId) {
              const filteredParticipants = conv.participants?.filter(
                (p) => p._id !== leftUser.userId
              );

              // Find the new admin user object from remaining participants
              const newAdminUser = filteredParticipants?.find(
                (p) => p._id === newAdmin
              );

              return {
                ...conv,
                participants: filteredParticipants,
                groupAdmin: newAdminUser,
                isActive,
              };
            }
            return conv;
          }),
        }));
      },

      handleMembersAddedToGroup: (data: unknown) => {
        const { conversationId, addedMembers, conversation } = data as {
          conversationId: string;
          addedMembers: Array<{
            userId: string;
            userName: string;
            firstName: string;
            lastName: string;
          }>;
          conversation: Conversation;
        };

        const currentUserId = userStore.getState().user?.id;

        set((state) => {
          const existingConversation = state.conversations.find(
            (conv) => conv._id === conversationId
          );

          if (existingConversation) {
            // Update existing conversation with new participants
            return {
              conversations: state.conversations.map((conv) => {
                if (conv._id === conversationId) {
                  return {
                    ...conv,
                    participants: conversation.participants,
                  };
                }
                return conv;
              }),
            };
          } else {
            // Add new conversation for newly added members
            const isNewMember = addedMembers.some(
              (member) => member.userId === currentUserId
            );

            if (isNewMember) {
              return {
                conversations: [...state.conversations, conversation],
              };
            }

            return state;
          }
        });
      },

      changeGroupAdmin: async (conversationId: string, newAdminId: string) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/conversations/${conversationId}/admin`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({ newAdminId }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to change group admin");
          }

          await response.json();

          // Update local state immediately
          set((state) => ({
            conversations: state.conversations.map((conv) => {
              if (conv._id === conversationId) {
                const newAdminUser = conv.participants?.find(
                  (p) => p._id === newAdminId
                );
                return {
                  ...conv,
                  groupAdmin: newAdminUser,
                };
              }
              return conv;
            }),
          }));
        } catch (error) {
          console.error("Error changing group admin:", error);
          throw error;
        }
      },

      handleGroupAdminChanged: (data: unknown) => {
        const { conversationId, newAdmin, conversation } = data as {
          conversationId: string;
          newAdmin: {
            userId: string;
            userName: string;
            firstName: string;
            lastName: string;
            avatar?: string;
          };
          conversation: Conversation;
        };

        // Update conversation in local state with new admin
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv._id === conversationId) {
              return {
                ...conv,
                groupAdmin: conversation.groupAdmin || {
                  _id: newAdmin.userId,
                  userName: newAdmin.userName,
                  firstName: newAdmin.firstName,
                  lastName: newAdmin.lastName,
                  email: "", // Add required email field
                  role: "user" as const, // Add required role field
                  avatar:
                    newAdmin.avatar ||
                    "https://fullstack-hq-chat-app-bucket.s3.ap-southeast-1.amazonaws.com/images/default-avatars/default-avatar.jpg",
                },
                // Update with any other fields from the populated conversation
                participants: conversation.participants || conv.participants,
              };
            }
            return conv;
          }),
        }));
      },

      removeMemberFromGroup: async (
        conversationId: string,
        userToRemoveId: string
      ) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/conversations/${conversationId}/members/${userToRemoveId}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
            }
          );

          if (!response.ok) {
            throw new Error("Failed to remove member from group");
          }

          await response.json();

          // Update local state immediately
          set((state) => ({
            conversations: state.conversations.map((conv) => {
              if (conv._id === conversationId) {
                return {
                  ...conv,
                  participants: conv.participants?.filter(
                    (p) => p._id !== userToRemoveId
                  ),
                };
              }
              return conv;
            }),
          }));
        } catch (error) {
          console.error("Error removing member from group:", error);
          throw error;
        }
      },

      handleMemberRemovedFromGroup: (data: unknown) => {
        const { conversationId, removedUser, conversation } = data as {
          conversationId: string;
          removedUser: {
            userId: string;
            userName: string;
            firstName: string;
            lastName: string;
          };
          conversation: Conversation;
        };

        // Update conversation in local state by removing the user from participants
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv._id === conversationId) {
              return {
                ...conv,
                participants:
                  conversation.participants ||
                  conv.participants?.filter(
                    (p) => p._id !== removedUser.userId
                  ),
              };
            }
            return conv;
          }),
        }));
      },

      handleRemovedFromGroup: (data: unknown) => {
        const { conversationId } = data as {
          conversationId: string;
          removedBy: {
            userId: string;
            userName: string;
            firstName: string;
            lastName: string;
          };
        };

        // Remove conversation from local state since the user was removed
        set((state) => ({
          conversations: state.conversations.filter(
            (conv) => conv._id !== conversationId
          ),
          // If this was the active conversation, clear it
          activeConversation:
            state.activeConversation === conversationId
              ? null
              : state.activeConversation,
          messages:
            state.activeConversation === conversationId ? [] : state.messages,
          showConversationDetails: false,
        }));
      },

      filterMessagesForBlocking: (
        blockedUserIds: Set<string>,
        usersWhoBlockedMe: Set<string>
      ) => {
        const { messages } = get();
        const filteredMessages = messages.filter((message) => {
          const senderId = message.sender._id;

          // Don't filter out current user's own messages
          const currentUser = userStore.getState().user;
          if (senderId === currentUser?.id) {
            return true;
          }

          // Filter out messages from blocked users and users who blocked me
          return (
            !blockedUserIds.has(senderId) && !usersWhoBlockedMe.has(senderId)
          );
        });

        set({ messages: filteredMessages });
      },

      resetConversationStore: () => {
        set({
          activeConversation: null,
          messages: [],
          conversations: [],
          hasMoreMessages: false,
          messagesNextCursor: null,
          isLoadingOlderMessages: false,
          isConversationsLoading: false,
          isMessagesLoading: false,
          fallbackParticipant: null,
          isNewMessage: false,
          newMessageRecipients: [],
          showConversationDetails: false,
        });
      },
    }),
    {
      name: "conversation-storage",
      partialize: (state) => ({
        showConversationDetails: state.showConversationDetails,
      }),
    }
  )
);
