import { PrismaClient } from '@prisma/client';
import { PaystackService } from '../services/paystackService.js';
import { APIError } from '../utils/errors.js';

const prisma = new PrismaClient();
const paystackService = new PaystackService();

export const createBooking = async (req, res) => {
  try {
    const { listingId, checkIn, checkOut, serviceFee } = req.body;
    const userId = req.user.userId;

    // Validate service fee
    if (!serviceFee || serviceFee <= 0) {
      throw new APIError('Invalid service fee', 400);
    }

    // Check for existing pending bookings for these dates
    const existingBooking = await prisma.booking.findFirst({
      where: {
        userId,
        listingId,
        status: 'PENDING',
        OR: [
          {
            AND: [
              { checkIn: { lte: new Date(checkIn) } },
              { checkOut: { gte: new Date(checkIn) } }
            ]
          },
          {
            AND: [
              { checkIn: { lte: new Date(checkOut) } },
              { checkOut: { gte: new Date(checkOut) } }
            ]
          }
        ]
      }
    });

    if (existingBooking) {
      throw new APIError('You already have a pending booking for these dates', 400);
    }

    // Verify the listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId }
    });

    if (!listing) {
      throw new APIError('Listing not found', 404);
    }

    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkInDate >= checkOutDate) {
      throw new APIError('Invalid date range', 400);
    }

    // Check availability
    const availability = await prisma.apartmentAvailability.findFirst({
      where: {
        listingId,
        startDate: { lte: checkInDate },
        endDate: { gte: checkOutDate },
        isBlocked: false
      }
    });

    if (!availability) {
      throw new APIError('Dates not available', 400);
    }

    // Calculate total price including service fee
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const basePrice = availability.pricePerNight * nights;
    const totalPrice = basePrice + Number(serviceFee);

    // Create booking with PENDING status
    const booking = await prisma.booking.create({
      data: {
        userId,
        listingId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        basePrice,
        serviceFee,
        totalPrice,
        status: 'PENDING'
      },
      include: {
        listing: {
          select: {
            title: true,
            images: {
              where: { isPrimary: true },
              select: { url: true }
            }
          }
        },
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      booking: {
        ...booking,
        priceBreakdown: {
          basePrice,
          serviceFee,
          totalPrice
        }
      }
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(error.statusCode || 500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const bookings = await prisma.booking.findMany({
      where: {
        userId: userId,
        deletedAt: null
      },
      include: {
        listing: {
          select: {
            title: true,
            type: true,
            price: true,
            currency: true,
            location: true,
            metadata: true,
            images: {
              where: { isPrimary: true },
              select: { url: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      status: 'success',
      bookings: bookings.map(booking => ({
        ...booking,
        listing: {
          ...booking.listing,
          primaryImage: booking.listing.images[0]?.url
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bookings' 
    });
  }
};

export const confirmBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { transactionId } = req.body;
    const userId = req.user.userId;

    const booking = await prisma.booking.findFirst({
      where: { 
        id: bookingId,
        userId,
        status: 'PENDING'
      }
    });

    if (!booking) {
      throw new APIError('Booking not found or not in pending status', 404);
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        bookingId: booking.id,
        amount: booking.totalPrice,
        reference: transactionId,
        status: 'CONFIRMED',
        metadata: {
          type: 'booking',
          basePrice: booking.basePrice,
          serviceFee: booking.serviceFee
        }
      }
    });

    // Update booking status and block dates
    await prisma.$transaction(async (prisma) => {
      // Update booking status
      await prisma.booking.update({
        where: { id: bookingId },
        data: { 
          status: 'CONFIRMED',
          paymentRef: transactionId
        }
      });

      // Block the dates in availability
      await prisma.apartmentAvailability.updateMany({
        where: {
          listingId: booking.listingId,
          startDate: { lte: booking.checkIn },
          endDate: { gte: booking.checkOut }
        },
        data: {
          isBlocked: true
        }
      });
    });

    res.json({
      status: 'success',
      message: 'Booking confirmed successfully',
      booking: { ...booking, status: 'CONFIRMED' }
    });
  } catch (error) {
    console.error('Booking confirmation error:', error);
    res.status(error.statusCode || 500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId;

    const booking = await prisma.booking.findFirst({
      where: { 
        id: bookingId,
        userId,
        deletedAt: null
      }
    });

    if (!booking) {
      throw new APIError('Booking not found', 404);
    }

    // Soft delete the booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        deletedAt: new Date(),
        status: 'CANCELLED'
      }
    });

    res.json({
      status: 'success',
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(error.statusCode || 500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}; 