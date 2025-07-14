import { Router } from 'express';
import authRoutes from './auth';
import userSearchRoutes from './userSearchRoutes';
import messageRoutes from './messageRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userSearchRoutes);
router.use('/messages', messageRoutes);

export default router;
