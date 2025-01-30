import { PrismaClient } from '@prisma/client';
import { APIError, NotFoundError } from '../utils/errors.js';

const prisma = new PrismaClient();

export const createOffer = async (req, res, next) => {
  try {
    const buyerId = req.user.userId;
    const { listingId, price, message } = req.body;

    // Validate buyer exists
    const buyer = await prisma.user.findUnique({
      where: { id: buyerId },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });

    if (!buyer) {
      throw new APIError('Buyer not found', 404);
    }

    // Get listing and seller details
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!listing) {
      throw new APIError('Listing not found', 404);
    }

    // Prevent self-offers
    if (listing.userId === buyerId) {
      throw new APIError('Cannot make an offer on your own listing', 400);
    }

    // Create or find conversation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.upsert({
        where: {
          buyerId_sellerId_listingId: {
            buyerId,
            sellerId: listing.userId,
            listingId
          }
        },
        create: {
          buyerId,
          sellerId: listing.userId,
          listingId,
          type: 'OFFER'
        },
        update: {}
      });

      const offerMessage = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: buyerId,
          content: message,
          metadata: {
            type: 'OFFER',
            price: parseFloat(price),
            status: 'PENDING'
          }
        },
        include: {
          sender: {
            select: {
              firstName: true,
              lastName: true,
              profileImage: true
            }
          }
        }
      });

      return { conversation, offerMessage };
    });

    res.status(201).json({
      status: 'success',
      conversation: {
        id: result.conversation.id,
        listing: {
          id: listing.id,
          title: listing.title,
          price: listing.price
        },
        seller: listing.user,
        latestMessage: result.offerMessage
      }
    });
  } catch (error) {
    if (error instanceof APIError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Offer creation error:', error);
      res.status(500).json({ error: 'Failed to create offer' });
    }
  }
};

export const getOffers = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { type = 'received' } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = type === 'sent' 
      ? { buyerId: userId }
      : { sellerId: userId };

    const offers = await prisma.offer.findMany({
      where,
      include: {
        buyer: {
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
            title: true,
            price: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.offer.count({ where });

    res.json({
      status: 'success',
      offers,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

export const respondToOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { listing: true }
    });

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (offer.listing.userId !== userId) {
      throw new APIError('Not authorized to respond to this offer', 403);
    }

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      throw new APIError('Invalid status. Must be ACCEPTED or REJECTED', 400);
    }

    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: { status },
      include: {
        buyer: {
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
            title: true,
            price: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      offer: updatedOffer
    });
  } catch (error) {
    next(error);
  }
};

export const markOfferCompleted = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const userId = req.user.userId;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { listing: true }
    });

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (offer.listing.userId !== userId) {
      throw new APIError('Not authorized to complete this offer', 403);
    }

    if (offer.status !== 'ACCEPTED') {
      throw new APIError('Can only complete accepted offers', 400);
    }

    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: { status: 'COMPLETED' },
      include: {
        buyer: {
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
            title: true,
            price: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      offer: updatedOffer
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOffers = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const offers = await prisma.offer.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      },
      include: {
        buyer: {
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
            title: true,
            price: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.offer.count({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      }
    });

    res.json({
      status: 'success',
      offers,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
}; 