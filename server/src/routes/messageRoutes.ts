import { Router } from 'express';
import { ensureAuthenticated } from '../middlewares/auth.js';
import {
  sendMessage,
  getMessages,
  getConversations,
  markAsRead,
} from '../controllers/messageController.js';

const router = Router();

// All message routes require authentication
router.use(ensureAuthenticated);

// Send a message
router.post('/send', sendMessage);

// Get messages between current user and another user
router.get('/conversation/:userId', getMessages);

// Get all conversations for current user
router.get('/conversations', getConversations);

// Mark message as read
router.patch('/:messageId/read', markAsRead);

export default router;
