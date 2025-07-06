import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateImageUrl } from '../middleware/uploadMiddleware.js';
import { submitKYC, verifyKYC, getKYCStatus } from '../controllers/kycController.js';

const router = express.Router();

// Add logging middleware
router.use((req, res, next) => {
  console.log('🔍 KYC Route - Request:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: {
      authorization: req.headers.authorization ? 'Bearer [TOKEN]' : 'No token'
    }
  });
  next();
});

// Submit KYC documents - Use the controller function
router.post('/submit', authenticateToken, validateImageUrl, submitKYC);

// Get KYC status
router.get('/status', authenticateToken, getKYCStatus);

// Verify KYC (admin only)
router.post('/verify', authenticateToken, verifyKYC);

export default router; 