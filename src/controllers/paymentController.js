import { FlutterwaveService } from '../services/flutterwaveService.js';

const flutterwaveService = new FlutterwaveService();

export const initializeFlutterwavePayment = async (req, res) => {
  try {
    const { amount, email, firstName, lastName, reference, metadata } = req.body;

    const result = await flutterwaveService.initializeTransaction({
      amount,
      email,
      firstName,
      lastName,
      reference,
      metadata,
      redirect_url: 'https://your-domain.com/payment/callback' // Your callback URL
    });

    res.json(result);
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ error: error.message });
  }
};
