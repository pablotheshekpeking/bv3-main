import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as offerController from '../controllers/offerController.js';

const router = express.Router();

router.post('/create', authenticateToken, offerController.createOffer);
router.put('/:offerId/respond', authenticateToken, offerController.respondToOffer);
router.put('/:offerId/complete', authenticateToken, offerController.markOfferCompleted);
router.get('/my-offers', authenticateToken, offerController.getMyOffers);

export default router; 