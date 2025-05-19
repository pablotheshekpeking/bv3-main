import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  createBooking, 
  getUserBookings,
  verifyPayment,
  deleteBooking
} from '../controllers/bookingController.js';

const router = express.Router();

router.post('/', authenticateToken, createBooking);
router.get('/my-bookings', authenticateToken, getUserBookings);
router.post('/:bookingId/verify-payment', authenticateToken, verifyPayment);
router.delete('/:bookingId', authenticateToken, deleteBooking);

export default router; 