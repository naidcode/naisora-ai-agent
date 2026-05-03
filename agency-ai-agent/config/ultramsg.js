const axios = require('axios');

/**
 * Send a WhatsApp message via UltraMsg API
 * @param {string} to - Phone number (e.g. +919876543210)
 * @param {string} body - Message text
 */
async function sendUltraMsg(to, body) {
  const instance = process.env.ULTRAMSG_INSTANCE;
  const token = process.env.ULTRAMSG_TOKEN;

  if (!instance || !token) {
    throw new Error('ULTRAMSG_INSTANCE or ULTRAMSG_TOKEN missing in .env');
  }

  // Clean phone number (strip + and spaces)
  const phone = to.replace(/\D/g, '');

  try {
    const response = await axios.post(
      `https://api.ultramsg.com/${instance}/messages/chat`,
      {
        token: token,
        to: phone,
        body: body,
        priority: 10
      }
    );

    return response.data;
  } catch (err) {
    console.error('UltraMsg Send Error:', err.response?.data || err.message);
    throw err;
  }
}

module.exports = { sendUltraMsg };
