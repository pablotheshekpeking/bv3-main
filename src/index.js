import express from 'express';
import http from 'http';
import WebSocketService from './services/websocketService.js';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { adminJs, adminRouter } from './admin/index.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import kycRoutes from './routes/kycRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import pointsRoutes from './routes/pointsRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import { handlePaystackWebhook } from './controllers/webhookController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize WebSocket service with the HTTP server
const wsService = new WebSocketService(server);

// Configure CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Paystack webhook route - needs raw body for signature verification
app.use('/api/webhook/paystack', express.raw({ type: 'application/json' }));

// Admin panel route - before body parser
app.use(adminJs.options.rootPath, adminRouter);

// Body parser middleware - after AdminJS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/bookings', bookingRoutes);

// Paystack webhook route
app.post('/api/webhook/paystack', handlePaystackWebhook);

// Add error handler last
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server is ready`);
}); 