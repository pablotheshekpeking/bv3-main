import admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

// Initialize Firebase Admin using environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  projectId: process.env.FIREBASE_PROJECT_ID
});

export const sendNotification = async (userId, title, body, data = {}) => {
  try {
    // Get user's FCM token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true }
    });

    if (!user?.fcmToken) {
      console.log(`No FCM token found for user ${userId}`);
      return;
    }

    const message = {
      notification: {
        title,
        body
      },
      data,
      token: user.fcmToken
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

// Specific notification functions for your use cases
export const sendBookingNotification = async (bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: {
        include: {
          user: true
        }
      },
      user: true
    }
  });

  if (!booking) return;

  // Notify listing owner
  await sendNotification(
    booking.listing.userId,
    'New Booking',
    `${booking.user.firstName} has booked your listing: ${booking.listing.title}`,
    {
      type: 'BOOKING',
      bookingId: booking.id
    }
  );

  // Notify guest
  await sendNotification(
    booking.userId,
    'Booking Confirmed',
    `Your booking for ${booking.listing.title} has been confirmed`,
    {
      type: 'BOOKING',
      bookingId: booking.id
    }
  );
};

export const sendListingFullyBookedNotification = async (listingId) => {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      user: true
    }
  });

  if (!listing) return;

  await sendNotification(
    listing.userId,
    'Listing Fully Booked',
    `Your listing "${listing.title}" is now fully booked!`,
    {
      type: 'LISTING_FULLY_BOOKED',
      listingId: listing.id
    }
  );
};

export const sendHoldCancelledNotification = async (holdId) => {
  const hold = await prisma.apartmentHold.findUnique({
    where: { id: holdId },
    include: {
      listing: true,
      user: true
    }
  });

  if (!hold) return;

  await sendNotification(
    hold.userId,
    'Hold Cancelled',
    `Your hold on ${hold.listing.title} has been cancelled`,
    {
      type: 'HOLD_CANCELLED',
      holdId: hold.id,
      listingId: hold.listingId
    }
  );
}; 