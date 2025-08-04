import { Router } from 'express';
import { ensureAuthenticated } from '../middlewares/auth.js';
import { validateSendMessage } from '../middlewares/messageValidation.js';
import { requireConversationAccess } from '../middlewares/conversationAuth.js';
import { requireMessagePermission } from '../middlewares/messageAuth.js';
import {
  sendMessage,
  getMessages,
  getDirectMessages,
} from '../controllers/messageController.js';

const router = Router();

// All message routes require authentication
router.use(ensureAuthenticated);

// Send a message
router.post('/send', ...validateSendMessage, requireMessagePermission, sendMessage as any);

// Get messages for a conversation
router.get(
  '/conversation/:conversationId',
  requireConversationAccess,
  getMessages as any,
);

// Get direct messages between current user and another user (legacy)
router.get('/conversation/user/:userId', getDirectMessages as any);

export default router;
