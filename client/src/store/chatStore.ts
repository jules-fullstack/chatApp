import { create } from "zustand";
import { persist } from "zustand/middleware";
import { userStore } from "./userStore";
import { type Participant, type Message, type Conversation } from "../types";

interface TypingUser {
  userId: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
}

interface ChatState {
  // WebSocket connection
  ws: WebSocket | null;
  isConnected: boolean;

  // Online users tracking
  onlineUsers: Set<string>;

  // Active conversation
  activeConversation: string | null;

  // Messages
  messages: Message[];
  conversations: Conversation[];
  hasMoreMessages: boolean;
  messagesNextCursor: string | null;
  isLoadingOlderMessages: boolean;

  // UI state
  isTyping: boolean;
  typingUsers: Map<string, TypingUser>;
  showConversationDetails: boolean;

  isConversationsLoading: boolean;
  isMessagesLoading: boolean;

  fallbackParticipant: Participant | null;
  setFallbackParticipant: (participant: Participant | null) => void;

  // New message state
  isNewMessage: boolean;
  newMessageRecipients: Participant[];
  setNewMessage: (isNew: boolean, recipients?: Participant[]) => void;
  addRecipient: (recipient: Participant) => void;
  removeRecipient: (recipientId: string) => void;
  clearRecipients: () => void;

  // Actions
  connect: () => void;
  disconnect: () => void;
  setActiveConversation: (userId: string) => void;
  startNewMessage: () => void;

  // Online status actions
  isUserOnline: (userId: string) => boolean;
  setUserOnline: (userId: string, isOnline: boolean) => void;

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

  // Real-time actions
  handleIncomingMessage: (message: Message) => void;
  startTyping: (recipientId: string) => void;
  stopTyping: (recipientId: string) => void;
  setTypingUser: (
    userId: string,
    isTyping: boolean,
    userInfo?: Partial<TypingUser>
  ) => void;
  getTypingUsersForConversation: () => TypingUser[];
  getUserInfoFromConversations: (userId: string) => Partial<TypingUser>;

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
  handleBlockingUpdate: (data: unknown) => void;
  removeMemberFromGroup: (
    conversationId: string,
    userToRemoveId: string
  ) => Promise<void>;
  handleMemberRemovedFromGroup: (data: unknown) => void;
  handleRemovedFromGroup: (data: unknown) => void;

  // UI actions
  setShowConversationDetails: (show: boolean) => void;
  toggleConversationDetails: () => void;

  // Blocking actions
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  checkIsUserBlocked: (userId: string) => Promise<boolean>;
  checkIfBlockedBy: (userId: string) => Promise<boolean>;
  getBlockedUsers: () => Promise<Participant[]>;

  // Blocking status refresh
  blockingUpdateTrigger: number;
  triggerBlockingUpdate: () => void;

  // Blocking data cache
  blockedUserIds: Set<string>;
  usersWhoBlockedMe: Set<string>;
  loadBlockingData: () => Promise<void>;
  isUserBlockedByMe: (userId: string) => boolean;
  amIBlockedByUser: (userId: string) => boolean;
  filterMessagesForBlocking: () => void;

  resetStore: () => void;
}

const API_BASE = "http://localhost:3000/api";

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      ws: null,
      isConnected: false,
      onlineUsers: new Set(),
      activeConversation: null,
      messages: [],
      conversations: [],
      hasMoreMessages: false,
      messagesNextCursor: null,
      isLoadingOlderMessages: false,
      isTyping: false,
      typingUsers: new Map(),
      showConversationDetails: false,
      fallbackParticipant: null,
      isNewMessage: false,
      newMessageRecipients: [],
      isConversationsLoading: false,
      isMessagesLoading: false,
      blockingUpdateTrigger: 0,
      blockedUserIds: new Set(),
      usersWhoBlockedMe: new Set(),

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

      connect: () => {
        const user = userStore.getState().user;
        if (!user || get().ws) return;

        const ws = new WebSocket("ws://localhost:3000/api/chat");

        ws.onopen = () => {
          set({ ws, isConnected: true });
          // Load blocking data when WebSocket connects
          get().loadBlockingData();
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "new_message":
              get().handleIncomingMessage(data.message);
              break;
            case "user_typing": {
              // Only show typing indicator if it's for the active conversation
              const { activeConversation } = get();

              // Check if this typing indicator is for the current active conversation
              let shouldShowTyping = false;

              if (activeConversation) {
                if (activeConversation.startsWith("user:")) {
                  // Direct message with user: format - check if the typing user is the same as the target user
                  const targetUserId = activeConversation.replace("user:", "");
                  shouldShowTyping = data.userId === targetUserId;
                } else {
                  // Group chat or existing conversation - check conversation ID
                  shouldShowTyping = data.conversationId === activeConversation;
                }
              }

              if (shouldShowTyping) {
                // Try to get user info from conversations
                const userInfo = get().getUserInfoFromConversations(
                  data.userId
                );
                get().setTypingUser(data.userId, data.isTyping, userInfo);
              }
              break;
            }
            case "conversation_read":
              get().handleConversationRead(data);
              break;
            case "group_name_updated":
              get().handleGroupNameUpdated(data);
              break;
            case "group_photo_updated":
              get().handleGroupPhotoUpdated(data);
              break;
            case "user_left_group":
              get().handleUserLeftGroup(data);
              break;
            case "members_added_to_group":
              get().handleMembersAddedToGroup(data);
              break;
            case "group_admin_changed":
              get().handleGroupAdminChanged(data);
              break;
            case "blocking_update":
              get().handleBlockingUpdate(data);
              break;
            case "member_removed_from_group":
              get().handleMemberRemovedFromGroup(data);
              break;
            case "removed_from_group":
              get().handleRemovedFromGroup(data);
              break;
            case "user_status":
              get().setUserOnline(data.userId, data.isOnline);
              break;
            case "online_users_list":
              // Set initial online users when first connecting
              data.userIds.forEach((userId: string) => {
                get().setUserOnline(userId, true);
              });
              break;
            case "account_blocked":
              // Handle account blocking - perform logout sequence
              (async () => {
                try {
                  await fetch("http://localhost:3000/api/auth/logout", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                      "Content-Type": "application/json",
                    },
                  });
                } catch (error) {
                  console.error("Error during logout:", error);
                }

                // Clear user and reset stores
                userStore.getState().clearUser();
                get().resetStore();

                // Show blocking message
                alert(
                  data.message ||
                    "Your account has been blocked from the platform."
                );

                // Redirect to login page
                window.location.href = "/login";
              })();
              break;
            case "blocked_by_user":
              // Handle being blocked by another user
              console.log("You have been blocked by a user:", data.blockedBy);
              // Trigger blocking status update
              get().triggerBlockingUpdate();
              break;
            case "unblocked_by_user":
              // Handle being unblocked by another user
              console.log(
                "You have been unblocked by a user:",
                data.unblockedBy
              );
              // Trigger blocking status update
              get().triggerBlockingUpdate();
              break;
            default:
              console.log("Unknown WebSocket message:", data);
          }
        };

        ws.onclose = () => {
          set({ ws: null, isConnected: false });
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          set({ ws: null, isConnected: false });
        };
      },

      disconnect: () => {
        const { ws } = get();
        if (ws) {
          ws.close();
          set({ ws: null, isConnected: false, onlineUsers: new Set() });
        }
      },

      isUserOnline: (userId: string) => {
        return get().onlineUsers.has(userId);
      },

      setUserOnline: (userId: string, isOnline: boolean) => {
        set((state) => {
          const newOnlineUsers = new Set(state.onlineUsers);
          if (isOnline) {
            newOnlineUsers.add(userId);
          } else {
            newOnlineUsers.delete(userId);
          }
          return { onlineUsers: newOnlineUsers };
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

        // Load blocking data for the new conversation
        get().loadBlockingData();

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

          const response = await fetch(`${API_BASE}/messages/send`, {
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
            url = `${API_BASE}/messages/conversation/user/${userId}?limit=50`;
          } else {
            // Existing conversation - load most recent 50 messages
            url = `${API_BASE}/messages/conversation/${conversationId}?limit=50`;
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
            url = `${API_BASE}/messages/conversation/user/${userId}?limit=50&before=${messagesNextCursor}`;
          } else {
            // Existing conversation
            url = `${API_BASE}/messages/conversation/${conversationId}?limit=50&before=${messagesNextCursor}`;
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
          const response = await fetch(`${API_BASE}/messages/conversations`, {
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error("Failed to load conversations");
          }

          const conversations = await response.json();
          set({ conversations });

          // Load blocking data after conversations are loaded
          get().loadBlockingData();
        } catch (error) {
          console.error("Error loading conversations:", error);
        } finally {
          set({ isConversationsLoading: false });
        }
      },

      handleIncomingMessage: (message: Message) => {
        const { activeConversation, isUserBlockedByMe, amIBlockedByUser } =
          get();

        // Ensure message has required properties
        if (!message || !message.sender) {
          console.error("Invalid message received:", message);
          return;
        }

        const senderId = message.sender._id;
        const currentUser = userStore.getState().user;

        // Don't filter out current user's own messages
        const isOwnMessage = senderId === currentUser?.id;

        // Filter out messages from blocked users or users who blocked me
        if (
          !isOwnMessage &&
          (isUserBlockedByMe(senderId) || amIBlockedByUser(senderId))
        ) {
          // Still refresh conversations to update counts, but don't add message to chat
          get().loadConversations();
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

      startTyping: (target: string) => {
        const { ws } = get();
        if (ws && ws.readyState === WebSocket.OPEN) {
          if (target.startsWith("user:")) {
            // Direct message with user: format
            const recipientId = target.replace("user:", "");
            const message = {
              type: "typing",
              recipientId,
              conversationId: recipientId,
            };
            ws.send(JSON.stringify(message));
          } else {
            // Group chat or existing conversation - send only conversationId
            const message = {
              type: "typing",
              conversationId: target,
            };
            ws.send(JSON.stringify(message));
          }
        } else {
          console.log(
            "DEBUG: WebSocket not ready, readyState:",
            ws?.readyState
          );
        }
      },

      stopTyping: (target: string) => {
        const { ws } = get();
        if (ws && ws.readyState === WebSocket.OPEN) {
          if (target.startsWith("user:")) {
            // Direct message with user: format
            const recipientId = target.replace("user:", "");
            ws.send(
              JSON.stringify({
                type: "stop_typing",
                recipientId,
                conversationId: recipientId,
              })
            );
          } else {
            // Group chat or existing conversation - send only conversationId
            ws.send(
              JSON.stringify({
                type: "stop_typing",
                conversationId: target,
              })
            );
          }
        }
      },

      setTypingUser: (
        userId: string,
        isTyping: boolean,
        userInfo?: Partial<TypingUser>
      ) => {
        set((state) => {
          const newTypingUsers = new Map(state.typingUsers);
          if (isTyping) {
            const typingUser: TypingUser = {
              userId,
              userName: userInfo?.userName,
              firstName: userInfo?.firstName,
              lastName: userInfo?.lastName,
            };
            newTypingUsers.set(userId, typingUser);
          } else {
            newTypingUsers.delete(userId);
          }
          return { typingUsers: newTypingUsers };
        });
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

      getTypingUsersForConversation: () => {
        const { typingUsers } = get();
        return Array.from(typingUsers.values());
      },

      markConversationAsRead: async (conversationId: string) => {
        try {
          const response = await fetch(
            `${API_BASE}/messages/conversation/${conversationId}/read`,
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
            `${API_BASE}/messages/conversation/${conversationId}/group-name`,
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
            `${API_BASE}/messages/conversation/${conversationId}/leave`,
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
            `${API_BASE}/messages/conversation/${conversationId}/change-admin`,
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

      handleBlockingUpdate: (data: unknown) => {
        const { action, userId, blockedUserId } = data as {
          action: "block" | "unblock";
          userId: string;
          blockedUserId: string;
        };

        console.log(
          `Blocking update: ${action} - User ${userId} ${action}ed User ${blockedUserId}`
        );

        // Trigger blocking data reload and UI update
        get().triggerBlockingUpdate();
      },

      removeMemberFromGroup: async (
        conversationId: string,
        userToRemoveId: string
      ) => {
        try {
          const response = await fetch(
            `${API_BASE}/messages/conversation/${conversationId}/remove-member`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({ userToRemoveId }),
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

      setShowConversationDetails: (show: boolean) => {
        set({ showConversationDetails: show });
      },

      toggleConversationDetails: () => {
        set({ showConversationDetails: !get().showConversationDetails });
      },

      blockUser: async (userId: string) => {
        try {
          const response = await fetch(`${API_BASE}/users/block/${userId}`, {
            method: "POST",
            credentials: "include",
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to block user");
          }

          // Trigger blocking status update for UI refresh
          get().triggerBlockingUpdate();
        } catch (error) {
          console.error("Error blocking user:", error);
          throw error;
        }
      },

      unblockUser: async (userId: string) => {
        try {
          const response = await fetch(`${API_BASE}/users/unblock/${userId}`, {
            method: "POST",
            credentials: "include",
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to unblock user");
          }

          // Trigger blocking status update for UI refresh
          get().triggerBlockingUpdate();
        } catch (error) {
          console.error("Error unblocking user:", error);
          throw error;
        }
      },

      checkIsUserBlocked: async (userId: string) => {
        try {
          const blockedUsers = await get().getBlockedUsers();
          return blockedUsers.some((user) => user._id === userId);
        } catch (error) {
          console.error("Error checking if user is blocked:", error);
          return false;
        }
      },

      checkIfBlockedBy: async (userId: string) => {
        try {
          const response = await fetch(
            `${API_BASE}/users/check-blocked-by/${userId}`,
            {
              credentials: "include",
            }
          );

          if (!response.ok) {
            throw new Error("Failed to check if blocked by user");
          }

          const data = await response.json();
          return data.isBlocked || false;
        } catch (error) {
          console.error("Error checking if blocked by user:", error);
          return false;
        }
      },

      getBlockedUsers: async () => {
        try {
          const response = await fetch(`${API_BASE}/users/blocked`, {
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error("Failed to fetch blocked users");
          }

          const data = await response.json();
          return data.blockedUsers || [];
        } catch (error) {
          console.error("Error fetching blocked users:", error);
          return [];
        }
      },

      loadBlockingData: async () => {
        try {
          // Load users I've blocked
          const blockedUsers = await get().getBlockedUsers();
          const blockedIds = new Set(blockedUsers.map((user) => user.id));

          // Load users who have blocked me from ALL conversations (more comprehensive)
          const usersWhoBlockedMeSet = new Set<string>();
          const { conversations } = get();

          // Check all conversation participants across all conversations
          const allParticipantIds = new Set<string>();
          conversations.forEach((conversation) => {
            if (conversation.participants) {
              conversation.participants.forEach((participant) => {
                if (participant._id !== userStore.getState().user?.id) {
                  allParticipantIds.add(participant._id);
                }
              });
            }
            // Also check single participants for direct conversations
            if (
              conversation.participant &&
              conversation.participant._id !== userStore.getState().user?.id
            ) {
              allParticipantIds.add(conversation.participant._id);
            }
          });

          // Check blocking status for all unique participants
          await Promise.all(
            Array.from(allParticipantIds).map(async (participantId) => {
              try {
                const isBlockedByUser =
                  await get().checkIfBlockedBy(participantId);
                if (isBlockedByUser) {
                  usersWhoBlockedMeSet.add(participantId);
                }
              } catch (error) {
                console.error(
                  `Error checking if blocked by user ${participantId}:`,
                  error
                );
              }
            })
          );

          set({
            blockedUserIds: blockedIds,
            usersWhoBlockedMe: usersWhoBlockedMeSet,
          });
        } catch (error) {
          console.error("Error loading blocking data:", error);
        }
      },

      isUserBlockedByMe: (userId: string) => {
        return get().blockedUserIds.has(userId);
      },

      amIBlockedByUser: (userId: string) => {
        return get().usersWhoBlockedMe.has(userId);
      },

      triggerBlockingUpdate: () => {
        set((state) => ({
          blockingUpdateTrigger: state.blockingUpdateTrigger + 1,
        }));
        // Reload blocking data when trigger updates and filter messages
        (async () => {
          await get().loadBlockingData();

          const activeConversation = get().activeConversation;
          if (activeConversation) {
            await get().loadMessages(activeConversation);
          }
          // Filter messages in real-time after blocking data is updated
          get().filterMessagesForBlocking();
        })();
      },

      filterMessagesForBlocking: () => {
        const { messages, blockedUserIds, usersWhoBlockedMe } = get();
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

      resetStore: () => {
        set({
          ws: null,
          isConnected: false,
          onlineUsers: new Set(),
          activeConversation: null,
          messages: [],
          conversations: [],
          hasMoreMessages: false,
          messagesNextCursor: null,
          isLoadingOlderMessages: false,
          isTyping: false,
          typingUsers: new Map(),
          showConversationDetails: false,
          fallbackParticipant: null,
          isNewMessage: false,
          newMessageRecipients: [],
          blockingUpdateTrigger: 0,
          blockedUserIds: new Set(),
          usersWhoBlockedMe: new Set(),
        });
      },
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({
        showConversationDetails: state.showConversationDetails,
      }),
    }
  )
);
