import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { sendListingCreatedEmail, sendListingUpdatedEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const createListing = async (req, res) => {
    try {
        const { 
            title, 
            description, 
            price, 
            type, 
            currency, 
            location, 
            features,
            imageUrls,
            metadata,
            categoryId,
            availability
        } = req.body;
        
        const userId = req.user.userId;

        // Validate required fields
        if (!title || !description || !price || !type || !location || !features) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        // Validate user is vendor
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                isVendor: true,
                email: true,
                firstName: true,
                lastName: true
            }
        });

        if (!user?.isVendor) {
            return res.status(403).json({ 
                error: 'Only vendors can create listings' 
            });
        }

        // Validate category if provided
        if (categoryId) {
            const category = await prisma.category.findUnique({
                where: { id: categoryId }
            });

            if (!category) {
                return res.status(400).json({
                    error: 'Category not found'
                });
            }
        }

        // Additional validation for apartment listings
        if (type === 'APARTMENT_RENT' || type === 'APARTMENT_SHORTLET') {
            if (!features.bedrooms || !features.bathrooms || !features.sqft) {
                return res.status(400).json({
                    error: 'Apartment listings require bedrooms, bathrooms, and sqft'
                });
            }

            if (!availability || !availability.length) {
                return res.status(400).json({
                    error: 'Apartment listings require availability periods'
                });
            }

            // Validate availability data
            for (const period of availability) {
                if (!period.startDate || !period.endDate || !period.pricePerNight) {
                    return res.status(400).json({
                        error: 'Each availability period must include startDate, endDate, and pricePerNight'
                    });
                }

                if (new Date(period.startDate) >= new Date(period.endDate)) {
                    return res.status(400).json({
                        error: 'End date must be after start date'
                    });
                }
            }
        }

        // Validate location format
        if (!location.address || !location.city || !location.coordinates) {
            return res.status(400).json({
                error: 'Location must include address, city, and coordinates'
            });
        }

        // Create listing with transaction to handle related records
        const listing = await prisma.$transaction(async (prisma) => {
            const createdListing = await prisma.listing.create({
                data: {
                    userId,
                    title,
                    description,
                    price,
                    type,
                    currency,
                    location,
                    features,
                    metadata,
                    categoryId,
                    status: 'DRAFT',
                    images: {
                        create: imageUrls.map((url, index) => ({
                            url,
                            isPrimary: index === 0
                        }))
                    }
                },
                include: {
                    images: true,
                    category: true
                }
            });

            // Create availability periods for apartment listings
            if ((type === 'APARTMENT_RENT' || type === 'APARTMENT_SHORTLET') && availability) {
                await prisma.apartmentAvailability.createMany({
                    data: availability.map(period => ({
                        listingId: createdListing.id,
                        startDate: new Date(period.startDate),
                        endDate: new Date(period.endDate),
                        pricePerNight: period.pricePerNight,
                        isBlocked: period.isBlocked || false
                    }))
                });
            }

            return createdListing;
        });

        // Send listing created email
        await sendListingCreatedEmail(listing, user);

        res.status(201).json({
            status: 'success',
            listing
        });
    } catch (error) {
        console.error('Create listing error:', error);
        res.status(400).json({ 
            status: 'error',
            error: error.message 
        });
    }
};

export const getAllListings = async (req, res) => {
    try {
        const { 
            categoryId, 
            search, 
            minPrice, 
            maxPrice,
            type,
            page = 1,
            limit = 20
        } = req.query;

        // Convert string parameters to integers
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);

        const where = {
            status: 'ACTIVE',
            ...(categoryId && { categoryId }),
            ...(type && { type }),
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ]
            }),
            ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
            ...(maxPrice && { price: { lte: parseFloat(maxPrice) } })
        };

        const [listings, total] = await Promise.all([
            prisma.listing.findMany({
                where,
                include: {
                    images: true,
                    category: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            profileImage: true
                        }
                    }
                },
                skip: (pageNum - 1) * limitNum,
                take: limitNum, // Now using the integer value
                orderBy: { createdAt: 'desc' }
            }),
            prisma.listing.count({ where })
        ]);

        res.json({
            listings,
            pagination: {
                total,
                pages: Math.ceil(total / limitNum),
                currentPage: pageNum
            }
        });
    } catch (error) {
        console.error('Error in getAllListings:', error);
        res.status(400).json({ error: error.message });
    }
};

export const getListing = async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await prisma.listing.findUnique({
            where: { id },
            include: {
                images: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profileImage: true
                    }
                }
            }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        res.json(listing);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const updateListing = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title, 
            description, 
            price, 
            type, 
            currency, 
            location, 
            features,
            imageUrls,
            metadata,
            categoryId,
            availability,
            status
        } = req.body;
        const userId = req.user.userId;

        const listing = await prisma.listing.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        if (listing.userId !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Prepare update data without imageUrls
        const updateData = {
            title,
            description,
            price,
            type,
            currency,
            location,
            features,
            metadata,
            categoryId,
            status
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        // Update listing with transaction to handle images
        const updatedListing = await prisma.$transaction(async (prisma) => {
            // Update the listing
            const updated = await prisma.listing.update({
                where: { id },
                data: updateData,
                include: {
                    images: true,
                    category: true
                }
            });

            // Handle image updates if imageUrls are provided
            if (imageUrls && Array.isArray(imageUrls)) {
                // Delete existing images
                await prisma.image.deleteMany({
                    where: { listingId: id }
                });

                // Create new images
                if (imageUrls.length > 0) {
                    await prisma.image.createMany({
                        data: imageUrls.map((url, index) => ({
                            listingId: id,
                            url,
                            isPrimary: index === 0
                        }))
                    });
                }
            }

            // Handle availability updates for apartment listings
            if ((type === 'APARTMENT_RENT' || type === 'APARTMENT_SHORTLET') && availability) {
                // Delete existing availability
                await prisma.apartmentAvailability.deleteMany({
                    where: { listingId: id }
                });

                // Create new availability periods
                if (availability.length > 0) {
                    await prisma.apartmentAvailability.createMany({
                        data: availability.map(period => ({
                            listingId: id,
                            startDate: new Date(period.startDate),
                            endDate: new Date(period.endDate),
                            pricePerNight: period.pricePerNight,
                            isBlocked: period.isBlocked || false
                        }))
                    });
                }
            }

            // Return updated listing with fresh data
            return await prisma.listing.findUnique({
                where: { id },
                include: {
                    images: true,
                    category: true,
                    availabilities: true
                }
            });
        });

        // Send listing updated email
        await sendListingUpdatedEmail(updatedListing, listing.user);

        res.json(updatedListing);
    } catch (error) {
        console.error('Update listing error:', error);
        res.status(400).json({ error: error.message });
    }
};

export const deleteListing = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const listing = await prisma.listing.findUnique({
            where: { id }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        if (listing.userId !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await prisma.listing.delete({
            where: { id }
        });

        res.json({ message: 'Listing deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getMyListings = async (req, res) => {
    try {
        const userId = req.user.id;
        const listings = await prisma.listing.findMany({
            where: { userId },
            include: {
                images: true
            }
        });
        res.json(listings);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const searchListings = async (req, res) => {
    try {
        const { query, type, minPrice, maxPrice, status } = req.query;

        const where = {
            status: status || 'ACTIVE',
            AND: []
        };

        if (query) {
            where.AND.push({
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ]
            });
        }

        if (type) {
            where.type = type;
        }

        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price.gte = parseFloat(minPrice);
            if (maxPrice) where.price.lte = parseFloat(maxPrice);
        }

        const listings = await prisma.listing.findMany({
            where,
            include: {
                images: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profileImage: true
                    }
                }
            }
        });

        res.json(listings);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const uploadListingImages = async (req, res) => {
    // Implementation depends on your file upload solution
    // (e.g., multer, cloudinary, etc.)
    res.status(501).json({ error: 'Not implemented' });
};

export const createListingWithImages = async (req, res) => {
  try {
    const { title, description, price, type, currency, location, features } = req.body;
    const images = req.files; // Array of image files
    const userId = req.user.userId;

    // Check if user is vendor
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isVendor: true }
    });

    if (!user?.isVendor) {
      return res.status(403).json({
        error: 'Only vendors can create listings. Please become a vendor first.'
      });
    }

    // Upload images to Cloudinary with progress tracking
    const uploadPromises = images.map((file) => {
      return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          {
            folder: 'listings',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        // Create readable stream from buffer and pipe to Cloudinary
        const stream = Readable.from(file.buffer);
        stream.pipe(upload);

        // Track upload progress
        upload.on('progress', (progress) => {
          // Emit progress through Server-Sent Events if needed
          if (req.accepts('text/event-stream')) {
            res.write(`data: ${JSON.stringify({ progress })}\n\n`);
          }
        });
      });
    });

    const uploadedImages = await Promise.all(uploadPromises);

    // Create listing with uploaded image URLs
    const listing = await prisma.listing.create({
      data: {
        userId,
        title,
        description,
        price,
        type,
        currency,
        location,
        features,
        status: 'DRAFT',
        images: {
          create: uploadedImages.map((img, index) => ({
            url: img.secure_url,
            isPrimary: index === 0
          }))
        }
      },
      include: {
        images: true
      }
    });

    res.status(201).json(listing);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};