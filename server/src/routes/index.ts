import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './userRoutes';
import messageRoutes from './messageRoutes';
import mediaRoutes from './mediaRoutes';
import conversationRoutes from './conversationRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/messages', messageRoutes);
router.use('/media', mediaRoutes);
router.use('/conversations', conversationRoutes);

export default router;
