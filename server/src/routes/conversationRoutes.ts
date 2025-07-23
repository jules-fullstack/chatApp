import express from 'express';
import {
  getAllGroupConversations,
  updateGroupPhoto,
  inviteUnregisteredUsers,
} from '../controllers/conversationController.js';
import { ensureAuthenticated } from '../middlewares/auth.js';
import {
  singleImageUpload,
  validateSingleImage,
} from '../middlewares/imageValidation.js';

const router = express.Router();

// Admin routes
router.get('/admin/groups', ensureAuthenticated, getAllGroupConversations);

// Group photo routes
router.put(
  '/:conversationId/photo',
  ensureAuthenticated,
  singleImageUpload.single('groupPhoto'),
  validateSingleImage,
  updateGroupPhoto,
);

// Invitation routes
router.post(
  '/:conversationId/invite-unregistered',
  ensureAuthenticated,
  inviteUnregisteredUsers,
);

export default router;
