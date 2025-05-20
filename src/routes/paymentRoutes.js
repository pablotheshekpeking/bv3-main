import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { initializeFlutterwavePayment } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/flutterwave/initialize', authenticateToken, initializeFlutterwavePayment);

export default router;
