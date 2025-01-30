import express from 'express';
import { sendVerificationCodeHandler, verifyCodeHandler } from '../controllers/verificationController.js';

const router = express.Router();

router.post('/send', sendVerificationCodeHandler);
router.post('/verify', verifyCodeHandler);

export default router; 