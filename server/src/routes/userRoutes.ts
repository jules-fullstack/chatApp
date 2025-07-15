import express from 'express';
import { searchUsers } from '../controllers/userSearchController.js';
import { updateProfile, getProfile } from '../controllers/userController.js';
import { ensureAuthenticated } from '../middlewares/auth.js';

const router = express.Router();

router.get('/search', ensureAuthenticated, searchUsers as any);
router.get('/profile', ensureAuthenticated, getProfile);
router.put('/profile', ensureAuthenticated, updateProfile);

export default router;
