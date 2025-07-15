import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './userRoutes';
import messageRoutes from './messageRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/messages', messageRoutes);

export default router;
