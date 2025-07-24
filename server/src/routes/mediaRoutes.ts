import express from 'express';
import { uploadMedia, deleteMedia, getMediaByParent, uploadMiddleware, uploadImages } from '../controllers/mediaController.js';
import { ensureAuthenticated } from '../middlewares/auth.js';
import {
  imageUpload,
  validateImageBatch,
} from '../middlewares/imageValidation.js';

const router = express.Router();

router.post('/upload', ensureAuthenticated, uploadMiddleware, uploadMedia as any);
router.delete('/:mediaId', ensureAuthenticated, deleteMedia as any);
router.get('/:parentType/:parentId', getMediaByParent as any);

// Image upload route (moved from messageRoutes)
router.post(
  '/upload-images',
  ensureAuthenticated,
  imageUpload.array('images'),
  validateImageBatch,
  uploadImages as any,
);

export default router;