import { useEffect } from "react";
import { useChatStore } from "../store/chatStore";
import { useConversationStore } from "../store/conversationStore";
import { userStore } from "../store/userStore";
import {
  ConversationDetails,
  MessageWindow,
  Sidebar,
} from "../components/conversation";
import { ProfileModal, UserMenu } from "../components/ui";
import { useProfileManagement } from "../hooks/useProfileManagement";

export default function UserDashboard() {
  const user = userStore((state) => state.user);
  const { connect, disconnect } = useChatStore();
  const {
    loadConversations,
    conversations,
    setActiveConversation,
    showConversationDetails,
  } = useConversationStore();
  
  const { isOpen, handleModalOpen, close } = useProfileManagement();

  useEffect(() => {
    // Connect to WebSocket when component mounts
    connect();

    // Load conversations
    loadConversations();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect, loadConversations]);

  useEffect(() => {
    // Set the most recent conversation as active on load
    if (
      conversations.length > 0 &&
      !useConversationStore.getState().activeConversation
    ) {
      // Use conversation ID for both group and direct chats
      setActiveConversation(conversations[0]._id);
    }
  }, [conversations, setActiveConversation]);

  return (
    <div className="bg-gray-100 h-screen flex items-center relative">
      <ProfileModal isOpen={isOpen} onClose={close} />
      
      <UserMenu 
        user={user} 
        onProfileSettingsClick={handleModalOpen} 
      />
      
      <Sidebar />
      <MessageWindow />
      {showConversationDetails && <ConversationDetails />}
    </div>
  );
}
