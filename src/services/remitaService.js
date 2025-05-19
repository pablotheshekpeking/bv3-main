import axios from 'axios';
import crypto from 'crypto';

export class RemitaService {
  constructor() {
    this.apiKey = process.env.REMITA_API_KEY;
    this.merchantId = process.env.REMITA_MERCHANT_ID;
    this.serviceTypeId = process.env.REMITA_SERVICE_TYPE_ID;
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
        serviceTypeId: this.serviceTypeId,
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

      const response = await axios.post(
        `${this.baseURL}/merchant/init`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'MerchantId': this.merchantId
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
      const response = await axios.get(
        `${this.baseURL}/merchant/${this.merchantId}/order/${reference}/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'MerchantId': this.merchantId
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

  verifyWebhookSignature(signature, requestBody) {
    const hash = crypto
      .createHmac('sha512', this.apiKey)
      .update(JSON.stringify(requestBody))
      .digest('hex');
    return hash === signature;
  }
} 