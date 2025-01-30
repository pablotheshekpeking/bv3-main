import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as messageController from '../controllers/messageController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

router.post('/send', messageController.sendMessage);
router.get('/conversation/:otherUserId', messageController.getConversation);
router.put('/:messageId/read', messageController.markAsRead);
router.get('/unread/count', messageController.getUnreadCount);
router.get('/conversations', messageController.getConversations);

export default router; 