import crypto from 'crypto';

function generateWebhookHash(payload) {
  return crypto
    .createHmac('sha256', 'flutterhash')
    .update(JSON.stringify(payload))
    .digest('hex');
}

// Example usage for any payment
function createWebhookPayload(bookingId, status = 'successful') {
  return {
    "event": "charge.completed",
    "data": {
      "tx_ref": `BOOK-${bookingId}`,
      "status": status,
      "meta": {
        "type": "booking",
        "bookingId": bookingId
      }
    }
  };
}

// Example: Generate hash for a specific booking
const bookingId = 'ac404a2b-1693-4b8b-8e36-5acecdbdb560'; // Replace with any booking ID
const payload = createWebhookPayload(bookingId);
const hash = generateWebhookHash(payload);

console.log('Webhook Payload:', JSON.stringify(payload, null, 2));
console.log('\nverif-hash:', hash);
