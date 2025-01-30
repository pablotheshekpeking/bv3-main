import { PrismaClient } from '@prisma/client';
import { APIError } from '../utils/errors.js';

const prisma = new PrismaClient();

export const becomeVendor = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerified: true,
        phoneVerified: true,
        kycVerified: true,
        isVendor: true
      }
    });

    if (!user) {
      throw new APIError('User not found', 404);
    }

    if (user.isVendor) {
      throw new APIError('User is already a vendor', 400);
    }

    if (!user.emailVerified || !user.phoneVerified || !user.kycVerified) {
      throw new APIError('Please complete email, phone and KYC verification first', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isVendor: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isVendor: true
      }
    });

    res.json({
      status: 'success',
      message: 'Successfully became a vendor',
      user: updatedUser
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}; 