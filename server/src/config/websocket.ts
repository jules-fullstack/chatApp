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

      console.log(`User ${user.userName} connected to chat`);

      // Send connection confirmation
      ws.send(
        JSON.stringify({
          type: 'connection',
          status: 'connected',
          message: 'Connected to chat server',
        }),
      );

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
        console.log(`User ${user.userName} disconnected from chat`);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.connectedUsers.delete(userId);
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
      case 'message_read':
        this.handleMessageRead(senderId, data);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private handleTyping(senderId: string, data: any) {
    const { recipientId } = data;
    const recipientConnection = this.connectedUsers.get(recipientId);

    if (recipientConnection) {
      recipientConnection.ws.send(
        JSON.stringify({
          type: 'user_typing',
          userId: senderId,
          isTyping: true,
        }),
      );
    }
  }

  private handleStopTyping(senderId: string, data: any) {
    const { recipientId } = data;
    const recipientConnection = this.connectedUsers.get(recipientId);

    if (recipientConnection) {
      recipientConnection.ws.send(
        JSON.stringify({
          type: 'user_typing',
          userId: senderId,
          isTyping: false,
        }),
      );
    }
  }

  private handleMessageRead(senderId: string, data: any) {
    const { recipientId, messageId } = data;
    const recipientConnection = this.connectedUsers.get(recipientId);

    if (recipientConnection) {
      recipientConnection.ws.send(
        JSON.stringify({
          type: 'message_read',
          messageId,
          readBy: senderId,
        }),
      );
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
}

export default new WebSocketManager();
