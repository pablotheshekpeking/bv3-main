import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { becomeVendor } from '../controllers/vendorController.js';

const router = express.Router();

router.post('/become-vendor', authenticateToken, becomeVendor);

export default router; 