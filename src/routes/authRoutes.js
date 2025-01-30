import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';
import { addToBlacklist } from '../services/tokenService.js';
import * as tokenValidator from '../middleware/tokenValidator.js';

const router = express.Router();
const prisma = new PrismaClient();

// Input validation middleware
const validateRegistration = (req, res, next) => {
  const { email, password, firstName, lastName, phone } = req.body;

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  // Password validation (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!password || !passwordRegex.test(password)) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    });
  }

  // Name validation
  if (!firstName || firstName.length < 2) {
    return res.status(400).json({ message: 'First name must be at least 2 characters long' });
  }
  if (!lastName || lastName.length < 2) {
    return res.status(400).json({ message: 'Last name must be at least 2 characters long' });
  }

  // Phone validation (basic international format)
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phone || !phoneRegex.test(phone)) {
    return res.status(400).json({ message: 'Please provide a valid phone number in international format (e.g., +1234567890)' });
  }

  next();
};

// POST /auth/register
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone
    } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email address is already registered' });
      }
      if (existingUser.phone === phone) {
        return res.status(400).json({ message: 'Phone number is already registered' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: false,
        phoneVerified: false,
        kycVerified: false
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        emailVerified: true,
        phoneVerified: true,
        kycVerified: true
      }
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ 
      message: 'Registration failed', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password' });
    }

    // Find user
    const user = await prisma.user.findUnique({ 
      where: { email } 
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ 
        message: 'Account is not active', 
        status: user.status 
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Remove sensitive data
    const { password: _, ...userWithoutPassword } = user;

    res.json({ 
      message: 'Login successful',
      token, 
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ 
      message: 'Login failed', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    addToBlacklist(token);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error during logout' });
  }
});

router.get('/validate', tokenValidator.validateSession);

export default router; 