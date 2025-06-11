import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  createBooking, 
  getUserBookings,
  verifyPayment,
  deleteBooking,
  updateBookingStatus,
  confirmCheckIn
} from '../controllers/bookingController.js';

const router = express.Router();

router.post('/', authenticateToken, createBooking);
router.get('/my-bookings', authenticateToken, getUserBookings);
router.post('/:bookingId/verify-payment', authenticateToken, verifyPayment);
router.delete('/:bookingId', authenticateToken, deleteBooking);
router.patch('/:bookingId/status', authenticateToken, updateBookingStatus);
router.post('/:bookingId/check-in', authenticateToken, confirmCheckIn);

export default router; 