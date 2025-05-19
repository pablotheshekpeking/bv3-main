import axios from 'axios';
import crypto from 'crypto';

export class RemitaService {
  constructor() {
    this.publicKey = 'pk_test_dX/o1ZX07oXGdewQ/COMTN+q/LjAB7/b/L9ZbMhiUzX3+0jGrlUS9tQjqkQue7jx';
    this.secretKey = 'sk_test_dX/o1ZX07oXke18iOL0Zr6Hp+vPQ4amTeV2jvnpCuH/fe5wsDmFqFaXT72WO9RcP';
    this.baseURL = 'https://api.remita.net/api/v1';
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

      const payload = {
        amount: Math.round(data.amount),
        orderId: data.reference,
        payerName: data.payerName || 'Customer',
        payerEmail: data.email,
        payerPhone: data.phone || '',
        description: data.description || 'Payment for services',
        customFields: [
          {
            name: 'metadata',
            value: JSON.stringify(data.metadata || {})
          }
        ]
      };

      // Generate signature
      const signature = this.generateSignature(payload);

      const response = await axios.post(
        `${this.baseURL}/merchant/init`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.publicKey}`,
            'X-Signature': signature
          }
        }
      );

      console.log('Remita Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Remita Error Details:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize Remita transaction');
    }
  }

  async verifyPaymentStatus(reference) {
    try {
      // Generate signature for verification request
      const signature = this.generateSignature({ orderId: reference });

      const response = await axios.get(
        `${this.baseURL}/merchant/order/${reference}/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.publicKey}`,
            'X-Signature': signature
          }
        }
      );
      
      console.log('Remita Verification Response:', response.data);
      
      // Check payment status
      return response.data.status === '00' || response.data.status === 'SUCCESS';
    } catch (error) {
      console.error('Payment verification error:', error.response?.data || error.message);
      return false;
    }
  }

  generateSignature(payload) {
    const stringifiedPayload = JSON.stringify(payload);
    return crypto
      .createHmac('sha512', this.secretKey)
      .update(stringifiedPayload)
      .digest('hex');
  }

  verifyWebhookSignature(signature, requestBody) {
    const hash = this.generateSignature(requestBody);
    return hash === signature;
  }
} 
