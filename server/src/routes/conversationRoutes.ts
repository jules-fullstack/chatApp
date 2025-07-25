import express from 'express';
import {
  getAllGroupConversations,
  updateGroupPhoto,
  inviteUnregisteredUsers,
  getConversations,
  markAsRead,
  updateGroupName,
  leaveGroup,
  addMembersToGroup,
  changeGroupAdmin,
  removeMemberFromGroup,
} from '../controllers/conversationController.js';
import { ensureAuthenticated } from '../middlewares/auth.js';
import { ensureRole } from '../middlewares/ensureRole.js';
import {
  singleImageUpload,
  validateSingleImage,
} from '../middlewares/imageValidation.js';
import { requireConversationAccess } from '../middlewares/conversationAuth.js';
import {
  requireGroupConversation,
  requireGroupAdmin,
  requireGroupMembership,
  preventSelfModification,
  validateUsersExist,
  validateUserExists,
} from '../middlewares/groupValidation.js';
import {
  validateInvitationEmails,
  checkExistingUsers,
  checkExistingInvitations,
} from '../middlewares/invitationValidation.js';

const router = express.Router();

// Admin routes
router.get('/admin/groups', ensureRole('superAdmin'), getAllGroupConversations);

// Group photo routes
router.put(
  '/:conversationId/photo',
  ensureAuthenticated,
  requireConversationAccess,
  requireGroupConversation,
  requireGroupAdmin,
  singleImageUpload.single('groupPhoto'),
  validateSingleImage,
  updateGroupPhoto,
);

// Invitation routes
router.post(
  '/:conversationId/invite-unregistered',
  ensureAuthenticated,
  requireConversationAccess,
  requireGroupConversation,
  requireGroupAdmin,
  validateInvitationEmails,
  checkExistingUsers,
  checkExistingInvitations,
  inviteUnregisteredUsers,
);

// User conversation routes (moved from messageRoutes)
// Get all conversations for current user
router.get('/', ensureAuthenticated, getConversations);

// Mark conversation as read
router.patch(
  '/:conversationId/read',
  ensureAuthenticated,
  requireConversationAccess,
  markAsRead,
);

// Update group name
router.patch(
  '/:conversationId/name',
  ensureAuthenticated,
  requireConversationAccess,
  requireGroupConversation,
  updateGroupName,
);

// Leave group
router.post(
  '/:conversationId/leave',
  ensureAuthenticated,
  requireConversationAccess,
  requireGroupConversation,
  leaveGroup,
);

// Add members to group
router.post(
  '/:conversationId/members',
  ensureAuthenticated,
  requireConversationAccess,
  requireGroupConversation,
  requireGroupAdmin,
  validateUsersExist('userIds'),
  addMembersToGroup,
);

// Change group admin
router.patch(
  '/:conversationId/admin',
  ensureAuthenticated,
  requireConversationAccess,
  requireGroupConversation,
  requireGroupAdmin,
  validateUserExists('newAdminId'),
  requireGroupMembership('newAdminId'),
  changeGroupAdmin,
);

// Remove member from group
router.post(
  '/:conversationId/members/:userToRemoveId',
  ensureAuthenticated,
  requireConversationAccess,
  requireGroupConversation,
  requireGroupAdmin,
  (req, res, next) => {
    // Move userToRemoveId from params to body for middleware compatibility
    req.body.userToRemoveId = req.params.userToRemoveId;
    next();
  },
  validateUserExists('userToRemoveId'),
  requireGroupMembership('userToRemoveId'),
  preventSelfModification('userToRemoveId'),
  removeMemberFromGroup,
);

export default router;
