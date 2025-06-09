import { PrismaClient } from '@prisma/client';
import { FlutterwaveService } from '../services/flutterwaveService.js';
import { APIError } from '../utils/errors.js';

const prisma = new PrismaClient();
const flutterwaveService = new FlutterwaveService();

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

    // First verify the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new APIError('User not found', 404);
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

    // Check for existing holds or confirmed bookings
    const existingHold = await prisma.apartmentHold.findFirst({
      where: {
        listingId,
        expiryTime: { gt: new Date() },
        OR: [
          {
            AND: [
              { startDate: { lte: checkInDate } },
              { endDate: { gte: checkInDate } }
            ]
          },
          {
            AND: [
              { startDate: { lte: checkOutDate } },
              { endDate: { gte: checkOutDate } }
            ]
          }
        ]
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    const existingAvailability = await prisma.apartmentAvailability.findFirst({
      where: {
        listingId,
        startDate: { lte: checkInDate },
        endDate: { gte: checkOutDate },
        isBlocked: true
      }
    });

    if (existingHold || existingAvailability) {
      // Log detailed information about the hold
      console.log('Booking hold detected:', {
        listingId,
        checkInDate,
        checkOutDate,
        holdDetails: existingHold ? {
          holdId: existingHold.id,
          holdExpiryTime: existingHold.expiryTime,
          heldBy: existingHold.user ? `${existingHold.user.firstName} ${existingHold.user.lastName}` : 'Unknown user',
          holdStartDate: existingHold.startDate,
          holdEndDate: existingHold.endDate
        } : null,
        availabilityBlocked: existingAvailability ? {
          availabilityId: existingAvailability.id,
          blockedStartDate: existingAvailability.startDate,
          blockedEndDate: existingAvailability.endDate
        } : null,
        timestamp: new Date().toISOString()
      });

      // Calculate time remaining on hold
      const timeRemaining = existingHold ? 
        Math.ceil((new Date(existingHold.expiryTime) - new Date()) / (1000 * 60)) : 0;

      throw new APIError(
        `These dates are currently being held by another user. ${timeRemaining > 0 ? 
          `Please try again in ${timeRemaining} minutes.` : 
          'Please try again in a few minutes.'}`,
        400
      );
    }

    // Create a temporary hold
    const holdExpiryTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    const hold = await prisma.apartmentHold.create({
      data: {
        listingId,
        startDate: checkInDate,
        endDate: checkOutDate,
        userId,
        expiryTime: holdExpiryTime
      }
    });

    // Fetch the availability for the listing
    const availability = await prisma.apartmentAvailability.findFirst({
      where: {
        listingId,
        startDate: { lte: checkInDate },
        endDate: { gte: checkOutDate }
      }
    });

    if (!availability) {
      throw new APIError('No availability found for the selected dates', 400);
    }

    // Calculate total price including service fee
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const basePrice = availability.pricePerNight * nights;
    const totalPrice = basePrice + Number(serviceFee);

    // Create booking with hold reference
    const booking = await prisma.booking.create({
      data: {
        userId,
        listingId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        basePrice,
        serviceFee,
        totalPrice,
        status: 'PENDING',
        holdId: hold.id
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

    // Store the booking ID for the cleanup job
    const bookingId = booking.id;

    // Set up a cleanup job for the hold and booking
    setTimeout(async () => {
      const currentBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { status: true }
      });

      if (currentBooking?.status === 'PENDING') {
        await prisma.$transaction(async (prisma) => {
          // Delete the hold
          await prisma.apartmentHold.delete({
            where: { id: hold.id }
          });

          // Cancel the booking
          await prisma.booking.update({
            where: { id: bookingId },
            data: { 
              status: 'CANCELLED',
              deletedAt: new Date()
            }
          });

          // Release the availability
          await prisma.apartmentAvailability.updateMany({
            where: {
              listingId,
              startDate: { lte: checkInDate },
              endDate: { gte: checkOutDate }
            },
            data: {
              isBlocked: false
            }
          });
        });
      }
    }, 15 * 60 * 1000); // 15 minutes

    // Generate payment reference
    const paymentRef = `BOOK-${booking.id}`;

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        bookingId: booking.id,
        amount: totalPrice,
        reference: paymentRef,
        status: 'PENDING',
        provider: 'FLUTTERWAVE',
        metadata: {
          type: 'booking',
          basePrice,
          serviceFee
        }
      }
    });

    // Initialize Flutterwave transaction
    const flutterwaveResponse = await flutterwaveService.initializeTransaction({
      amount: Number(booking.totalPrice),
      email: booking.user.email,
      firstName: booking.user.firstName,
      lastName: booking.user.lastName,
      reference: paymentRef,
      redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
      metadata: {
        bookingId: booking.id,
        type: 'booking',
        userId: userId
      }
    });

    // Log the complete Flutterwave response
    console.log('Flutterwave Transaction Details:', {
      transactionId: flutterwaveResponse.data.id,
      flwRef: flutterwaveResponse.data.flw_ref,
      status: flutterwaveResponse.data.status,
      paymentType: flutterwaveResponse.data.payment_type,
      amount: flutterwaveResponse.data.amount,
      currency: flutterwaveResponse.data.currency,
      customer: flutterwaveResponse.data.customer,
      card: flutterwaveResponse.data.card,
      createdAt: flutterwaveResponse.data.created_at
    });

    // Update the payment record with Flutterwave details
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        metadata: {
          ...payment.metadata,
          flutterwave: {
            transactionId: flutterwaveResponse.data.id,
            flwRef: flutterwaveResponse.data.flw_ref,
            status: flutterwaveResponse.data.status,
            paymentType: flutterwaveResponse.data.payment_type,
            amount: flutterwaveResponse.data.amount,
            currency: flutterwaveResponse.data.currency,
            customer: flutterwaveResponse.data.customer,
            card: flutterwaveResponse.data.card,
            createdAt: flutterwaveResponse.data.created_at,
            link: flutterwaveResponse.data.link
          }
        }
      }
    });

    // Update the booking with the Flutterwave reference
    await prisma.booking.update({
      where: { id: booking.id },
      data: { 
        paymentRef: paymentRef
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
      },
      payment: {
        authorizationUrl: flutterwaveResponse.data.link,
        reference: paymentRef
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
        OR: [
          // Bookings where user is the guest
          {
            userId: userId,
            deletedAt: null
          },
          // Bookings where user is the owner of the listing
          {
            listing: {
              userId: userId
            },
            deletedAt: null
          }
        ]
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
            userId: true, // Include userId to identify if user is owner
            images: {
              where: { isPrimary: true },
              select: { url: true }
            }
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true
          }
        },
        payments: {
          where: {
            status: 'PENDING'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
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
        },
        payment: booking.payments[0] ? {
          authorizationUrl: booking.payments[0].metadata?.flutterwave?.link,
          reference: booking.payments[0].reference
        } : null,
        // Add a flag to indicate if the current user is the owner
        isOwner: booking.listing.userId === userId
      }))
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bookings' 
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reference } = req.query;
    const userId = req.user.userId;

    const booking = await prisma.booking.findFirst({
      where: { 
        id: bookingId,
        userId,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        },
        payments: {
          where: {
            status: 'PENDING'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (!booking) {
      throw new APIError('Booking not found or not in pending status', 404);
    }

    // Check if there's an existing pending payment
    const existingPayment = booking.payments[0];

    // If reference is provided, verify the payment status
    if (reference) {
      const isPaymentSuccessful = await flutterwaveService.verifyPaymentStatus(reference);
      
      if (isPaymentSuccessful) {
        await prisma.$transaction(async (prisma) => {
          // Update booking status
          await prisma.booking.update({
            where: { id: bookingId },
            data: { 
              status: 'CONFIRMED',
              paymentRef: reference
            }
          });

          // Update payment status
          await prisma.payment.update({
            where: { reference },
            data: { status: 'CONFIRMED' }
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

        return res.json({
          status: 'success',
          message: 'Payment verified successfully',
          booking: { ...booking, status: 'CONFIRMED' }
        });
      }
    }

    // If there's an existing pending payment and it's less than 30 minutes old, return the same URL
    if (existingPayment && 
        (new Date() - new Date(existingPayment.createdAt)) < 30 * 60 * 1000) {
      return res.json({
        status: 'success',
        booking,
        payment: {
          authorizationUrl: existingPayment.metadata?.authorizationUrl,
          reference: existingPayment.reference
        }
      });
    }

    // Create new payment only if no recent pending payment exists
    const paymentRef = `BOOK-${booking.id}-${Date.now()}`;
    const flutterwaveResponse = await flutterwaveService.initializeTransaction({
      amount: Number(booking.totalPrice),
      email: booking.user.email,
      firstName: booking.user.firstName,
      lastName: booking.user.lastName,
      reference: paymentRef,
      redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
      metadata: {
        bookingId: booking.id,
        type: 'booking',
        userId: userId
      }
    });

    await prisma.payment.create({
      data: {
        userId,
        bookingId: booking.id,
        amount: booking.totalPrice,
        reference: paymentRef,
        status: 'PENDING',
        provider: 'FLUTTERWAVE',
        metadata: {
          type: 'booking',
          basePrice: booking.basePrice,
          serviceFee: booking.serviceFee,
          authorizationUrl: flutterwaveResponse.data.link
        }
      }
    });

    res.json({
      status: 'success',
      booking,
      payment: {
        authorizationUrl: flutterwaveResponse.data.link,
        reference: paymentRef
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
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

export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const userId = req.user?.userId;

    // Validate status
    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new APIError('Invalid status', 400);
    }

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            id: true
          }
        }
      }
    });

    if (!booking) {
      throw new APIError('Booking not found', 404);
    }

    // Check if user owns the booking ONLY if userId is present (user request)
    // Skip this check if userId is not present (webhook request)
    if (userId && booking.user.id !== userId) {
      throw new APIError('Unauthorized', 403);
    }

    // Update the booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        listing: {
          select: {
            title: true,
            images: {
              where: { isPrimary: true },
              select: { url: true }
            }
          }
        }
      }
    });

    res.json({
      status: 'success',
      message: 'Booking status updated successfully',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to update booking status'
    });
  }
}; 