import { create } from "zustand";
import { persist } from "zustand/middleware";
import { userStore } from "./userStore";
import { useConversationStore } from "./conversationStore";
import { API_BASE_URL } from "../config";
import { WebSocketManager } from "../services/webSocketManager";
import type { Participant } from "../types";
import type { TypingUser, StoreActions } from "../services/webSocketTypes";

interface ChatState {
  // WebSocket connection
  ws: WebSocket | null;
  isConnected: boolean;
  webSocketManager: WebSocketManager | null;

  // Online users tracking
  onlineUsers: Set<string>;

  // UI state
  isTyping: boolean;
  typingUsers: Map<string, TypingUser>;

  // Actions
  connect: () => void;
  disconnect: () => void;

  // Online status actions
  isUserOnline: (userId: string) => boolean;
  setUserOnline: (userId: string, isOnline: boolean) => void;

  // Real-time actions
  startTyping: (recipientId: string) => void;
  stopTyping: (recipientId: string) => void;
  setTypingUser: (
    userId: string,
    isTyping: boolean,
    conversationId: string,
    userInfo?: Partial<TypingUser>
  ) => void;
  getTypingUsersForConversation: () => TypingUser[];

  // Blocking actions
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  checkIsUserBlocked: (userId: string) => Promise<boolean>;
  checkIfBlockedBy: (userId: string) => Promise<boolean>;
  getBlockedUsers: () => Promise<(Participant & { id?: string })[]>;

  // Blocking status refresh
  blockingUpdateTrigger: number;
  triggerBlockingUpdate: () => void;

  // Blocking data cache
  blockedUserIds: Set<string>;
  usersWhoBlockedMe: Set<string>;
  loadBlockingData: () => Promise<void>;
  isUserBlockedByMe: (userId: string) => boolean;
  amIBlockedByUser: (userId: string) => boolean;

  // Blocking handlers (for WebSocket)
  handleBlockingUpdate: (data: unknown) => void;

  resetStore: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      ws: null,
      isConnected: false,
      webSocketManager: null,
      onlineUsers: new Set(),
      isTyping: false,
      typingUsers: new Map(),
      blockingUpdateTrigger: 0,
      blockedUserIds: new Set(),
      usersWhoBlockedMe: new Set(),

      connect: () => {
        const user = userStore.getState().user;
        if (!user || get().webSocketManager) return;

        // Create store actions interface for WebSocketManager
        const conversationStore = useConversationStore.getState();
        const storeActions: StoreActions = {
          setConnectionState: (isConnected: boolean) => {
            set({ isConnected });
          },
          setWebSocket: (ws: WebSocket | null) => {
            set({ ws });
          },
          setUserOnline: get().setUserOnline,
          clearOnlineUsers: () => {
            set({ onlineUsers: new Set() });
          },
          setTypingUser: get().setTypingUser,
          getUserInfoFromConversations:
            conversationStore.getUserInfoFromConversations,
          handleIncomingMessage: (message) => {
            // Filter message for blocking before passing to conversation store
            const senderId = message.sender?._id;
            const currentUser = userStore.getState().user;
            const isOwnMessage = senderId === currentUser?.id;

            if (
              !isOwnMessage &&
              (get().isUserBlockedByMe(senderId) ||
                get().amIBlockedByUser(senderId))
            ) {
              // Still refresh conversations but don't add blocked message
              conversationStore.loadConversations();
              return;
            }

            conversationStore.handleIncomingMessage(message);
          },
          loadConversations: conversationStore.loadConversations,
          loadBlockingData: get().loadBlockingData,
          handleConversationRead: conversationStore.handleConversationRead,
          handleGroupNameUpdated: conversationStore.handleGroupNameUpdated,
          handleGroupPhotoUpdated: conversationStore.handleGroupPhotoUpdated,
          handleUserLeftGroup: conversationStore.handleUserLeftGroup,
          handleMembersAddedToGroup:
            conversationStore.handleMembersAddedToGroup,
          handleGroupAdminChanged: conversationStore.handleGroupAdminChanged,
          handleMemberRemovedFromGroup:
            conversationStore.handleMemberRemovedFromGroup,
          handleRemovedFromGroup: conversationStore.handleRemovedFromGroup,
          handleBlockingUpdate: get().handleBlockingUpdate,
          triggerBlockingUpdate: get().triggerBlockingUpdate,
          resetStore: get().resetStore,
          getState: () => ({
            activeConversation: useConversationStore.getState().activeConversation,
          }),
        };

        const manager = new WebSocketManager(storeActions);
        set({ webSocketManager: manager });

        manager.connect().catch((error) => {
          console.error("Failed to connect WebSocket:", error);
        });
      },

      disconnect: () => {
        const { webSocketManager } = get();
        if (webSocketManager) {
          webSocketManager.disconnect();
          set({ webSocketManager: null });
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

      startTyping: (target: string) => {
        const { webSocketManager } = get();
        if (webSocketManager && webSocketManager.isConnected) {
          webSocketManager.sendTyping(target);
        } else {
          console.log(
            "DEBUG: WebSocket not ready, readyState:",
            webSocketManager?.readyState
          );
        }
      },

      stopTyping: (target: string) => {
        const { webSocketManager } = get();
        if (webSocketManager && webSocketManager.isConnected) {
          webSocketManager.sendStopTyping(target);
        }
      },

      setTypingUser: (
        userId: string,
        isTyping: boolean,
        conversationId: string,
        userInfo?: Partial<TypingUser>
      ) => {
        set((state) => {
          const newTypingUsers = new Map(state.typingUsers);
          if (isTyping) {
            const typingUser: TypingUser = {
              userId,
              conversationId,
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

      getTypingUsersForConversation: () => {
        const { typingUsers } = get();
        const conversationStore = useConversationStore.getState();
        const activeConversation = conversationStore.activeConversation;
        if (!activeConversation) return [];
        
        return Array.from(typingUsers.values()).filter(
          (user) => user.conversationId === activeConversation
        );
      },

      blockUser: async (userId: string) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/users/block/${userId}`,
            {
              method: "POST",
              credentials: "include",
            }
          );

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
          const response = await fetch(
            `${API_BASE_URL}/users/unblock/${userId}`,
            {
              method: "POST",
              credentials: "include",
            }
          );

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
            `${API_BASE_URL}/users/check-blocked-by/${userId}`,
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
          const response = await fetch(`${API_BASE_URL}/users/blocked`, {
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
          const blockedIds = new Set(
            blockedUsers
              .map((user) => user._id || user.id)
              .filter((id): id is string => !!id)
          );

          // Load users who have blocked me from ALL conversations (more comprehensive)
          const usersWhoBlockedMeSet = new Set<string>();
          const conversationStore = useConversationStore.getState();
          const { conversations } = conversationStore;

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

          const conversationStore = useConversationStore.getState();
          const activeConversation = conversationStore.activeConversation;
          if (activeConversation) {
            await conversationStore.loadMessages(activeConversation);
          }
          // Filter messages in real-time after blocking data is updated
          conversationStore.filterMessagesForBlocking(
            get().blockedUserIds,
            get().usersWhoBlockedMe
          );
        })();
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

      resetStore: () => {
        const { webSocketManager } = get();
        if (webSocketManager) {
          webSocketManager.destroy();
        }

        // Also reset conversation store
        useConversationStore.getState().resetConversationStore();

        set({
          ws: null,
          isConnected: false,
          webSocketManager: null,
          onlineUsers: new Set(),
          isTyping: false,
          typingUsers: new Map(),
          blockingUpdateTrigger: 0,
          blockedUserIds: new Set(),
          usersWhoBlockedMe: new Set(),
        });
      },
    }),
    {
      name: "chat-storage",
      partialize: () => ({
        // Only persist minimal state, most is ephemeral
      }),
    }
  )
);
