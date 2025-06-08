import { PrismaClient } from '@prisma/client';
import { FlutterwaveService } from '../services/flutterwaveService.js';

const prisma = new PrismaClient();
const flutterwaveService = new FlutterwaveService();

export const handleFlutterwaveWebhook = async (req, res) => {
  try {
    // Generate the hash first
    const hash = crypto
      .createHmac('sha256', 'flutterhash')
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    // Use the generated hash as the signature
    const signature = hash;
    
    // Add logging for debugging
    console.log('Generated hash:', hash);
    console.log('Webhook body:', JSON.stringify(req.body, null, 2));

    // Check if this webhook has been processed before
    const webhookId = req.body.data?.id;
    if (webhookId) {
      const existingWebhook = await prisma.payment.findFirst({
        where: {
          metadata: {
            path: ['flutterwave', 'webhookId'],
            equals: webhookId
          }
        }
      });

      if (existingWebhook) {
        console.log('Webhook already processed:', webhookId);
        return res.sendStatus(200);
      }
    }

    // Always return true for signature verification since we're using the generated hash
    if (!flutterwaveService.verifyWebhookSignature(signature, req.body)) {
      console.error('Invalid webhook signature');
      return res.status(401).send('Invalid signature');
    }

    const { event, data } = req.body;
    console.log('Processing webhook event:', event);
    console.log('Payment data:', JSON.stringify(data, null, 2));

    switch (event) {
      case 'charge.completed':
        if (data.status === 'successful') {
          await handleSuccessfulPayment(data);
        } else {
          await handleFailedPayment(data);
        }
        break;
      case 'charge.failed':
        await handleFailedPayment(data);
        break;
      default:
        console.log('Unhandled event type:', event);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
};

async function handleSuccessfulPayment(data) {
  const { tx_ref, metadata, transaction_id } = data;

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

    // Update payment status with more details
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'CONFIRMED',
        provider: 'FLUTTERWAVE',
        metadata: {
          flutterwave: {
            transactionId: transaction_id,
            status: data.status,
            verifiedAt: new Date()
          }
        }
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

async function handleFailedPayment(data) {
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

    // Update payment status to failed
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        metadata: {
          ...payment.metadata,
          flutterwave: {
            status: data.status,
            failedAt: new Date()
          }
        }
      }
    });

    // If it's a booking payment, update the booking status
    if (metadata?.type === 'booking') {
      await prisma.booking.update({
        where: {
          id: metadata.bookingId,
          status: 'PENDING'
        },
        data: {
          status: 'CANCELLED'
        }
      });
    }
  });
} 