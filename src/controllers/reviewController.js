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
        listingId
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true
          }
        },
        targetUser: {
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
        listingId
      }
    });

    // Calculate average rating for the listing
    const avgRating = await prisma.review.aggregate({
      where: { 
        listingId
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

    // Get all reviews for the user
    const reviews = await prisma.review.findMany({
      where: { 
        targetUserId: userId
      },
      select: {
        rating: true,
        comment: true,
        createdAt: true,
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
      orderBy: {
        createdAt: 'desc'
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
      ratingDistribution,
      reviews: reviews.map(review => ({
        ...review,
        user: {
          ...review.user,
          name: `${review.user.firstName} ${review.user.lastName}`
        }
      }))
    });
  } catch (error) {
    console.error('Error calculating user rating:', error);
    res.status(500).json({ 
      message: 'Error calculating user rating', 
      error: error.message 
    });
  }
}; 