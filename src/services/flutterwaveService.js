import axios from 'axios';
import crypto from 'crypto';

export class FlutterwaveService {
  constructor() {
    this.secretKey = process.env.FLW_SECRET_KEY;
    this.publicKey = process.env.FLW_PUBLIC_KEY;
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
          name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
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

      console.log('Flutterwave Init Response:', response.data);
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
      
      console.log('Flutterwave Verify Response:', response.data);
      return response.data.status === 'success';
    } catch (error) {
      console.error('Payment verification error:', error.response?.data || error.message);
      return false;
    }
  }

  verifyWebhookSignature(signature, requestBody) {
    const hash = crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(requestBody))
      .digest('hex');
    return hash === signature;
  }
}
