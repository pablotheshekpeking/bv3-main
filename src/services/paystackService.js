import axios from 'axios';
import crypto from 'crypto';

export class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseURL = 'https://api.paystack.co';
  }

  async initializeTransaction(data) {
    try {
      // Validate required fields
      if (!data.email) {
        throw new Error('Email is required');
      }
      if (!data.amount) {
        throw new Error('Amount is required');
      }
      if (!data.reference) {
        throw new Error('Reference is required');
      }

      const response = await axios.post(`${this.baseURL}/transaction/initialize`, {
        email: data.email,
        amount: Math.round(data.amount),
        reference: data.reference,
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money'],
        metadata: {
          ...data.metadata,
          platform: 'mobile'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Paystack Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Paystack Error Details:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize Paystack transaction');
    }
  }

  async verifyPaymentStatus(reference) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`
          }
        }
      );
      
      // Log the full response for debugging
      console.log('Paystack Verification Response:', response.data);
      
      // Check for both status and gateway_response
      return response.data.data.status === 'success' || 
             response.data.data.gateway_response === 'Successful';
    } catch (error) {
      console.error('Payment verification error:', error.response?.data || error.message);
      return false;
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