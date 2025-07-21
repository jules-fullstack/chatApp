import express from 'express';
import { searchUsers } from '../controllers/userSearchController.js';
import { updateProfile, getProfile, uploadAvatar, getAllUsers, blockUser, unblockUser } from '../controllers/userController.js';
import { ensureAuthenticated } from '../middlewares/auth.js';
import { imageUpload } from '../middleware/imageValidation.js';

const router = express.Router();

router.get('/search', ensureAuthenticated, searchUsers as any);
router.get('/profile', ensureAuthenticated, getProfile);
router.put('/profile', ensureAuthenticated, updateProfile);
router.post('/upload-avatar', ensureAuthenticated, imageUpload.single('avatar'), uploadAvatar);

// Admin routes
router.get('/admin/all', ensureAuthenticated, getAllUsers);
router.post('/admin/block/:userId', ensureAuthenticated, blockUser);
router.post('/admin/unblock/:userId', ensureAuthenticated, unblockUser);

export default router;
