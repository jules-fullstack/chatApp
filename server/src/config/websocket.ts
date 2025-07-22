import { Application } from 'express';
import expressWs from 'express-ws';
import { IUser } from '../types/index.js';
import { WebSocket } from 'ws';

interface AuthenticatedSocket extends WebSocket {
  user?: IUser;
}

interface WebSocketUser {
  userId: string;
  ws: AuthenticatedSocket;
}

class WebSocketManager {
  private connectedUsers: Map<string, WebSocketUser> = new Map();

  init(app: Application) {
    const wsInstance = expressWs(app);

    wsInstance.app.ws('/api/chat', (ws: AuthenticatedSocket, req: any) => {
      const user = req.user as IUser;

      if (!user) {
        ws.close(1008, 'Not authenticated');
        return;
      }

      ws.user = user;
      const userId = user._id.toString();

      // Store connected user
      this.connectedUsers.set(userId, { userId, ws });

      // Update user's lastActive timestamp
      this.updateUserLastActive(userId);

      // Notify other users about online status
      this.sendOnlineStatus(userId, true);

      console.log(`User ${user.userName} connected to chat`);

      // Send connection confirmation
      ws.send(
        JSON.stringify({
          type: 'connection',
          status: 'connected',
          message: 'Connected to chat server',
        }),
      );

      // Send list of currently online users to the newly connected user
      const onlineUserIds = this.getConnectedUsers().filter(id => id !== userId);
      if (onlineUserIds.length > 0) {
        ws.send(JSON.stringify({
          type: 'online_users_list',
          userIds: onlineUserIds
        }));
      }

      // Handle incoming messages
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(userId, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        this.connectedUsers.delete(userId);
        // Update user's lastActive timestamp when they disconnect
        this.updateUserLastActive(userId);
        // Notify other users about offline status
        this.sendOnlineStatus(userId, false);
        console.log(`User ${user.userName} disconnected from chat`);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.connectedUsers.delete(userId);
        // Notify other users about offline status on error
        this.sendOnlineStatus(userId, false);
      });
    });

    return wsInstance;
  }

  private handleMessage(senderId: string, data: any) {
    switch (data.type) {
      case 'typing':
        this.handleTyping(senderId, data);
        break;
      case 'stop_typing':
        this.handleStopTyping(senderId, data);
        break;
      case 'conversation_read':
        this.handleConversationRead(senderId, data);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private async handleTyping(senderId: string, data: any) {
    const { recipientId, conversationId } = data;

    if (recipientId) {
      const recipientConnection = this.connectedUsers.get(recipientId);
      if (recipientConnection) {
        const message = {
          type: 'user_typing',
          userId: senderId,
          isTyping: true,
          conversationId: conversationId || recipientId,
        };
        recipientConnection.ws.send(JSON.stringify(message));
      }
    } else if (conversationId) {
      try {
        const Conversation = (await import('../models/Conversation.js'))
          .default;
        const conversation = await Conversation.findById(conversationId);

        if (conversation) {
          conversation.participants.forEach((participantId: any) => {
            if (participantId.toString() !== senderId) {
              const connection = this.connectedUsers.get(
                participantId.toString(),
              );
              if (connection) {
                const message = {
                  type: 'user_typing',
                  userId: senderId,
                  isTyping: true,
                  conversationId,
                };
                connection.ws.send(JSON.stringify(message));
              }
            }
          });
        }
      } catch (error) {
        console.error('Error handling group typing:', error);
      }
    }
  }

  private async handleStopTyping(senderId: string, data: any) {
    const { recipientId, conversationId } = data;

    if (recipientId) {
      // Direct message stop typing
      const recipientConnection = this.connectedUsers.get(recipientId);
      if (recipientConnection) {
        recipientConnection.ws.send(
          JSON.stringify({
            type: 'user_typing',
            userId: senderId,
            isTyping: false,
            conversationId: conversationId || recipientId,
          }),
        );
      }
    } else if (conversationId) {
      // Group chat stop typing
      try {
        const Conversation = (await import('../models/Conversation.js'))
          .default;
        const conversation = await Conversation.findById(conversationId);

        if (conversation) {
          conversation.participants.forEach((participantId: any) => {
            if (participantId.toString() !== senderId) {
              const connection = this.connectedUsers.get(
                participantId.toString(),
              );
              if (connection) {
                connection.ws.send(
                  JSON.stringify({
                    type: 'user_typing',
                    userId: senderId,
                    isTyping: false,
                    conversationId,
                  }),
                );
              }
            }
          });
        }
      } catch (error) {
        console.error('Error handling group stop typing:', error);
      }
    }
  }

  private async handleConversationRead(senderId: string, data: any) {
    const { conversationId } = data;
    
    try {
      const Conversation = (await import('../models/Conversation.js')).default;
      const User = (await import('../models/User.js')).default;

      // Find and update the conversation
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.toString() === senderId)) {
        return;
      }

      // Initialize readAt if it doesn't exist
      if (!conversation.readAt) {
        conversation.readAt = new Map();
      }

      // Update conversation read timestamp and unread count
      conversation.readAt.set(senderId, new Date());
      conversation.unreadCount.set(senderId, 0);
      await conversation.save();

      // Notify other participants
      const otherParticipants = conversation.participants.filter(
        p => p.toString() !== senderId
      );

      const user = await User.findById(senderId).select('firstName lastName userName');
      
      otherParticipants.forEach(participantId => {
        const connection = this.connectedUsers.get(participantId.toString());
        if (connection) {
          connection.ws.send(JSON.stringify({
            type: 'conversation_read',
            conversationId: conversation._id,
            readBy: {
              userId: senderId,
              userName: user?.userName,
              firstName: user?.firstName,
              lastName: user?.lastName,
            },
            readAt: conversation.readAt.get(senderId),
            isGroup: conversation.isGroup
          }));
        }
      });
    } catch (error) {
      console.error('Error handling conversation read via WebSocket:', error);
    }
  }

  // Method to send new message notification
  sendMessageNotification(recipientId: string, message: any) {
    const recipientConnection = this.connectedUsers.get(recipientId);

    if (recipientConnection) {
      recipientConnection.ws.send(
        JSON.stringify({
          type: 'new_message',
          message,
        }),
      );
    }
  }

  // Method to send group message notification
  sendGroupMessageNotification(participantIds: string[], message: any) {
    participantIds.forEach((participantId) => {
      const connection = this.connectedUsers.get(participantId);
      if (connection) {
        connection.ws.send(
          JSON.stringify({
            type: 'new_message',
            message,
          }),
        );
      }
    });
  }

  // Generic method to send any WebSocket message
  sendMessage(recipientId: string, message: any) {
    const recipientConnection = this.connectedUsers.get(recipientId);

    if (recipientConnection) {
      recipientConnection.ws.send(JSON.stringify(message));
    }
  }

  // Method to send online status
  sendOnlineStatus(userId: string, isOnline: boolean) {
    // Send to all connected users (you might want to limit this to friends/contacts)
    this.connectedUsers.forEach((connection) => {
      if (connection.userId !== userId) {
        connection.ws.send(
          JSON.stringify({
            type: 'user_status',
            userId,
            isOnline,
          }),
        );
      }
    });
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Get all connected users
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // Method to notify user about account blocking and force logout
  notifyUserBlocked(userId: string) {
    const userConnection = this.connectedUsers.get(userId);
    
    if (userConnection) {
      userConnection.ws.send(
        JSON.stringify({
          type: 'account_blocked',
          message: 'Your account has been blocked from the platform.',
        }),
      );
      
      // Close the connection after sending the message
      setTimeout(() => {
        if (userConnection.ws.readyState === userConnection.ws.OPEN) {
          userConnection.ws.close(1008, 'Account blocked');
        }
      }, 1000);
    }
  }

  // Update user's lastActive timestamp
  private async updateUserLastActive(userId: string) {
    try {
      const User = (await import('../models/User.js')).default;
      await User.findByIdAndUpdate(userId, { lastActive: new Date() });
    } catch (error) {
      console.error('Error updating user lastActive:', error);
    }
  }
}

export default new WebSocketManager();
