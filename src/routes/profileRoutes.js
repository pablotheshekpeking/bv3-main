import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateImageUrl } from '../middleware/uploadMiddleware.js';
import * as profileController from '../controllers/profileController.js';

const router = express.Router();

router.get('/', authenticateToken, profileController.getProfile);
router.put('/update', authenticateToken, validateImageUrl, profileController.updateProfile);
router.put('/change-password', authenticateToken, profileController.changePassword);

export default router; 