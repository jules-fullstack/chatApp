import express from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
  verifyOTP,
  resendOTP,
  checkInvitation,
} from '../controllers/authController';
import {
  ensureAuthenticated,
  ensureNotAuthenticated,
  ensureUserExists,
  validatePendingSession,
  validateRegister,
  validateLogin,
  validateOTP,
  validateEmail,
} from '../middlewares/auth';
import {
  validateInvitationToken,
  requireValidInvitationToken,
} from '../middlewares/invitationAuth';

const router = express.Router();

router.post(
  '/register',
  ensureNotAuthenticated,
  validateRegister,
  validateInvitationToken,
  register,
);

router.post('/login', ensureNotAuthenticated, validateLogin, login);

router.post(
  '/verify-otp',
  ensureNotAuthenticated,
  validateOTP,
  ensureUserExists,
  validatePendingSession,
  verifyOTP,
);

router.post(
  '/resend-otp',
  ensureNotAuthenticated,
  validateEmail,
  ensureUserExists,
  validatePendingSession,
  resendOTP,
);

router.post('/logout', ensureAuthenticated, logout);

router.get('/user', ensureAuthenticated, getCurrentUser);

router.get('/check', getCurrentUser);

router.get('/check-pending', (req, res) => {
  if (req.session.pendingUser) {
    res
      .status(200)
      .json({ pending: true, email: req.session.pendingUser.email });
  } else {
    res.status(200).json({ pending: false });
  }
});

router.get(
  '/check-invitation',
  ...requireValidInvitationToken,
  checkInvitation,
);

export default router;
