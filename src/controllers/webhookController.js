import { PrismaClient } from '@prisma/client';
import { PaystackService } from '../services/paystackService.js';

const prisma = new PrismaClient();
const paystackService = new PaystackService();

export const handlePaystackWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    if (!paystackService.verifyWebhookSignature(signature, req.body)) {
      return res.status(400).send('Invalid signature');
    }

    const { event, data } = req.body;

    if (event === 'charge.success') {
      const { reference, metadata } = data;
      
      if (metadata.type === 'booking') {
        await prisma.booking.update({
          where: { id: metadata.bookingId },
          data: {
            status: 'CONFIRMED',
            paymentRef: reference
          }
        });
      } else if (metadata.type === 'points') {
        const pointsToAdd = Math.floor(data.amount / 100); // 1 point per currency unit
        await prisma.user.update({
          where: { id: metadata.userId },
          data: {
            points: {
              increment: pointsToAdd
            }
          }
        });
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
}; 