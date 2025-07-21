import express from 'express';
import { uploadMedia, deleteMedia, getMediaByParent, uploadMiddleware } from '../controllers/mediaController.js';
import { ensureAuthenticated } from '../middlewares/auth.js';

const router = express.Router();

router.post('/upload', ensureAuthenticated, uploadMiddleware, uploadMedia as any);
router.delete('/:mediaId', ensureAuthenticated, deleteMedia as any);
router.get('/:parentType/:parentId', getMediaByParent as any);

export default router;