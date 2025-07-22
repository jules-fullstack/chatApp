import express from 'express';
import { getAllGroupConversations, updateGroupPhoto } from '../controllers/conversationController.js';
import { ensureAuthenticated } from '../middlewares/auth.js';
import { singleImageUpload, validateSingleImage } from '../middleware/imageValidation.js';

const router = express.Router();

// Admin routes
router.get('/admin/groups', ensureAuthenticated, getAllGroupConversations);

// Group photo routes
router.put(
  '/:conversationId/photo',
  ensureAuthenticated,
  singleImageUpload.single('groupPhoto'),
  validateSingleImage,
  updateGroupPhoto
);

export default router;