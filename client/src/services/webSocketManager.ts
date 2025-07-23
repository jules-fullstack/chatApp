import { WEBSOCKET_URL } from "../config";
import { userStore } from "../store/userStore";
import { messageHandlers } from "./webSocketHandlers";
import type { WebSocketMessage, StoreActions } from "./webSocketTypes";

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private storeActions: StoreActions;
  private isManualDisconnect = false;

  constructor(storeActions: StoreActions) {
    this.storeActions = storeActions;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const user = userStore.getState().user;
      if (!user) {
        reject(new Error("User not authenticated"));
        return;
      }

      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(`${WEBSOCKET_URL}/chat`);
        this.storeActions.setWebSocket(this.ws);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.reconnectAttempts = 0;
          this.isManualDisconnect = false;
          this.storeActions.setConnectionState(true);
          // Load blocking data when WebSocket connects
          this.storeActions.loadBlockingData();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason);
          this.storeActions.setConnectionState(false);
          this.storeActions.setWebSocket(null);
          
          // Attempt reconnection if not a manual close
          if (!this.isManualDisconnect && event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.storeActions.setConnectionState(false);
          this.storeActions.setWebSocket(null);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    if (this.ws) {
      // Use code 1000 to indicate manual close (no reconnection)
      this.ws.close(1000, "Manual disconnect");
      this.ws = null;
      this.storeActions.setWebSocket(null);
      this.storeActions.setConnectionState(false);
      this.storeActions.clearOnlineUsers();
    }
  }

  send(message: unknown): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    
    console.warn("WebSocket not ready, message not sent:", message);
    return false;
  }

  // Typing-specific methods
  sendTyping(target: string): void {
    const message = this.buildTypingMessage(target, "typing");
    this.send(message);
  }

  sendStopTyping(target: string): void {
    const message = this.buildTypingMessage(target, "stop_typing");
    this.send(message);
  }

  private buildTypingMessage(target: string, type: "typing" | "stop_typing") {
    if (target.startsWith("user:")) {
      const recipientId = target.replace("user:", "");
      return {
        type,
        recipientId,
        conversationId: recipientId,
      };
    } else {
      return {
        type,
        conversationId: target,
      };
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);
      
      // Find and execute the appropriate handler
      const handler = messageHandlers[data.type];
      if (handler) {
        handler(data, this.storeActions);
      } else {
        console.warn("Unknown WebSocket message type:", data.type);
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(() => {
      this.connect().catch((error) => {
        console.error("Reconnection failed:", error);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error("Max reconnection attempts reached");
        }
      });
    }, delay);
  }

  // Getters
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get readyState(): number | undefined {
    return this.ws?.readyState;
  }

  // Cleanup
  destroy(): void {
    this.isManualDisconnect = true;
    this.disconnect();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent further reconnections
  }
}