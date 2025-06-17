import { PrismaClient } from '@prisma/client';
import { sendTemplatedEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationCode = async (userId, type) => {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new Error('User not found');
    }

    if (type !== 'EMAIL') {
        throw new Error('Only email verification is supported at this time');
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const verification = await prisma.verification.create({
        data: {
            userId,
            type,
            data: code,
            expiresAt,
            status: 'PENDING'
        }
    });

    await sendTemplatedEmail(
        user.email,
        'verification',
        {
            firstName: user.firstName,
            verificationCode: code
        }
    );

    return { 
        message: `Verification code sent to your email`,
        code // Return code for welcome email
    };
};

export const verifyCode = async (userId, type, code) => {
    if (type !== 'EMAIL') {
        throw new Error('Only email verification is supported at this time');
    }

    const verification = await prisma.verification.findFirst({
        where: {
            userId,
            type,
            status: 'PENDING',
            expiresAt: {
                gt: new Date()
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    if (!verification) {
        throw new Error('No valid verification code found');
    }

    if (verification.data !== code) {
        throw new Error('Invalid verification code');
    }

    await prisma.verification.update({
        where: { id: verification.id },
        data: {
            status: 'VERIFIED',
            verifiedAt: new Date()
        }
    });

    await prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true }
    });

    return { message: `Email verified successfully` };
}; 