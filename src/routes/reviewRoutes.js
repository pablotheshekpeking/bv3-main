import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as reviewController from '../controllers/reviewController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Create a new review
router.post('/', reviewController.createReview);

// Get reviews for a user
router.get('/user/:userId', reviewController.getUserReviews);

// Get reviews for a listing
router.get('/listing/:listingId', reviewController.getListingReviews);

// Get user's average rating
router.get('/user/:userId/rating', reviewController.getUserRating);

export default router; 