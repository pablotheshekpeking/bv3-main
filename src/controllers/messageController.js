import { PrismaClient } from '@prisma/client';
import { APIError, NotFoundError } from '../utils/errors.js';

const prisma = new PrismaClient();

export const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user.userId;
    const { receiverId, content, conversationId, listingId } = req.body;

    // Validate required fields
    if (!receiverId || !content) {
      return res.status(400).json({
        error: 'Receiver ID and content are required'
      });
    }

    // Validate receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      throw new NotFoundError('Receiver not found');
    }

    // If listingId provided, validate listing exists
    if (listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId }
      });
      if (!listing) {
        throw new NotFoundError('Listing not found');
      }
    }

    // If no conversationId provided, check if conversation exists or create new one
    let conversation;
    if (!conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: {
          OR: [
            {
              AND: [
                { buyerId: senderId },
                { sellerId: receiverId }
              ]
            },
            {
              AND: [
                { buyerId: receiverId },
                { sellerId: senderId }
              ]
            }
          ],
          ...(listingId && { listingId })
        }
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            buyerId: senderId,
            sellerId: receiverId,
            type: 'CHAT',
            ...(listingId && { listingId })
          }
        });
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        conversationId: conversationId || conversation.id,
        ...(listingId && { listingId }),
        read: false,
        updatedAt: new Date()
      },
      include: {
        sender: {
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

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationId || conversation.id },
      data: { lastMessageAt: new Date() }
    });

    res.status(201).json({
      status: 'success',
      message
    });
  } catch (error) {
    console.error('Send message error:', error);
    next(error);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    const total = await prisma.message.count({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      }
    });

    res.json({
      status: 'success',
      messages,
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

export const markAsRead = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        receiverId: userId
      }
    });

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { read: true }
    });

    res.json({
      status: 'success',
      message: 'Message marked as read'
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const count = await prisma.message.count({
      where: {
        receiverId: userId,
        read: false
      }
    });

    res.json({
      status: 'success',
      count
    });
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const conversations = await prisma.conversation.findMany({
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
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            createdAt: true,
            read: true
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
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.conversation.count({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      }
    });

    res.json({
      status: 'success',
      conversations: conversations.map(conv => ({
        id: conv.id,
        otherUser: userId === conv.buyerId ? conv.seller : conv.buyer,
        lastMessage: conv.messages[0],
        lastMessageTime: conv.lastMessageAt,
        listing: conv.listing
      })),
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