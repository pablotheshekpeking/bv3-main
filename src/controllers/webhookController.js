import { PrismaClient } from '@prisma/client';
import { PaystackService } from '../services/paystackService.js';

const prisma = new PrismaClient();
const paystackService = new PaystackService();

export const handlePaystackWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    if (!paystackService.verifyWebhookSignature(signature, req.body)) {
      console.error('Invalid webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const { event, data } = req.body;
    console.log('Webhook Event:', event);
    console.log('Payment Data:', data);

    if (event === 'charge.success') {
      await handleSuccessfulPayment(data);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
};

async function handleSuccessfulPayment(data) {
  const { reference, metadata } = data;
  
  await prisma.$transaction(async (prisma) => {
    const payment = await prisma.payment.findFirst({
      where: { 
        reference,
        status: 'PENDING'
      }
    });

    if (!payment) {
      console.error('Payment not found or already processed:', reference);
      return;
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'CONFIRMED' }
    });

    // Update booking status
    if (metadata.type === 'booking') {
      const booking = await prisma.booking.findFirst({
        where: { 
          id: metadata.bookingId,
          status: 'PENDING'
        }
      });

      if (booking) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: 'CONFIRMED',
            paymentRef: reference
          }
        });

        // Block the dates
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
      }
    } else if (metadata.type === 'points') {
      const pointsToAdd = Math.floor(data.amount / 100);
      await prisma.user.update({
        where: { id: metadata.userId },
        data: {
          points: { increment: pointsToAdd }
        }
      });
    }
  });
} 