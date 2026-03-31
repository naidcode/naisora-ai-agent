// modules/offpage/reviewRequester.js
// Sends WhatsApp messages asking happy customers for Google reviews

const { route } = require('../../config/llmRouter');
const { sendWhatsApp } = require('../outreach/whatsappSender');

async function writeReviewRequestMessage(restaurant, customerName) {
  const prompt = `Write a short WhatsApp message asking a customer for a Google review.

Restaurant: ${restaurant.name}
Customer name: ${customerName || 'valued customer'}

Rules:
- Very short (2-3 sentences max)
- Friendly and genuine, not pushy
- Include direct Google review link placeholder: [GOOGLE_REVIEW_LINK]
- Sound like the restaurant owner personally writing

Return only the message text.`;

  return await route('whatsapp_followup', prompt, null, 100);
}

async function sendReviewRequest(restaurant, customer) {
  if (!customer.phone) return;

  const message = await writeReviewRequestMessage(restaurant, customer.name);
  const finalMessage = message.replace('[GOOGLE_REVIEW_LINK]', restaurant.google_review_link || 'our Google Maps page');

  await sendWhatsApp({ phone: customer.phone, business_name: customer.name, id: customer.id }, finalMessage);
  console.log(`✅ Review request sent to ${customer.name}`);
}

module.exports = { writeReviewRequestMessage, sendReviewRequest };