import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedApartments() {
  try {
    // Clear existing data
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

    // Create categories
    const realEstate = await prisma.category.create({
      data: {
        name: 'Real Estate',
        slug: 'real-estate',
        description: 'Properties for rent and sale'
      }
    });

    // Create a vendor
    const hashedPassword = await bcrypt.hash('password123', 10);
    const vendor = await prisma.user.create({
      data: {
        email: 'vendor@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Vendor',
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        isVendor: true
      }
    });

    // Create apartment listings
    const apartments = [
      {
        userId: vendor.id,
        categoryId: realEstate.id,
        type: 'APARTMENT_RENT',
        title: 'Luxury Beachfront Villa',
        description: 'Stunning 3-bedroom villa with private beach access',
        price: 300,
        currency: 'USD',
        status: 'ACTIVE',
        location: {
          address: '123 Beach Road',
          city: 'Miami',
          coordinates: { lat: 25.7617, lng: -80.1918 }
        },
        features: {
          bedrooms: 3,
          bathrooms: 2,
          sqft: 2000,
          parking: true,
          furnished: true,
          pets: true,
          pool: true
        }
      },
      {
        userId: vendor.id,
        categoryId: realEstate.id,
        type: 'APARTMENT_RENT',
        title: 'Modern City Loft',
        description: 'Stylish downtown loft with city views',
        price: 200,
        currency: 'USD',
        status: 'ACTIVE',
        location: {
          address: '456 Downtown Ave',
          city: 'New York',
          coordinates: { lat: 40.7128, lng: -74.0060 }
        },
        features: {
          bedrooms: 1,
          bathrooms: 1,
          sqft: 800,
          parking: false,
          furnished: true,
          pets: false
        }
      }
    ];

    // Create listings with images and availability
    for (const apt of apartments) {
      const listing = await prisma.listing.create({
        data: {
          ...apt,
          images: {
            create: [
              {
                url: `https://picsum.photos/seed/${Math.random()}/800/600`,
                isPrimary: true
              },
              {
                url: `https://picsum.photos/seed/${Math.random()}/800/600`,
                isPrimary: false
              }
            ]
          }
        }
      });

      // Create availability periods
      await prisma.apartmentAvailability.createMany({
        data: [
          {
            listingId: listing.id,
            startDate: new Date('2024-04-01'),
            endDate: new Date('2024-06-30'),
            pricePerNight: apt.price,
            isBlocked: false
          },
          {
            listingId: listing.id,
            startDate: new Date('2024-07-01'),
            endDate: new Date('2024-12-31'),
            pricePerNight: apt.price * 1.2, // Peak season pricing
            isBlocked: false
          }
        ]
      });
    }

    console.log('Apartments seeded successfully');
  } catch (error) {
    console.error('Error seeding apartments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedApartments(); 