import { PrismaClient } from '@prisma/client';
import { APIError } from '../utils/errors.js';
import { FlutterwaveService } from '../services/flutterwaveService.js';

const prisma = new PrismaClient();
const flutterwaveService = new FlutterwaveService();

export const becomeVendor = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerified: true,
        phoneVerified: true,
        kycVerified: true,
        isVendor: true
      }
    });

    if (!user) {
      throw new APIError('User not found', 404);
    }

    if (user.isVendor) {
      throw new APIError('User is already a vendor', 400);
    }

    if (!user.emailVerified || !user.phoneVerified || !user.kycVerified) {
      throw new APIError('Please complete email, phone and KYC verification first', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isVendor: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isVendor: true
      }
    });

    res.json({
      status: 'success',
      message: 'Successfully became a vendor',
      user: updatedUser
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const addBankAccount = async (req, res) => {
  try {
    const { accountNumber, accountBank, accountName } = req.body;
    const userId = req.user.userId;

    // Verify the user is a vendor
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user.isVendor) {
      throw new APIError('Only vendors can add bank accounts', 403);
    }

    // Verify account details with Flutterwave
    {/*const verificationResponse = await flutterwaveService.verifyBankAccount({
      account_number: accountNumber,
      account_bank: accountBank
    });*/}

    //if (!verificationResponse.status === 'success') {
    //  throw new APIError('Invalid bank account details', 400);
    //}

    // Create bank account record
    const bankAccount = await prisma.vendorBankAccount.create({
      data: {
        userId,
        accountNumber,
        accountBank,
        accountName,
        isVerified: true
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Bank account added successfully',
      bankAccount
    });
  } catch (error) {
    console.error('Add bank account error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error'
    });
  }
};

export const getBankAccounts = async (req, res) => {
  try {
    const userId = req.user.userId;

    const bankAccounts = await prisma.vendorBankAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      status: 'success',
      bankAccounts
    });
  } catch (error) {
    console.error('Get bank accounts error:', error);
    res.status(500).json({
      error: 'Failed to fetch bank accounts'
    });
  }
};

export const deleteBankAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.userId;

    const bankAccount = await prisma.vendorBankAccount.findFirst({
      where: { id: accountId, userId }
    });

    if (!bankAccount) {
      throw new APIError('Bank account not found', 404);
    }

    await prisma.vendorBankAccount.delete({
      where: { id: accountId }
    });

    res.json({
      status: 'success',
      message: 'Bank account deleted successfully'
    });
  } catch (error) {
    console.error('Delete bank account error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error'
    });
  }
};

export const setDefaultBankAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.userId;

    // First, unset all default accounts for this user
    await prisma.vendorBankAccount.updateMany({
      where: { userId },
      data: { isDefault: false }
    });

    // Then set the selected account as default
    const bankAccount = await prisma.vendorBankAccount.update({
      where: { id: accountId, userId },
      data: { isDefault: true }
    });

    if (!bankAccount) {
      throw new APIError('Bank account not found', 404);
    }

    res.json({
      status: 'success',
      message: 'Default bank account updated successfully',
      bankAccount
    });
  } catch (error) {
    console.error('Set default bank account error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error'
    });
  }
};

export const getBanks = async (req, res) => {
  try {
    const { country = 'NG' } = req.query; // Default to Nigeria if no country provided
    const userId = req.user.userId;

    // Check if Flutterwave is configured
    if (!process.env.FLW_SECRET_KEY) {
      return res.status(500).json({
        status: 'error',
        error: 'Flutterwave is not configured. Please contact support.'
      });
    }

    // Get user's country if not provided in query
    let userCountry = country;
    if (!country || country === 'user') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { country: true }
      });
      userCountry = user?.country || 'NG'; // Default to Nigeria if no country set
    }

    console.log(`Fetching banks for country: ${userCountry}`);
    
    // Fetch banks from Flutterwave
    const banksResponse = await flutterwaveService.getBanks(userCountry);
    
    if (banksResponse.status !== 'success') {
      return res.status(400).json({
        status: 'error',
        error: banksResponse.message || 'Failed to fetch banks'
      });
    }

    res.json({
      status: 'success',
      banks: banksResponse.data,
      country: userCountry
    });
  } catch (error) {
    console.error('Get banks error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message || 'Failed to fetch banks'
    });
  }
}; 