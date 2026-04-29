const { sendUltraMsg } = require('./ultramsg');

/**
 * sendWhatsAppMessage
 * Sends a message via UltraMsg API
 */
async function sendWhatsAppMessage(phone, message) {
  try {
    console.log(`📤 Sending UltraMsg to ${phone}`);
    await sendUltraMsg(phone, message);
    return true;
  } catch (err) {
    console.log(`❌ UltraMsg failed for ${phone}: ${err.message}`);
    return false;
  }
}

// Stub for compatibility
async function connectWhatsApp() {
  return true;
}

function getWhatsAppStatus() {
  return '🟢 UltraMsg API Ready';
}

module.exports = { connectWhatsApp, getWhatsAppStatus, sendWhatsAppMessage };
