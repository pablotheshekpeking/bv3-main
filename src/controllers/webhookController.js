import { PrismaClient } from '@prisma/client';
import { FlutterwaveService } from '../services/flutterwaveService.js';

const prisma = new PrismaClient();
const flutterwaveService = new FlutterwaveService();

export const handleFlutterwaveWebhook = async (req, res) => {
  try {
    const signature = req.headers['verif-hash'];
    if (!flutterwaveService.verifyWebhookSignature(signature, req.body)) {
      console.error('Invalid webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const { event, data } = req.body;
    console.log('Webhook Event:', event);
    console.log('Payment Data:', data);

    if (event === 'charge.completed' && data.status === 'successful') {
      await handleSuccessfulPayment(data);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
};

async function handleSuccessfulPayment(data) {
  const { tx_ref, metadata } = data;
  
  await prisma.$transaction(async (prisma) => {
    const payment = await prisma.payment.findFirst({
      where: { 
        reference: tx_ref,
        status: 'PENDING'
      }
    });

    if (!payment) {
      console.error('Payment not found or already processed:', tx_ref);
      return;
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        status: 'CONFIRMED',
        provider: 'FLUTTERWAVE'
      }
    });

    // Update booking status if it's a booking payment
    if (metadata?.type === 'booking') {
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
            paymentRef: tx_ref
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
    }
  });
} 