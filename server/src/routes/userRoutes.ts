import express from 'express';
import { searchUsers } from '../controllers/userSearchController.js';
import { updateProfile, getProfile, uploadAvatar } from '../controllers/userController.js';
import { ensureAuthenticated } from '../middlewares/auth.js';
import { imageUpload } from '../middleware/imageValidation.js';

const router = express.Router();

router.get('/search', ensureAuthenticated, searchUsers as any);
router.get('/profile', ensureAuthenticated, getProfile);
router.put('/profile', ensureAuthenticated, updateProfile);
router.post('/upload-avatar', ensureAuthenticated, imageUpload.single('avatar'), uploadAvatar);

export default router;
