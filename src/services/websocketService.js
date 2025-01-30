import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default class WebSocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.userSockets = new Map(); // userId -> socket
    this.socketUsers = new Map(); // socketId -> userId

    this.initialize();
  }

  initialize() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user.id;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    const userId = socket.userId;
    this.userSockets.set(userId, socket);
    this.socketUsers.set(socket.id, userId);

    // Handle private messages
    socket.on('private_message', async (data) => {
      try {
        const { receiverId, content } = data;
        
        // Store message in database
        const message = await prisma.message.create({
          data: {
            senderId: userId,
            receiverId,
            content,
          },
        });

        // Send to recipient if online
        const recipientSocket = this.userSockets.get(receiverId);
        if (recipientSocket) {
          recipientSocket.emit('private_message', {
            messageId: message.id,
            senderId: userId,
            content,
            createdAt: message.createdAt
          });
        }

        // Confirm message delivery to sender
        socket.emit('message_sent', {
          messageId: message.id,
          receiverId,
          status: 'sent'
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle read receipts
    socket.on('message_read', async (data) => {
      try {
        const { messageId } = data;
        await prisma.message.update({
          where: { id: messageId },
          data: { read: true }
        });

        const message = await prisma.message.findUnique({
          where: { id: messageId }
        });

        const senderSocket = this.userSockets.get(message.senderId);
        if (senderSocket) {
          senderSocket.emit('message_read', { messageId });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const userId = this.socketUsers.get(socket.id);
      this.userSockets.delete(userId);
      this.socketUsers.delete(socket.id);
    });
  }

  // Method to send system messages
  async sendSystemMessage(userId, content) {
    const socket = this.userSockets.get(userId);
    if (socket) {
      socket.emit('system_message', { content });
    }
  }
} 