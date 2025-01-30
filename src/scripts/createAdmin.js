const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await prisma.user.create({
        data: {
            email: 'admin@example.com',
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            status: 'ACTIVE',
            emailVerified: true
        }
    });
    
    console.log('Admin user created successfully');
}

createAdmin()
    .catch(console.error)
    .finally(() => prisma.$disconnect()); 