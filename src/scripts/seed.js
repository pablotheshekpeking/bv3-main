import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // Clear all existing data
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.review.deleteMany();
    await prisma.offer.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.apartmentAvailability.deleteMany();
    await prisma.image.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.verification.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    // Import and run seed functions
    const { seedUsers } = await import('../seed/seedData.js');
    const { seedListingsAndReviews } = await import('../seed/seedListings.js');
    const { seedMessages } = await import('../seed/seedMessages.js');

    console.log('Starting seed process...');
    
    await seedUsers();
    console.log('✓ Users seeded');
    
    await seedListingsAndReviews();
    console.log('✓ Listings and reviews seeded');
    
    await seedMessages();
    console.log('✓ Messages seeded');

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error during seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 