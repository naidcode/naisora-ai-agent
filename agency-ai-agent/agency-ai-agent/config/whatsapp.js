const path = require('path');
const fs = require('fs');
const { supabase } = require('./database');

/**
 * sendWhatsAppMessage
 * In Queue Mode (Railway), this inserts into the 'whatsapp_queue' table.
 * On Local, it still uses the Baileys socket if connected.
 */
async function sendWhatsAppMessage(phone, message) {
  try {
    // Check if we are in Queue Mode (Railway or explicitly enabled)
    const IS_RAILWAY = !!process.env.RAILWAY_ENVIRONMENT;
    
    if (IS_RAILWAY) {
      console.log(`☁️  Railway detected: Queuing message for ${phone}`);
      const { error } = await supabase.from('whatsapp_queue').insert({
        phone: phone,
        message: message,
        status: 'pending'
      });
      return !error;
    }

    // Local sending logic (if needed)
    // Note: Most local sending should happen via whatsapp-service.js now
    console.log(`💻 Local detected: Queuing message for ${phone} (Local Service will handle it)`);
    const { error } = await supabase.from('whatsapp_queue').insert({
      phone: phone,
      message: message,
      status: 'pending'
    });
    return !error;
  } catch (err) {
    console.log(`❌ Failed to handle WhatsApp for ${phone}: ${err.message}`);
    return false;
  }
}

// Stub for connection (not used on Railway anymore)
async function connectWhatsApp() {
  console.log('ℹ️  connectWhatsApp() called: Redirecting to Queue Mode.');
  return null;
}

function getWhatsAppStatus() {
  return '☁️  Queue Mode';
}

module.exports = { connectWhatsApp, getWhatsAppStatus, sendWhatsAppMessage };
