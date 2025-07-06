import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const submitKYC = async (req, res) => {
  try {
    
    const { userId } = req.user;
    const { idType, idNumber, idImage, selfieImage, dateOfBirth, nationality } = req.body;


    // Validate required fields
    if (!idImage || !selfieImage) {
      console.log('❌ KYC Submission - Missing required image URLs');
      return res.status(400).json({ 
        message: 'Missing required image URLs',
        received: { idImage, selfieImage }
      });
    }

    
    // Create KYC ID verification with image
    const idVerification = await prisma.verification.create({
      data: {
        userId,
        type: 'KYC_ID',
        data: idImage,
        status: 'PENDING',
        images: {
          create: {
            url: idImage,
            type: 'KYC_ID'
          }
        }
      }
    });

    
    // Create KYC Selfie verification with image
    const selfieVerification = await prisma.verification.create({
      data: {
        userId,
        type: 'KYC_SELFIE',
        data: selfieImage,
        status: 'PENDING',
        images: {
          create: {
            url: selfieImage,
            type: 'KYC_SELFIE'
          }
        }
      }
    });



    res.status(201).json({ 
      message: 'KYC documents submitted successfully',
      verifications: [idVerification, selfieVerification]
    });
  } catch (error) {
    
    res.status(500).json({ 
      message: 'Error submitting KYC', 
      error: error.message,
      details: {
        code: error.code,
        meta: error.meta
      }
    });
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
        data: { 
          status,
          verifiedAt: status === 'VERIFIED' ? new Date() : null
        }
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

export const getKYCStatus = async (req, res) => {
  try {
    
    const { userId } = req.user;

    const verifications = await prisma.verification.findMany({
      where: {
        userId,
        type: { in: ['KYC_ID', 'KYC_SELFIE'] }
      },
      include: {
        images: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });


    const kycStatus = {
      idVerified: verifications.find(v => v.type === 'KYC_ID')?.status || 'NOT_SUBMITTED',
      selfieVerified: verifications.find(v => v.type === 'KYC_SELFIE')?.status || 'NOT_SUBMITTED',
      overallStatus: verifications.length > 0 ? 'PENDING' : 'NOT_SUBMITTED',
      verifications
    };

    res.json(kycStatus);
  } catch (error) {
    console.error('❌ KYC Status - Error:', error);
    res.status(500).json({ message: 'Error fetching KYC status', error: error.message });
  }
}; 