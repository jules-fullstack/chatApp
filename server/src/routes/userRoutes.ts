import express from 'express';
import {
  updateProfile,
  getProfile,
  uploadAvatar,
  getAllUsers,
  blockUser,
  unblockUser,
  blockUserIndividual,
  unblockUserIndividual,
  getBlockedUsers,
  checkIfBlockedBy,
  searchUsers,
} from '../controllers/userController.js';
import { ensureAuthenticated } from '../middlewares/auth.js';
import { ensureRole } from '../middlewares/ensureRole.js';
import { imageUpload } from '../middlewares/imageValidation.js';
import { validateQuery } from '../middlewares/zodValidation.js';
import { userSearchQuerySchema } from '../schemas/validations.js';
import {
  validateProfileUpdate,
  validateUsernameAvailable,
  validateCurrentPassword,
  validateUserIdParam,
  preventSelfAction,
  validateTargetUserExists,
  preventAdminBlocking,
  checkAlreadyBlocked,
  checkNotBlocked,
  checkAlreadyIndividuallyBlocked,
  checkNotIndividuallyBlocked,
  ensureUserInstance,
} from '../middlewares/userValidation.js';

const router = express.Router();

router.get(
  '/search',
  ensureAuthenticated,
  validateQuery(userSearchQuerySchema),
  searchUsers as any,
);
router.get('/profile', ensureAuthenticated, getProfile);
router.put(
  '/profile',
  ensureAuthenticated,
  validateProfileUpdate,
  validateUsernameAvailable,
  validateCurrentPassword,
  ensureUserInstance,
  updateProfile,
);
router.post(
  '/upload-avatar',
  ensureAuthenticated,
  imageUpload.single('avatar'),
  uploadAvatar,
);

// Individual user blocking routes
router.post(
  '/block/:userId',
  ensureAuthenticated,
  validateUserIdParam(),
  preventSelfAction(),
  validateTargetUserExists(),
  checkAlreadyIndividuallyBlocked,
  blockUserIndividual,
);
router.post(
  '/unblock/:userId',
  ensureAuthenticated,
  validateUserIdParam(),
  validateTargetUserExists(),
  checkNotIndividuallyBlocked,
  unblockUserIndividual,
);
router.get('/blocked', ensureAuthenticated, getBlockedUsers);
router.get(
  '/check-blocked-by/:userId',
  ensureAuthenticated,
  validateUserIdParam(),
  checkIfBlockedBy,
);

// Admin routes
router.get(
  '/admin/all',
  ensureAuthenticated,
  ensureRole('superAdmin'),
  getAllUsers,
);
router.post(
  '/admin/block/:userId',
  ensureAuthenticated,
  ensureRole('superAdmin'),
  validateUserIdParam(),
  validateTargetUserExists(),
  preventAdminBlocking,
  checkAlreadyBlocked,
  blockUser,
);
router.post(
  '/admin/unblock/:userId',
  ensureAuthenticated,
  ensureRole('superAdmin'),
  validateUserIdParam(),
  validateTargetUserExists(),
  checkNotBlocked,
  unblockUser,
);

export default router;
