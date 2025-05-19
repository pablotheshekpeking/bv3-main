import { PrismaClient } from '@prisma/client';
import { RemitaService } from '../services/remitaService.js';
import { APIError } from '../utils/errors.js';

const prisma = new PrismaClient();
const remitaService = new RemitaService();

export const getUserPoints = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        points: true
      }
    });

    if (!user) {
      throw new APIError('User not found', 404);
    }

    res.json({
      status: 'success',
      points: user.points
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const addPoints = async (req, res) => {
  try {
    const { userId, points, reason } = req.body;
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: points
        }
      },
      select: {
        id: true,
        points: true
      }
    });

    res.json({
      status: 'success',
      points: user.points
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const initializePointsPurchase = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.userId;

    if (!amount || amount < 100) {
      throw new APIError('Minimum purchase amount is 100', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true
      }
    });

    // Check for existing pending points payment
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId,
        status: 'PENDING',
        metadata: {
          path: ['type'],
          equals: 'points'
        }
      }
    });
    if (existingPayment && 
        (new Date() - new Date(existingPayment.createdAt)) < 30 * 60 * 1000) {
      return res.json({
        status: 'success',
        payment: {
          authorizationUrl: existingPayment.metadata?.authorizationUrl,
          reference: existingPayment.reference
        }
      });
    }

    // Initialize new payment
    const paymentRef = `POINTS-${userId}-${Date.now()}`;
    const remitaResponse = await remitaService.initializeTransaction({
      email: user.email,
      amount: amount * 100,
      reference: paymentRef,
      payerName: `${user.firstName} ${user.lastName}`,
      description: 'Points Purchase',
      metadata: {
        userId,
        type: 'points',
        pointsAmount: amount
      }
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        userId,
        amount,
        reference: paymentRef,
        status: 'PENDING',
        provider: 'REMITA',
        metadata: {
          type: 'points',
          pointsAmount: amount,
          authorizationUrl: remitaResponse.authorizationUrl
        }
      }
    });

    res.json({
      status: 'success',
      payment: {
        authorizationUrl: remitaResponse.authorizationUrl,
        reference: paymentRef
      }
    });
  } catch (error) {
    console.error('Points purchase error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error'
    });
  }
};

export const verifyPointsPayment = async (req, res) => {
  try {
    const { reference } = req.query;
    const userId = req.user.userId;

    const payment = await prisma.payment.findFirst({
      where: {
        reference,
        userId,
        status: 'PENDING',
        metadata: {
          path: ['type'],
          equals: 'points'
        }
      }
    });

    if (!payment) {
      throw new APIError('Payment not found or already processed', 404);
    }

    const isPaymentSuccessful = await remitaService.verifyPaymentStatus(reference);
    
    if (isPaymentSuccessful) {
      await prisma.$transaction(async (prisma) => {
        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'CONFIRMED' }
        });

        // Add points to user
        const pointsToAdd = Math.floor(payment.amount);
        await prisma.user.update({
          where: { id: userId },
          data: {
            points: { increment: pointsToAdd }
          }
        });
      });

      return res.json({
        status: 'success',
        message: 'Points added successfully',
        points: Math.floor(payment.amount)
      });
    }

    res.json({
      status: 'pending',
      message: 'Payment verification failed'
    });
  } catch (error) {
    console.error('Points verification error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error'
    });
  }
}; 