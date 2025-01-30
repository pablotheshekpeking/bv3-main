import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const submitKYC = async (req, res) => {
  try {
    const { userId } = req.user;
    const { documentType, idImageUrl, selfieImageUrl } = req.body;

    await prisma.verification.create({
      data: {
        userId,
        type: 'KYC_ID',
        data: idImageUrl,
        status: 'PENDING'
      }
    });

    await prisma.verification.create({
      data: {
        userId,
        type: 'KYC_SELFIE',
        data: selfieImageUrl,
        status: 'PENDING'
      }
    });

    res.status(201).json({ message: 'KYC documents submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting KYC', error: error.message });
  }
};

export const verifyKYC = async (req, res) => {
  try {
    const { userId, status, notes } = req.body;

    await prisma.$transaction([
      prisma.verification.updateMany({
        where: {
          userId,
          type: { in: ['KYC_ID', 'KYC_SELFIE'] }
        },
        data: { status }
      }),
      prisma.user.update({
        where: { id: userId },
        data: { kycVerified: status === 'VERIFIED' }
      })
    ]);

    res.json({ message: 'KYC verification status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating KYC status', error: error.message });
  }
}; 