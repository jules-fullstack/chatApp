import express from 'express';
import { searchUsers } from '../controllers/userSearchController.js';
import { ensureAuthenticated } from '../middlewares/auth.js';

const router = express.Router();

router.get('/search', ensureAuthenticated, searchUsers as any);

export default router;
