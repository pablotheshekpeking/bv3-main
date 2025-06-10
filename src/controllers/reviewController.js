import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createReview = async (req, res) => {
  try {
    const { userId } = req.user;
    const { targetUserId, listingId, rating, comment } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const review = await prisma.review.create({
      data: {
        userId,
        targetUserId,
        listingId,
        rating,
        comment
      }
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error creating review', error: error.message });
  }
};

export const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await prisma.review.findMany({
      where: { targetUserId: userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true
          }
        },
        listing: {
          select: {
            id: true,
            title: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.review.count({
      where: { targetUserId: userId }
    });

    res.json({
      reviews,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
};

export const getListingReviews = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await prisma.review.findMany({
      where: { 
        listingId,
        deletedAt: null // Only get non-deleted reviews
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.review.count({
      where: { 
        listingId,
        deletedAt: null
      }
    });

    // Calculate average rating for the listing
    const avgRating = await prisma.review.aggregate({
      where: { 
        listingId,
        deletedAt: null
      },
      _avg: {
        rating: true
      }
    });

    res.json({
      reviews,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      },
      averageRating: avgRating._avg.rating || 0
    });
  } catch (error) {
    console.error('Error fetching listing reviews:', error);
    res.status(500).json({ 
      message: 'Error fetching reviews', 
      error: error.message 
    });
  }
};

export const getUserRating = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all non-deleted reviews for the user
    const reviews = await prisma.review.findMany({
      where: { 
        targetUserId: userId,
        deletedAt: null
      },
      select: {
        rating: true
      }
    });

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    // Get rating distribution
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    reviews.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    res.json({
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews: reviews.length,
      ratingDistribution
    });
  } catch (error) {
    console.error('Error calculating user rating:', error);
    res.status(500).json({ 
      message: 'Error calculating user rating', 
      error: error.message 
    });
  }
}; 