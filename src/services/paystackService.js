import axios from 'axios';
import crypto from 'crypto';

export class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseURL = 'https://api.paystack.co';
  }

  async initializeTransaction(data) {
    try {
      const response = await axios.post(`${this.baseURL}/transaction/initialize`, {
        email: data.email,
        amount: Math.round(data.amount * 100), // Convert to kobo/cents
        reference: data.reference,
        callback_url: data.callbackUrl,
        metadata: data.metadata
      }, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to initialize Paystack transaction');
    }
  }

  async verifyTransaction(reference) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error('Failed to verify Paystack transaction');
    }
  }

  verifyWebhookSignature(signature, requestBody) {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(JSON.stringify(requestBody))
      .digest('hex');
    return hash === signature;
  }
} 