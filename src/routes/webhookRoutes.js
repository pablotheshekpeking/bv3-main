import express from 'express';
import { handleFlutterwaveWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post('/flutterwave', handleFlutterwaveWebhook);

export default router;
