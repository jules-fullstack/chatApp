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
import {
  validateEmailForOTP,
} from '../middlewares/emailValidation';
import {
  loginRateLimit,
  registerRateLimit,
  otpRateLimit,
  recordAuthAttempt,
} from '../middlewares/authRateLimit';

const router = express.Router();

router.post(
  '/register',
  ensureNotAuthenticated,
  registerRateLimit,
  recordAuthAttempt,
  validateRegister,
  validateEmailForOTP,
  validateInvitationToken,
  register,
);

router.post('/login', ensureNotAuthenticated, loginRateLimit, recordAuthAttempt, validateLogin, login);

router.post(
  '/verify-otp',
  ensureNotAuthenticated,
  otpRateLimit,
  recordAuthAttempt,
  validateOTP,
  ensureUserExists,
  validatePendingSession,
  verifyOTP,
);

router.post(
  '/resend-otp',
  ensureNotAuthenticated,
  validateEmail,
  validateEmailForOTP,
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
