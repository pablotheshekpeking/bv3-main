import axios from 'axios';
import { createHmac } from 'node:crypto';

export class FlutterwaveService {
  constructor() {
    this.secretKey = process.env.FLW_SECRET_KEY;
    this.publicKey = process.env.FLW_PUBLIC_KEY;
    this.webhookSecret = process.env.FLW_WEBHOOK_SECRET;
    this.baseURL = 'https://api.flutterwave.com/v3';
  }

  async initializeTransaction(data) {
    try {
      if (!data.email || !data.amount || !data.reference) {
        throw new Error('email, amount and reference are required');
      }

      const payload = {
        tx_ref: data.reference,
        amount: data.amount,
        currency: 'NGN', // or your preferred currency
        redirect_url: data.redirect_url,
        customer: {
          email: data.email,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        },
        meta: {
          ...data.metadata,
          platform: 'mobile',
        },
      };

      const response = await axios.post(
        `${this.baseURL}/payments`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Log the complete Flutterwave response
      console.log('Flutterwave Init Response:', JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error) {
      console.error('Flutterwave Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize Flutterwave transaction');
    }
  }

  async verifyPaymentStatus(reference) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transactions/${reference}/verify`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`
          }
        }
      );
      
      // Log the complete verification response
      console.log('Flutterwave Verify Response:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error) {
      console.error('Payment verification error:', error.response?.data || error.message);
      return null;
    }
  }

  verifyWebhookSignature(signature, requestBody) {
    try {
      // Use the webhook secret from environment variables
      const secret = this.webhookSecret || 'flutterhash';
      
      // Create HMAC hash
      const hash = createHmac('sha256', secret)
        .update(JSON.stringify(requestBody))
        .digest('hex');
      
      // Log for debugging
      console.log('Generated hash:', hash);
      console.log('Received signature:', signature);
      
      // Compare the generated hash with the received signature
      return hash === signature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }
}
