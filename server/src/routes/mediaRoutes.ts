import express from 'express';
import {
  uploadMedia,
  deleteMedia,
  getMediaByParent,
  uploadImages,
} from '../controllers/mediaController.js';
import { ensureAuthenticated } from '../middlewares/auth.js';
import {
  imageUpload,
  validateImageBatch,
} from '../middlewares/imageValidation.js';
import {
  uploadMiddleware,
  validateFileUpload,
  validateMultipleFiles,
  validateMediaUploadFields,
  validateParentExists,
  validateMediaExists,
  validateMediaOwnership,
  validateGetMediaParams,
} from '../middlewares/mediaValidation.js';

const router = express.Router();

// Upload media with comprehensive validation
router.post(
  '/upload',
  ensureAuthenticated,
  uploadMiddleware,
  validateFileUpload,
  validateMediaUploadFields,
  validateParentExists,
  uploadMedia as any,
);

// Delete media with ownership validation
router.delete(
  '/:mediaId',
  ensureAuthenticated,
  validateMediaExists,
  validateMediaOwnership, // Optional: remove if not needed
  deleteMedia as any,
);

// Get media by parent with parameter validation
router.get(
  '/:parentType/:parentId',
  validateGetMediaParams,
  getMediaByParent as any,
);

// Image upload route (moved from messageRoutes) with file validation
router.post(
  '/upload-images',
  ensureAuthenticated,
  imageUpload.array('images'),
  validateMultipleFiles,
  validateImageBatch,
  uploadImages as any,
);

export default router;
