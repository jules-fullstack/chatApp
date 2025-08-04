import { Request, Response } from 'express';
import { IUser, AuthenticatedRequest } from '../types/index.js';
import offlineNotificationService from '../services/offlineNotificationService.js';
import notificationService from '../services/notificationService.js';
import blockingService from '../services/blockingService.js';
import messageService from '../services/messageService.js';
import conversationService from '../services/conversationService.js';

// Using centralized AuthenticatedRequest from types/index.ts

export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      conversationId,
      content,
      messageType = 'text',
      groupName,
      attachmentIds,
      images,
    } = req.body;
    const senderId = req.user!._id;
    let recipients: string[] = req.body.recipients || [];

    // Get or create conversation
    let conversation = req.conversation; // From middleware for existing conversations

    if (!conversationId) {
      // Validate recipients exist
      const recipientsExist =
        await conversationService.validateRecipientsExist(recipients);
      if (!recipientsExist) {
        res
          .status(404)
          .json({ message: 'One or more recipients not found' });
        return;
      }

      // Check blocking for direct messages only
      if (recipients.length === 1) {
        const blockingResult =
          await blockingService.validateDirectMessageBlocking(
            senderId,
            recipients,
          );
        if (blockingResult.isBlocked) {
          res
            .status(blockingResult.message === 'Sender not found' ? 404 : 403)
            .json({ message: blockingResult.message });
          return;
        }

        // Create or find direct conversation
        conversation = await conversationService.findOrCreateDirectConversation(
          senderId.toString(),
          recipients[0],
        );
      } else {
        // Create group conversation
        const allParticipants = [senderId.toString(), ...recipients];
        const finalGroupName =
          groupName && groupName.trim() ? groupName.trim() : null;
        conversation = await conversationService.createGroupConversation(
          allParticipants,
          finalGroupName,
          senderId.toString(),
        );
      }
    } else {
      // Check blocking for existing direct conversations
      if (!conversation.isGroup) {
        const blockingResult =
          await blockingService.validateExistingConversationBlocking(
            senderId,
            conversation.participants,
          );
        if (blockingResult.isBlocked) {
          res
            .status(blockingResult.message === 'Sender not found' ? 404 : 403)
            .json({ message: blockingResult.message });
          return;
        }
      }

      // Get recipients for notifications
      recipients = conversation.participants
        .map((p: any) => p.toString())
        .filter((p: string) => p !== senderId.toString());
    }

    // Create message
    const message = await messageService.createMessage({
      conversationId: conversation._id,
      senderId,
      content,
      messageType,
      attachmentIds,
      images,
    });

    // Update conversation
    await messageService.updateConversationAfterMessage(conversation, {
      messageId: message._id,
      senderId,
      participants: conversation.participants,
    });

    // Create response
    const responseMessage = await messageService.createMessageResponse(
      message,
      conversation,
      recipients,
    );

    // Send notifications
    if (conversation.isGroup) {
      const allowedRecipients =
        await blockingService.filterNotificationRecipients(
          senderId,
          conversation.participants,
        );
      notificationService.notifyMessageRecipients(
        allowedRecipients,
        responseMessage,
      );
    } else {
      const directRecipients = conversation.participants.filter(
        (participantId: any) =>
          participantId.toString() !== senderId.toString(),
      );
      await notificationService.notifyDirectMessageRecipients(
        directRecipients,
        responseMessage,
        senderId,
        offlineNotificationService,
      );
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: responseMessage,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50, before } = req.query;
    const currentUserId = req.user!._id;
    const conversation = req.conversation; // From middleware

    // Get messages with filtering using MessageService
    const result = await messageService.getConversationMessages(
      conversationId,
      currentUserId,
      conversation.isGroup,
      {
        page: Number(page),
        limit: Number(limit),
        before: before as string,
      },
    );

    // Only update read status for initial load (page 1 and no before cursor)
    if (Number(page) === 1 && !before) {
      await messageService.markConversationAsRead(conversation, currentUserId);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDirectMessages = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!._id;

    // Find direct conversation between users
    const conversation = await conversationService.findConversationBetweenUsers(
      currentUserId.toString(),
      userId,
    );

    if (!conversation) {
      res.json({ messages: [] });
      return;
    }

    // Use the main getMessages logic
    req.params.conversationId = conversation._id.toString();
    await getMessages(req, res);
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
