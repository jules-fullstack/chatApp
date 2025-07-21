import express from 'express';
import { getAllGroupConversations } from '../controllers/conversationController.js';
import { ensureAuthenticated } from '../middlewares/auth.js';

const router = express.Router();

// Admin routes
router.get('/admin/groups', ensureAuthenticated, getAllGroupConversations);

export default router;