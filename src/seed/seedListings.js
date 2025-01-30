import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedListingsAndReviews() {
  try {
    // Clear existing data in the correct order to respect foreign key constraints
    await prisma.message.deleteMany();
    await prisma.review.deleteMany();
    await prisma.offer.deleteMany();
    await prisma.image.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.verification.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    // Create categories
    const categories = await prisma.category.createMany({
      data: [
        {
          name: 'Real Estate',
          slug: 'real-estate',
          description: 'Properties for rent and sale'
        },
        {
          name: 'Vehicles',
          slug: 'vehicles',
          description: 'Cars, motorcycles, and other vehicles'
        },
        {
          name: 'Electronics',
          slug: 'electronics',
          description: 'Phones, computers, and other electronics'
        }
      ]
    });

    const [realEstate, vehicles] = await prisma.category.findMany();

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create sellers
    const sellers = [
      {
        email: 'john.doe@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        phone: '+1234567890',
        profileImage: 'https://randomuser.me/api/portraits/men/1.jpg'
      },
      {
        email: 'sarah.smith@example.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Smith',
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        phone: '+1234567891',
        profileImage: 'https://randomuser.me/api/portraits/women/1.jpg'
      }
    ];

    const createdSellers = await Promise.all(
      sellers.map(seller => prisma.user.create({ data: seller }))
    );

    // Create buyers (for reviews)
    const buyers = [
      {
        email: 'mike.brown@example.com',
        password: hashedPassword,
        firstName: 'Mike',
        lastName: 'Brown',
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        profileImage: 'https://randomuser.me/api/portraits/men/2.jpg'
      },
      {
        email: 'emma.wilson@example.com',
        password: hashedPassword,
        firstName: 'Emma',
        lastName: 'Wilson',
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        profileImage: 'https://randomuser.me/api/portraits/women/2.jpg'
      }
    ];

    const createdBuyers = await Promise.all(
      buyers.map(buyer => prisma.user.create({ data: buyer }))
    );

    // Create listings
    const listings = [
      {
        userId: createdSellers[0].id,
        categoryId: realEstate.id,
        type: 'APARTMENT_RENT',
        title: 'Luxury Downtown Apartment with City Views',
        description: 'Modern 2-bedroom apartment in the heart of downtown. Floor-to-ceiling windows offering breathtaking city views. Features include a gourmet kitchen with stainless steel appliances, hardwood floors throughout, in-unit laundry, and a private balcony. Building amenities include 24/7 security, fitness center, and rooftop lounge.',
        price: 2500,
        currency: 'USD',
        status: 'ACTIVE',
        location: { 
          address: '123 Downtown Ave',
          city: 'New York',
          coordinates: { lat: 40.7128, lng: -74.0060 }
        },
        features: {
          bedrooms: 2,
          bathrooms: 2,
          sqft: 1200,
          parking: true,
          furnished: true,
          pets: true
        }
      },
      {
        userId: createdSellers[1].id,
        categoryId: vehicles.id,
        type: 'CAR_SALE',
        title: '2020 Tesla Model 3 - Perfect Condition',
        description: 'Pristine 2020 Tesla Model 3 Long Range. Single owner, always garaged. Full self-driving capability, premium white interior, 19" sport wheels. Features include autopilot, premium audio system, heated seats, and glass roof. Only 15,000 miles, all service records available.',
        price: 45000,
        currency: 'USD',
        status: 'ACTIVE',
        location: { 
          address: '456 Auto Drive',
          city: 'Los Angeles',
          coordinates: { lat: 34.0522, lng: -118.2437 }
        },
        features: {
          make: 'Tesla',
          model: 'Model 3',
          year: 2020,
          mileage: 15000,
          color: 'Midnight Silver',
          transmission: 'Automatic'
        }
      }
    ];

    for (const listing of listings) {
      const createdListing = await prisma.listing.create({
        data: {
          ...listing,
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

      // Create reviews for each listing
      await prisma.review.createMany({
        data: [
          {
            userId: createdBuyers[0].id,
            targetUserId: listing.userId,
            listingId: createdListing.id,
            rating: 5,
            comment: 'Excellent experience! The listing was exactly as described and the seller was very professional and responsive.'
          },
          {
            userId: createdBuyers[1].id,
            targetUserId: listing.userId,
            listingId: createdListing.id,
            rating: 4,
            comment: 'Very good overall. Quick responses and smooth transaction process.'
          }
        ]
      });
    }

    console.log('Seed data created successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedListingsAndReviews(); 