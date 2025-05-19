import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  createBooking, 
  getUserBookings,
  confirmBooking,
  deleteBooking
} from '../controllers/bookingController.js';

const router = express.Router();

router.post('/', authenticateToken, createBooking);
router.get('/my-bookings', authenticateToken, getUserBookings);
router.post('/:bookingId/confirm', authenticateToken, confirmBooking);
router.delete('/:bookingId', authenticateToken, deleteBooking);

export default router; 