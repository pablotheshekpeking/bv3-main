import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const validateSession = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ 
        status: 'error',
        code: 'INVALID_SESSION',
        message: 'Session is invalid' 
      });
    }

    res.json({ 
      status: 'success',
      user 
    });
  } catch (error) {
    res.status(401).json({ 
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Invalid token' 
    });
  }
}; 