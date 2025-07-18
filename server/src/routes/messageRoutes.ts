import { Router } from 'express';
import { ensureAuthenticated } from '../middlewares/auth.js';
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
} from '../controllers/messageController.js';

const router = Router();

// All message routes require authentication
router.use(ensureAuthenticated);

// Send a message
router.post('/send', sendMessage);

// Get messages for a conversation
router.get('/conversation/:conversationId', getMessages);

// Get direct messages between current user and another user (legacy)
router.get('/conversation/user/:userId', getDirectMessages);

// Get all conversations for current user
router.get('/conversations', getConversations);

// Mark conversation as read
router.patch('/conversation/:conversationId/read', markAsRead);

// Update group name
router.patch('/conversation/:conversationId/group-name', updateGroupName);

// Leave group
router.post('/conversation/:conversationId/leave', leaveGroup);

// Add members to group
router.post('/conversation/:conversationId/add-members', addMembersToGroup);

// Change group admin
router.patch('/conversation/:conversationId/change-admin', changeGroupAdmin);

// Remove member from group
router.post('/conversation/:conversationId/remove-member', removeMemberFromGroup);

// Migration endpoint - remove this after migration is complete
router.post('/migrate', migrateConversations);

export default router;
