import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 5px;
        }
        .content {
            padding: 20px;
            background: #ffffff;
            border-radius: 5px;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 0.8em;
            color: #666;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 0;
        }
        .details {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>{{appName}}</h2>
    </div>
    <div class="content">
        <h3>{{title}}</h3>
        {{{content}}}
    </div>
    <div class="footer">
        <p>© {{year}} {{appName}}. All rights reserved.</p>
        <p>If you didn't request this email, please ignore it.</p>
    </div>
</body>
</html>
`;

export const emailTemplates = {
    welcome: {
        subject: 'Welcome to {{appName}}',
        content: `
            <p>Hi {{firstName}},</p>
            <p>Welcome to {{appName}}! We're excited to have you on board.</p>
            <p>To get started, please verify your email address:</p>
            <p style="text-align: center;">
                <strong>Your verification code is: {{verificationCode}}</strong>
            </p>
            <p>This code will expire in 15 minutes.</p>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    verification: {
        subject: 'Verify Your Email',
        content: `
            <p>Hi {{firstName}},</p>
            <p>Your verification code is:</p>
            <p style="text-align: center; font-size: 24px; padding: 20px;">
                <strong>{{verificationCode}}</strong>
            </p>
            <p>This code will expire in 15 minutes.</p>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    booking_confirmation: {
        subject: 'Booking Confirmation - {{listingTitle}}',
        content: `
            <p>Hi {{firstName}},</p>
            <p>Your booking has been confirmed!</p>
            <div class="details">
                <p><strong>Booking ID:</strong> {{bookingId}}</p>
                <p><strong>Check-in:</strong> {{checkIn}}</p>
                <p><strong>Check-out:</strong> {{checkOut}}</p>
                <p><strong>Total Amount:</strong> {{totalPrice}}</p>
            </div>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    booking_cancellation: {
        subject: 'Booking Cancelled - {{listingTitle}}',
        content: `
            <p>Hi {{firstName}},</p>
            <p>Your booking has been cancelled.</p>
            <div class="details">
                <p><strong>Booking ID:</strong> {{bookingId}}</p>
                <p><strong>Listing:</strong> {{listingTitle}}</p>
            </div>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    check_in_reminder: {
        subject: 'Check-in Reminder - {{listingTitle}}',
        content: `
            <p>Hi {{firstName}},</p>
            <p>This is a reminder about your upcoming check-in.</p>
            <div class="details">
                <p><strong>Booking ID:</strong> {{bookingId}}</p>
                <p><strong>Check-in Date:</strong> {{checkIn}}</p>
                <p><strong>Listing:</strong> {{listingTitle}}</p>
            </div>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    listing_created: {
        subject: 'Listing Created Successfully',
        content: `
            <p>Hi {{firstName}},</p>
            <p>Your listing has been created successfully!</p>
            <div class="details">
                <p><strong>Listing ID:</strong> {{listingId}}</p>
                <p><strong>Title:</strong> {{listingTitle}}</p>
            </div>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    listing_updated: {
        subject: 'Listing Updated',
        content: `
            <p>Hi {{firstName}},</p>
            <p>Your listing has been updated successfully.</p>
            <div class="details">
                <p><strong>Listing ID:</strong> {{listingId}}</p>
                <p><strong>Title:</strong> {{listingTitle}}</p>
            </div>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    review_request: {
        subject: 'Share Your Experience - {{listingTitle}}',
        content: `
            <p>Hi {{firstName}},</p>
            <p>We hope you enjoyed your stay at {{listingTitle}}!</p>
            <p>Would you mind taking a moment to share your experience? Your feedback helps our community make better decisions.</p>
            <div class="details">
                <p><strong>Booking ID:</strong> {{bookingId}}</p>
                <p><strong>Listing:</strong> {{listingTitle}}</p>
            </div>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    payment_confirmation: {
        subject: 'Payment Confirmation',
        content: `
            <p>Hi {{firstName}},</p>
            <p>Your payment has been confirmed.</p>
            <div class="details">
                <p><strong>Amount:</strong> {{amount}}</p>
                <p><strong>Reference:</strong> {{reference}}</p>
                <p><strong>Date:</strong> {{date}}</p>
            </div>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    password_reset: {
        subject: 'Password Reset Request',
        content: `
            <p>Hi {{firstName}},</p>
            <p>We received a request to reset your password.</p>
            <p>Your reset token is:</p>
            <p style="text-align: center; font-size: 24px; padding: 20px;">
                <strong>{{resetToken}}</strong>
            </p>
            <p>This token will expire in 15 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    password_changed: {
        subject: 'Password Changed Successfully',
        content: `
            <p>Hi {{firstName}},</p>
            <p>Your password has been changed successfully.</p>
            <p>If you didn't make this change, please contact our support team immediately.</p>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    booking_on_hold: {
        subject: 'Your Booking is On Hold',
        content: `
            <p>Hi {{firstName}},</p>
            <p>Your booking for <strong>{{listingTitle}}</strong> is currently on hold pending payment.</p>
            <div class="details">
                <p><strong>Booking ID:</strong> {{bookingId}}</p>
                <p><strong>Check-in:</strong> {{checkIn}}</p>
                <p><strong>Check-out:</strong> {{checkOut}}</p>
                <p><strong>Total Amount:</strong> {{totalPrice}}</p>
            </div>
            <p>Please complete your payment to confirm your booking. Your hold will expire in 15 minutes.</p>
            {{#if paymentLink}}
            <p>
                <a href="{{paymentLink}}" class="button">Pay Now</a>
            </p>
            {{/if}}
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    booking_confirmation_owner: {
        subject: 'New Booking Confirmed - {{listingTitle}}',
        content: `
            <p>Hi {{firstName}},</p>
            <p>Great news! You have a new confirmed booking for your listing.</p>
            <div class="details">
                <p><strong>Booking ID:</strong> {{bookingId}}</p>
                <p><strong>Guest:</strong> {{guestName}}</p>
                <p><strong>Check-in:</strong> {{checkIn}}</p>
                <p><strong>Check-out:</strong> {{checkOut}}</p>
                <p><strong>Total Amount:</strong> {{totalPrice}}</p>
            </div>
            <p>Please prepare your listing for the guest's arrival.</p>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    booking_cancellation_owner: {
        subject: 'Booking Cancelled - {{listingTitle}}',
        content: `
            <p>Hi {{firstName}},</p>
            <p>A booking for your listing has been cancelled.</p>
            <div class="details">
                <p><strong>Booking ID:</strong> {{bookingId}}</p>
                <p><strong>Guest:</strong> {{guestName}}</p>
                <p><strong>Listing:</strong> {{listingTitle}}</p>
            </div>
            <p>The dates are now available for new bookings.</p>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    check_in_reminder_owner: {
        subject: 'Guest Check-in Reminder - {{listingTitle}}',
        content: `
            <p>Hi {{firstName}},</p>
            <p>This is a reminder that your guest will be checking in soon.</p>
            <div class="details">
                <p><strong>Booking ID:</strong> {{bookingId}}</p>
                <p><strong>Guest:</strong> {{guestName}}</p>
                <p><strong>Check-in Date:</strong> {{checkIn}}</p>
                <p><strong>Listing:</strong> {{listingTitle}}</p>
            </div>
            <p>Please ensure your listing is ready for the guest's arrival.</p>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    booking_on_hold_owner: {
        subject: 'New Booking Request - {{listingTitle}}',
        content: `
            <p>Hi {{firstName}},</p>
            <p>You have a new booking request for <strong>{{listingTitle}}</strong>.</p>
            <div class="details">
                <p><strong>Booking ID:</strong> {{bookingId}}</p>
                <p><strong>Guest:</strong> {{guestName}}</p>
                <p><strong>Check-in:</strong> {{checkIn}}</p>
                <p><strong>Check-out:</strong> {{checkOut}}</p>
                <p><strong>Total Amount:</strong> {{totalPrice}}</p>
            </div>
            <p>The guest is currently completing their payment. You'll receive another notification once the payment is confirmed.</p>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    new_booking_notification: {
        subject: 'New Booking Request - {{listingTitle}}',
        content: `
            <p>Hi {{firstName}},</p>
            <p>You have a new booking request for your listing!</p>
            <div class="details">
                <p><strong>Booking ID:</strong> {{bookingId}}</p>
                <p><strong>Guest:</strong> {{guestName}}</p>
                <p><strong>Guest Email:</strong> {{guestEmail}}</p>
                <p><strong>Check-in:</strong> {{checkIn}}</p>
                <p><strong>Check-out:</strong> {{checkOut}}</p>
                <p><strong>Total Amount:</strong> {{totalPrice}}</p>
            </div>
            <p>The guest is currently completing their payment. You'll receive another notification once the payment is confirmed.</p>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    }
};

export const renderEmailTemplate = async (templateName, data) => {
    const template = emailTemplates[templateName];
    if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
    }

    // Compile the content template
    const contentTemplate = Handlebars.compile(template.content);
    const renderedContent = contentTemplate({
        ...data,
        appName: process.env.APP_NAME || 'Our App',
        year: new Date().getFullYear()
    });

    // Compile the main template
    const mainTemplate = Handlebars.compile(defaultTemplate);
    const html = mainTemplate({
        ...data,
        appName: process.env.APP_NAME || 'Our App',
        year: new Date().getFullYear(),
        title: template.subject.replace('{{appName}}', process.env.APP_NAME || 'Our App'),
        content: renderedContent
    });

    return {
        subject: Handlebars.compile(template.subject)({
            appName: process.env.APP_NAME || 'Our App'
        }),
        html
    };
}; 