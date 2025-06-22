import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { APIError } from '../utils/errors.js';
import { FlutterwaveService } from '../services/flutterwaveService.js';
import { sendVendorPaymentEmail } from '../services/emailService.js';

const prisma = new PrismaClient();
const flutterwaveService = new FlutterwaveService();

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await prisma.user.findFirst({
            where: { email, role: 'ADMIN' }
        });

        if (!admin || !(await bcrypt.compare(password, admin.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: admin.id },
            process.env.ADMIN_JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
};

export const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

export const getUser = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await prisma.user.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
};

export const getPendingVendorPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get bookings that are completed and need vendor payment
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        listing: {
          user: {
            isVendor: true
          }
        },
        vendorPayment: null // No payment record exists
      },
      include: {
        listing: {
          select: {
            title: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                vendorBankAccounts: {
                  where: { isDefault: true },
                  take: 1
                }
              }
            }
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: parseInt(limit)
    });

    const total = await prisma.booking.count({
      where: {
        status: 'COMPLETED',
        listing: {
          user: {
            isVendor: true
          }
        },
        vendorPayment: null
      }
    });

    res.json({
      status: 'success',
      bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get pending vendor payments error:', error);
    res.status(500).json({
      error: 'Failed to fetch pending vendor payments'
    });
  }
};

export const processVendorPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { bankAccountId } = req.body;

    // Get the booking with vendor details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: {
          select: {
            title: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                vendorBankAccounts: {
                  where: { id: bankAccountId },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (!booking) {
      throw new APIError('Booking not found', 404);
    }

    const vendor = booking.listing.user;
    const bankAccount = vendor.vendorBankAccounts[0];

    if (!bankAccount) {
      throw new APIError('Vendor bank account not found', 400);
    }

    // Initiate transfer via Flutterwave
    const transferPayload = {
      account_bank: bankAccount.accountBank, // bank code
      account_number: bankAccount.accountNumber,
      amount: Number(booking.basePrice), // or your commission logic
      currency: booking.listing.currency || 'NGN',
      narration: `Payout for booking ${booking.id} - ${booking.listing.title}`,
      reference: `VENDOR-PAYOUT-${booking.id}-${Date.now()}`,
      callback_url: process.env.FLUTTERWAVE_PAYOUT_CALLBACK_URL
    };

    const transferResponse = await flutterwaveService.initiateTransfer(transferPayload);

    if (transferResponse.status !== 'success') {
      throw new APIError('Flutterwave transfer failed', 500);
    }

    // Record the vendor payment in your DB (create a VendorPayment model if needed)
    await prisma.vendorPayment.create({
      data: {
        bookingId: booking.id,
        vendorId: vendor.id,
        amount: transferPayload.amount,
        currency: transferPayload.currency,
        bankAccountId: bankAccount.id,
        flutterwaveRef: transferResponse.data.id,
        status: 'PROCESSING'
      }
    });

    // Optionally, notify the vendor by email
    await sendVendorPaymentEmail(vendor, booking, transferPayload.amount, transferPayload.currency);

    res.json({
      status: 'success',
      message: 'Vendor payment initiated successfully',
      transfer: transferResponse.data
    });
  } catch (error) {
    console.error('Process vendor payment error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error'
    });
  }
};

// Add other controller methods similarly 