const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedData() {
    try {
        // Create test users
        const hashedPassword = await bcrypt.hash('test123', 10);
        
        // Create regular users
        for (let i = 1; i <= 5; i++) {
            await prisma.user.create({
                data: {
                    email: `user${i}@example.com`,
                    password: hashedPassword,
                    firstName: `Test${i}`,
                    lastName: `User${i}`,
                    role: 'USER',
                    status: 'ACTIVE',
                    emailVerified: true,
                    phoneVerified: true,
                    phone: `+1234567890${i}`,
                    listings: {
                        create: [
                            {
                                type: 'APARTMENT_RENT',
                                title: `Beautiful Apartment ${i}`,
                                description: 'Modern apartment with great views',
                                price: 1000 * i,
                                status: 'ACTIVE',
                                images: {
                                    create: [
                                        {
                                            url: `https://picsum.photos/seed/${i}/500/300`,
                                            isPrimary: true
                                        }
                                    ]
                                }
                            }
                        ]
                    },
                    verifications: {
                        create: [
                            {
                                type: 'KYC_ID',
                                status: 'PENDING',
                                data: `https://picsum.photos/seed/kyc${i}/500/300`
                            }
                        ]
                    }
                }
            });
        }

        console.log('Test data created successfully');
    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedData(); 