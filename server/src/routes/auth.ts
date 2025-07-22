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
} from '../middlewares/auth';

const router = express.Router();

router.post('/register', ensureNotAuthenticated, register);

router.post('/login', ensureNotAuthenticated, login);

router.post('/verify-otp', ensureNotAuthenticated, verifyOTP);

router.post('/resend-otp', ensureNotAuthenticated, resendOTP);

router.post('/logout', ensureAuthenticated, logout);

router.get('/user', ensureAuthenticated, getCurrentUser);

router.get('/check', getCurrentUser);

router.get('/check-pending', (req, res) => {
  if (req.session.pendingUser) {
    res.status(200).json({ pending: true, email: req.session.pendingUser.email });
  } else {
    res.status(404).json({ pending: false });
  }
});

router.get('/check-invitation', checkInvitation);

export default router;
