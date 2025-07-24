import { Router } from 'express';
import { ensureAuthenticated } from '../middlewares/auth.js';
import { validateSendMessage } from '../middlewares/messageValidation.js';
import {
  imageUpload,
  validateImageBatch,
} from '../middlewares/imageValidation.js';
import {
  sendMessage,
  getMessages,
  getDirectMessages,
  getConversations,
  markAsRead,
  migrateConversations,
  updateGroupName,
  leaveGroup,
  addMembersToGroup,
  changeGroupAdmin,
  removeMemberFromGroup,
  uploadImages,
} from '../controllers/messageController.js';

const router = Router();

// All message routes require authentication
router.use(ensureAuthenticated);

// Send a message
router.post('/send', ...validateSendMessage, sendMessage as any);

// Upload images
router.post(
  '/upload-images',
  imageUpload.array('images'),
  validateImageBatch,
  uploadImages as any,
);

// Get messages for a conversation
router.get('/conversation/:conversationId', getMessages as any);

// Get direct messages between current user and another user (legacy)
router.get('/conversation/user/:userId', getDirectMessages as any);

// Get all conversations for current user
router.get('/conversations', getConversations as any);

// Mark conversation as read
router.patch('/conversation/:conversationId/read', markAsRead as any);

// Update group name
router.patch(
  '/conversation/:conversationId/group-name',
  updateGroupName as any,
);

// Leave group
router.post('/conversation/:conversationId/leave', leaveGroup as any);

// Add members to group
router.post(
  '/conversation/:conversationId/add-members',
  addMembersToGroup as any,
);

// Change group admin
router.patch(
  '/conversation/:conversationId/change-admin',
  changeGroupAdmin as any,
);

// Remove member from group
router.post(
  '/conversation/:conversationId/remove-member',
  removeMemberFromGroup as any,
);

// Migration endpoint - remove this after migration is complete
router.post('/migrate', migrateConversations as any);

export default router;
