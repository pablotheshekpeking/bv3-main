import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedUsers() {
  try {
    // Delete records in the correct order
    await prisma.review.deleteMany();
    await prisma.message.deleteMany();
    await prisma.offer.deleteMany();
    await prisma.image.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.verification.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = [
      {
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true
      },
      {
        email: 'user@example.com',
        password: hashedPassword,
        firstName: 'Regular',
        lastName: 'User',
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true
      }
    ];

    await prisma.user.createMany({
      data: users
    });

    console.log('Users seeded successfully');
  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the seed function
seedUsers(); 