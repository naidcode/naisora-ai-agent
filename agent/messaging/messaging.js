const { db } = require('../database/database');
const { canContact } = require('../dedup/dedup');
const { sendUltraMsg } = require('../../config/ultramsg');
const { sendEmail } = require('../../modules/email/emailSender');
const { logError } = require('../error_handler/error_handler');
const nodemailer = require('nodemailer');

const RATE_LIMIT = {
  email: 30,      // per hour
  whatsapp: 20    // per hour
};

/**
 * Check if we can send a message on a specific channel based on hourly limits
 */
async function canSend(channel) {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const count = await db.leads.count({ 
    since: oneHourAgo, 
    contactChannel: channel 
  });
  
  const allowed = count < RATE_LIMIT[channel];
  if (!allowed) {
    console.log(`🛑 Rate limit hit for ${channel}: ${count}/${RATE_LIMIT[channel]} sent in last hour.`);
  }
  return allowed;
}

/**
 * Validate SMTP connection
 */
async function validateSMTP() {
  try {
    const { transporter } = require('../../config/smtp');
    await transporter.verify();
    return true;
  } catch (err) {
    console.error('SMTP Validation Failed:', err.message);
    return false;
  }
}

/**
 * Send email with retry and timeout logic
 */
async function sendEmailWithRetry(lead) {
  let retries = 3;
  let delay = 2000;

  while (retries > 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      if (!(await validateSMTP())) throw new Error('SMTP connection invalid');

      await sendEmail(lead.email, `Exclusive Offer for ${lead.name}`, `Hi ${lead.name}...`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch (err) {
      clearTimeout(timeoutId);
      retries--;
      
      if (err.name === 'AbortError') {
        console.error(`Timeout sending email to ${lead.email}`);
      }

      if (retries === 0) {
        await logError("Email Messaging", err);
        return false;
      }
      
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

async function sendMessage(lead) {
  const allowed = await canContact(lead);
  if (!allowed) return;

  if (!lead.email && !lead.phone) return;

  let success = false;
  let channel = null;

  if (lead.email) {
    if (!(await canSend('email'))) return;
    
    console.log(`📧 Sending email to ${lead.email}...`);
    success = await sendEmailWithRetry(lead);
    channel = "email";
  } else if (lead.phone) {
    if (!(await canSend('whatsapp'))) return;

    console.log(`📲 Sending WhatsApp to ${lead.phone}...`);
    try {
      await sendUltraMsg(lead.phone, `Hi ${lead.name}, this is Naisora...`);
      success = true;
      channel = "whatsapp";
    } catch (err) {
      await logError("WhatsApp Messaging", err);
    }
  }

  if (success) {
    await db.leads.update(lead.id, {
      contacted: true,
      lastContactedAt: new Date(),
      contactChannel: channel
    });
  }
}

module.exports = {
  sendMessage,
  sendEmailWithRetry,
  canSend,
  validateSMTP
};
