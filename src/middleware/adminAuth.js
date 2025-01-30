import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    const admin = await prisma.user.findUnique({
      where: { 
        id: decoded.userId,
        role: 'ADMIN'
      }
    });

    if (!admin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}; 