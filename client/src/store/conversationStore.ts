import { create } from "zustand";
import { persist } from "zustand/middleware";
import { userStore } from "./userStore";
import conversationService from "../services/conversationService";
import type { Participant, Message, Conversation } from "../types";
import { AWS_BUCKET } from "../config";

/**
 * Interface defining the conversation store state and actions.
 * Organized into logical groups for better maintainability.
 */
interface ConversationState {
  // ========== Core State ==========
  /** Currently active conversation ID */
  activeConversation: string | null;
  /** Messages for the active conversation */
  messages: Message[];
  /** All user conversations */
  conversations: Conversation[];

  // ========== Pagination State ==========
  /** Whether there are more messages to load */
  hasMoreMessages: boolean;
  /** Cursor for loading older messages */
  messagesNextCursor: string | null;
  /** Loading state for older messages pagination */
  isLoadingOlderMessages: boolean;

  // ========== Loading States ==========
  /** Loading state for conversations list */
  isConversationsLoading: boolean;
  /** Loading state for messages */
  isMessagesLoading: boolean;

  // ========== New Message Composition State ==========
  /** Fallback participant for new conversations */
  fallbackParticipant: Participant | null;
  /** Whether user is composing a new message */
  isNewMessage: boolean;
  /** Recipients for new message being composed */
  newMessageRecipients: Participant[];

  // ========== UI State ==========
  /** Whether conversation details panel is shown */
  showConversationDetails: boolean;

  // ========== Core Actions ==========
  /** Set the active conversation and load its messages */
  setActiveConversation: (userId: string) => void;
  /** Start composing a new message */
  startNewMessage: () => void;
  /** Reset all store state */
  resetConversationStore: () => void;

  // ========== New Message Composition Actions ==========
  /** Set fallback participant for new conversations */
  setFallbackParticipant: (participant: Participant | null) => void;
  /** Set new message state and recipients */
  setNewMessage: (isNew: boolean, recipients?: Participant[]) => void;
  /** Add a recipient to new message */
  addRecipient: (recipient: Participant) => void;
  /** Remove a recipient from new message */
  removeRecipient: (recipientId: string) => void;
  /** Clear all recipients from new message */
  clearRecipients: () => void;

  // ========== UI Actions ==========
  /** Set conversation details panel visibility */
  setShowConversationDetails: (show: boolean) => void;
  /** Toggle conversation details panel visibility */
  toggleConversationDetails: () => void;

  // ========== Message Actions ==========
  /** Send a message to recipients or conversation */
  sendMessage: (
    recipientIds: string[],
    content: string,
    groupName?: string,
    messageType?: string,
    images?: string[]
  ) => Promise<void>;
  /** Load messages for a conversation */
  loadMessages: (userId: string) => Promise<void>;
  /** Load older messages for pagination */
  loadOlderMessages: (conversationId: string) => Promise<void>;
  /** Load all conversations */
  loadConversations: () => Promise<void>;
  /** Mark a conversation as read */
  markConversationAsRead: (conversationId: string) => Promise<void>;

  // ========== Real-time Message Handlers ==========
  /** Handle incoming real-time message */
  handleIncomingMessage: (message: Message) => void;
  /** Handle conversation read status update */
  handleConversationRead: (data: unknown) => void;

  // ========== Group Management Actions ==========
  /** Update group name */
  updateGroupName: (conversationId: string, groupName: string) => Promise<void>;
  /** Leave a group conversation */
  leaveGroup: (conversationId: string) => Promise<void>;
  /** Change group admin */
  changeGroupAdmin: (
    conversationId: string,
    newAdminId: string
  ) => Promise<void>;
  /** Remove member from group */
  removeMemberFromGroup: (
    conversationId: string,
    userToRemoveId: string
  ) => Promise<void>;

  // ========== Real-time Group Event Handlers ==========
  /** Handle group name update event */
  handleGroupNameUpdated: (data: unknown) => void;
  /** Handle group photo update event */
  handleGroupPhotoUpdated: (data: unknown) => void;
  /** Handle user left group event */
  handleUserLeftGroup: (data: unknown) => void;
  /** Handle members added to group event */
  handleMembersAddedToGroup: (data: unknown) => void;
  /** Handle group admin changed event */
  handleGroupAdminChanged: (data: unknown) => void;
  /** Handle member removed from group event */
  handleMemberRemovedFromGroup: (data: unknown) => void;
  /** Handle current user removed from group event */
  handleRemovedFromGroup: (data: unknown) => void;

  // ========== Utility Functions ==========
  /** Get user info from conversations cache */
  getUserInfoFromConversations: (userId: string) => Partial<{
    userName?: string;
    firstName?: string;
    lastName?: string;
  }>;
  /** Filter messages based on user blocking status */
  filterMessagesForBlocking: (
    blockedUserIds: Set<string>,
    usersWhoBlockedMe: Set<string>
  ) => void;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      // ========== Initial State ==========
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

      // ========== New Message Composition Actions ==========
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

      // ========== UI Actions ==========
      setShowConversationDetails: (show: boolean) => {
        set({ showConversationDetails: show });
      },

      toggleConversationDetails: () => {
        set({ showConversationDetails: !get().showConversationDetails });
      },

      // ========== Core Actions ==========
      startNewMessage: () => {
        set({
          isNewMessage: true,
          newMessageRecipients: [],
          activeConversation: null,
          messages: [],
          fallbackParticipant: null,
        });
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

      // ========== Message Actions ==========
      sendMessage: async (
        targets: string[],
        content: string,
        groupName?: string,
        messageType?: string,
        images?: string[]
      ) => {
        try {
          const { isNewMessage, activeConversation } = get();

          const result = await conversationService.sendMessage(
            targets,
            content,
            groupName,
            messageType,
            images,
            isNewMessage,
            activeConversation
          );

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
          const result = await conversationService.loadMessages(conversationId);
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
          const result = await conversationService.loadOlderMessages(
            conversationId,
            messagesNextCursor
          );
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
          const conversations = await conversationService.loadConversations();
          set({ conversations });
        } catch (error) {
          console.error("Error loading conversations:", error);
        } finally {
          set({ isConversationsLoading: false });
        }
      },

      markConversationAsRead: async (conversationId: string) => {
        try {
          const result =
            await conversationService.markConversationAsRead(conversationId);
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

      // ========== Real-time Message Handlers ==========
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

      // ========== Group Management Actions ==========
      updateGroupName: async (conversationId: string, groupName: string) => {
        try {
          const result = await conversationService.updateGroupName(
            conversationId,
            groupName
          );

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

      leaveGroup: async (conversationId: string) => {
        try {
          await conversationService.leaveGroup(conversationId);

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

      changeGroupAdmin: async (conversationId: string, newAdminId: string) => {
        try {
          await conversationService.changeGroupAdmin(
            conversationId,
            newAdminId
          );

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

      removeMemberFromGroup: async (
        conversationId: string,
        userToRemoveId: string
      ) => {
        try {
          await conversationService.removeMemberFromGroup(
            conversationId,
            userToRemoveId
          );

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

      // ========== Real-time Group Event Handlers ==========
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
                    `https://${AWS_BUCKET}.s3.ap-southeast-1.amazonaws.com/images/default-avatars/default-avatar.jpg`,
                },
                // Update with any other fields from the populated conversation
                participants: conversation.participants || conv.participants,
              };
            }
            return conv;
          }),
        }));
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

      // ========== Utility Functions ==========
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
    }),
    {
      name: "conversation-storage",
      partialize: (state) => ({
        showConversationDetails: state.showConversationDetails,
      }),
    }
  )
);
