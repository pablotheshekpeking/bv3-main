import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { sendPasswordChangedEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const { firstName, lastName, phone, email, profileImage } = req.body;

    const updateData = {
      firstName,
      lastName,
      phone,
      email,
      profileImage
    };

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileImage: true,
        emailVerified: true,
        phoneVerified: true,
        kycVerified: true
      }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { userId } = req.user;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        password: true
      }
    });

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Send password changed email
    await sendPasswordChangedEmail(user);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error changing password', error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        createdAt: true,
        emailVerified: true,
        phoneVerified: true,
        kycVerified: true,
        isVendor: true,
        country: true,
        status: true,
        _count: {
          select: {
            listings: true,
            reviews: true,
            receivedReviews: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const verificationStatus = {
      isFullyVerified: user.emailVerified && user.phoneVerified && user.kycVerified,
      email: user.emailVerified,
      phone: user.phoneVerified,
      kyc: user.kycVerified,
      canBecomeVendor: user.emailVerified && user.phoneVerified && user.kycVerified && !user.isVendor
    };

    res.json({
      ...user,
      verification: verificationStatus
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
}; 