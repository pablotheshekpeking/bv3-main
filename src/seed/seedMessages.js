import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedMessages() {
  try {
    // Clear existing data in the correct order to respect foreign key constraints
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.review.deleteMany();
    await prisma.offer.deleteMany();
    await prisma.image.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.verification.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const testUsers = [
      {
        email: 'user1@test.com',
        password: hashedPassword,
        firstName: 'User',
        lastName: 'One',
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true
      },
      {
        email: 'user2@test.com',
        password: hashedPassword,
        firstName: 'User',
        lastName: 'Two',
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true
      },
      {
        email: 'user3@test.com',
        password: hashedPassword,
        firstName: 'User',
        lastName: 'Three',
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true
      }
    ];

    // Create users
    const createdUsers = await Promise.all(
      testUsers.map(userData => 
        prisma.user.create({ data: userData })
      )
    );

    // Create conversations and messages between users
    for (let i = 0; i < createdUsers.length - 1; i++) {
      const sender = createdUsers[i];
      const receiver = createdUsers[i + 1];

      await prisma.conversation.create({
        data: {
          participants: {
            connect: [
              { id: sender.id },
              { id: receiver.id }
            ]
          },
          lastMessageAt: new Date(),
          messages: {
            create: [
              {
                senderId: sender.id,
                receiverId: receiver.id,
                content: `Hey ${receiver.firstName}, how are you?`,
                createdAt: new Date(Date.now() - 3600000 * 3)
              },
              {
                senderId: receiver.id,
                receiverId: sender.id,
                content: `Hi ${sender.firstName}! I'm good, thanks for asking.`,
                createdAt: new Date(Date.now() - 3600000 * 2)
              },
              {
                senderId: sender.id,
                receiverId: receiver.id,
                content: 'Great! Would you like to meet up?',
                createdAt: new Date(Date.now() - 3600000)
              }
            ]
          }
        }
      });
    }

    console.log('Messages and conversations seeded successfully');
  } catch (error) {
    console.error('Error seeding messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMessages(); 