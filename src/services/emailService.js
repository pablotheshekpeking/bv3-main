import nodemailer from 'nodemailer';
import { renderEmailTemplate } from './emailTemplateService.js';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error('SMTP Configuration Error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});

export const sendEmail = async ({ to, subject, html }) => {
  try {
    console.log('Attempting to send email with config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM
    });

    const mailOptions = {
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html,
    };

    console.log('Sending email to:', to);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const sendTemplatedEmail = async (to, templateName, data) => {
  try {
    const { subject, html } = await renderEmailTemplate(templateName, data);
    return sendEmail({ to, subject, html });
  } catch (error) {
    console.error('Error sending templated email:', error);
    throw error;
  }
};

// User-related emails
export const sendWelcomeEmail = async (user) => {
  return sendTemplatedEmail(user.email, 'welcome', {
    firstName: user.firstName,
    verificationCode: user.verificationCode
  });
};

export const sendVerificationEmail = async (user, code) => {
  return sendTemplatedEmail(user.email, 'verification', {
    firstName: user.firstName,
    verificationCode: code
  });
};

// Booking-related emails
export const sendBookingConfirmationEmail = async (booking, user, listingOwner = null) => {
  // Send to booking user
  await sendTemplatedEmail(user.email, 'booking_confirmation', {
    firstName: user.firstName,
    bookingId: booking.id,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    totalPrice: booking.totalPrice,
    listingTitle: booking.listing.title
  });

  // Send to listing owner if provided
  if (listingOwner) {
    await sendTemplatedEmail(listingOwner.email, 'booking_confirmation_owner', {
      firstName: listingOwner.firstName,
      bookingId: booking.id,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalPrice: booking.totalPrice,
      listingTitle: booking.listing.title,
      guestName: `${user.firstName} ${user.lastName}`
    });
  }
};

export const sendBookingCancellationEmail = async (booking, user, listingOwner = null) => {
  // Send to booking user
  await sendTemplatedEmail(user.email, 'booking_cancellation', {
    firstName: user.firstName,
    bookingId: booking.id,
    listingTitle: booking.listing.title
  });

  // Send to listing owner if provided
  if (listingOwner) {
    await sendTemplatedEmail(listingOwner.email, 'booking_cancellation_owner', {
      firstName: listingOwner.firstName,
      bookingId: booking.id,
      listingTitle: booking.listing.title,
      guestName: `${user.firstName} ${user.lastName}`
    });
  }
};

export const sendCheckInReminderEmail = async (booking, user, listingOwner = null) => {
  // Send to booking user
  await sendTemplatedEmail(user.email, 'check_in_reminder', {
    firstName: user.firstName,
    bookingId: booking.id,
    checkIn: booking.checkIn,
    listingTitle: booking.listing.title
  });

  // Send to listing owner if provided
  if (listingOwner) {
    await sendTemplatedEmail(listingOwner.email, 'check_in_reminder_owner', {
      firstName: listingOwner.firstName,
      bookingId: booking.id,
      checkIn: booking.checkIn,
      listingTitle: booking.listing.title,
      guestName: `${user.firstName} ${user.lastName}`
    });
  }
};

// Listing-related emails
export const sendListingCreatedEmail = async (listing, user) => {
  return sendTemplatedEmail(user.email, 'listing_created', {
    firstName: user.firstName,
    listingTitle: listing.title,
    listingId: listing.id
  });
};

export const sendListingUpdatedEmail = async (listing, user) => {
  return sendTemplatedEmail(user.email, 'listing_updated', {
    firstName: user.firstName,
    listingTitle: listing.title,
    listingId: listing.id
  });
};

// Review-related emails
export const sendReviewRequestEmail = async (booking, user) => {
  return sendTemplatedEmail(user.email, 'review_request', {
    firstName: user.firstName,
    bookingId: booking.id,
    listingTitle: booking.listing.title
  });
};

// Payment-related emails
export const sendPaymentConfirmationEmail = async (payment, user) => {
  return sendTemplatedEmail(user.email, 'payment_confirmation', {
    firstName: user.firstName,
    amount: payment.amount,
    reference: payment.reference,
    date: payment.createdAt
  });
};

// Password-related emails
export const sendPasswordResetEmail = async (user, resetToken) => {
  return sendTemplatedEmail(user.email, 'password_reset', {
    firstName: user.firstName,
    resetToken
  });
};

export const sendPasswordChangedEmail = async (user) => {
  return sendTemplatedEmail(user.email, 'password_changed', {
    firstName: user.firstName
  });
};

export const sendBookingOnHoldEmail = async (booking, user, paymentLink, listingOwner = null) => {
  // Send to booking user
  await sendTemplatedEmail(user.email, 'booking_on_hold', {
    firstName: user.firstName,
    bookingId: booking.id,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    totalPrice: booking.totalPrice,
    listingTitle: booking.listing.title,
    paymentLink
  });

  // Send to listing owner if provided
  if (listingOwner) {
    await sendTemplatedEmail(listingOwner.email, 'booking_on_hold_owner', {
      firstName: listingOwner.firstName,
      bookingId: booking.id,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalPrice: booking.totalPrice,
      listingTitle: booking.listing.title,
      guestName: `${user.firstName} ${user.lastName}`,
      paymentLink
    });
  }
};

export const sendNewBookingNotificationEmail = async (booking, listingOwner, guest) => {
  await sendTemplatedEmail(listingOwner.email, 'new_booking_notification', {
    firstName: listingOwner.firstName,
    bookingId: booking.id,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    totalPrice: booking.totalPrice,
    listingTitle: booking.listing.title,
    guestName: `${guest.firstName} ${guest.lastName}`,
    guestEmail: guest.email
  });
}; 