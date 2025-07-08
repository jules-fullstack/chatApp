import express from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
} from '../controllers/authController';
import {
  ensureAuthenticated,
  ensureNotAuthenticated,
} from '../middlewares/auth';

const router = express.Router();

router.post('/register', ensureNotAuthenticated, register);

router.post('/login', ensureNotAuthenticated, login);

router.post('/logout', ensureAuthenticated, logout);

router.get('/user', ensureAuthenticated, getCurrentUser);

export default router;
