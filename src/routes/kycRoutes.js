import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateImageUrl } from '../middleware/uploadMiddleware.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Submit KYC documents
router.post('/submit', authenticateToken, validateImageUrl, async (req, res) => {
  try {
    const { userId } = req.user;
    const { 
      idType,
      idNumber,
      idImage,
      selfieImage,
      addressProofImage,
      dateOfBirth,
      nationality 
    } = req.body;

    const kyc = await prisma.kyc.create({
      data: {
        userId,
        idType,
        idNumber,
        idImage,
        selfieImage,
        addressProofImage,
        dateOfBirth: new Date(dateOfBirth),
        nationality,
        status: 'PENDING'
      }
    });

    res.status(201).json(kyc);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting KYC', error: error.message });
  }
});

// Get KYC status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    
    const kyc = await prisma.kyc.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(kyc || { status: 'NOT_SUBMITTED' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching KYC status', error: error.message });
  }
});

// Get KYC details
router.get('/details', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    
    const kyc = await prisma.kyc.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!kyc) {
      return res.status(404).json({ message: 'KYC not found' });
    }

    res.json(kyc);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching KYC details', error: error.message });
  }
});

export default router; 