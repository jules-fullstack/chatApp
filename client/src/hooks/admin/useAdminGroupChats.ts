import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import adminService from "../../services/adminService";

const QUERY_KEYS = {
  allGroupChats: "adminGroupChats",
};

interface UseAdminGroupChatsProps {
  currentPage: number;
  activeTab: string;
}

export function useAdminGroupChats({ currentPage, activeTab }: UseAdminGroupChatsProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // TanStack Query for fetching group conversations
  const {
    data: groupChatsData,
    isLoading: isLoadingGroupChats,
    isError: isErrorGroupChats,
    error: groupChatsError,
  } = useQuery({
    queryKey: [QUERY_KEYS.allGroupChats, currentPage],
    queryFn: () =>
      adminService.getAllGroupConversations({ page: currentPage, limit: 10 }),
    enabled: activeTab === "group-chats",
    placeholderData: (previousData) => previousData,
  });

  const executeConfirmActionMutation = useMutation({
    mutationFn: async ({
      conversationId,
      actionType,
      data,
    }: {
      conversationId: string;
      actionType: "remove" | "promote";
      data: string | string[];
    }) => {
      if (actionType === "remove") {
        await adminService.removeMembersFromGroup(
          conversationId,
          data as string[]
        );
      } else if (actionType === "promote") {
        await adminService.promoteGroupMember(conversationId, data as string);
      }
    },
    onMutate: async (variables) => {
      setActionLoading(variables.conversationId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.allGroupChats] });

      const previousGroupChats = queryClient.getQueryData([
        QUERY_KEYS.allGroupChats,
        currentPage,
      ]);

      return { previousGroupChats };
    },
    onError: (err, _variables, context) => {
      queryClient.setQueryData(
        [QUERY_KEYS.allGroupChats, currentPage],
        context?.previousGroupChats
      );
      console.error("Action failed:", err);
    },
    onSettled: () => {
      setActionLoading(null);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.allGroupChats] });
    },
  });

  const handleMembersAdded = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.allGroupChats] });
  };

  const executeConfirmAction = (
    conversationId: string,
    actionType: "remove" | "promote",
    data: string | string[]
  ) => {
    executeConfirmActionMutation.mutate({
      conversationId,
      actionType,
      data,
    });
  };

  return {
    groupChatsData,
    isLoadingGroupChats,
    isErrorGroupChats,
    groupChatsError,
    actionLoading,
    executeConfirmActionMutation,
    handleMembersAdded,
    executeConfirmAction,
  };
}