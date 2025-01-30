import { PrismaClient } from '@prisma/client';
import { PaystackService } from '../services/paystackService.js';
import { APIError } from '../utils/errors.js';

const prisma = new PrismaClient();
const paystackService = new PaystackService();

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
    const userId = req.user.userId;
    const { amount } = req.body;

    if (!amount || amount < 100) {
      throw new APIError('Minimum purchase amount is 100', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    const paymentRef = `POINTS-${userId}-${Date.now()}`;

    const paystackResponse = await paystackService.initializeTransaction({
      email: user.email,
      amount: amount,
      reference: paymentRef,
      callbackUrl: `${process.env.FRONTEND_URL}/points/verify`,
      metadata: {
        userId,
        type: 'points',
        pointsAmount: Math.floor(amount / 100) // 1 point per currency unit
      }
    });

    res.json({
      status: 'success',
      payment: {
        authorizationUrl: paystackResponse.data.authorization_url,
        reference: paymentRef
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}; 