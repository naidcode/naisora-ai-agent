// config/smtp.js
// Naisora AI Agent — Resend Email Config (API Only)

const { Resend } = require('resend');

/**
 * Initialize Resend client
 * Uses RESEND_API_KEY from .env
 */
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an email using Resend API
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 */
async function sendEmail(to, subject, html) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Nahid from Naisora <hello@naisora.com>',
      to: to,
      subject: subject,
      html: html
    });
    
    if (error) {
      console.error('❌ Resend Error:', error.message);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Email Sending Failed (Resend):', error.message);
    throw error;
  }
}

/**
 * Tests the Resend API connection
 */
async function testConnection() {
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY missing in .env');
    return false;
  }
  
  if (!process.env.RESEND_API_KEY.startsWith('re_')) {
    console.error('❌ Invalid RESEND_API_KEY — must start with re_');
    return false;
  }

  console.log('✅ Email connected via Resend API');
  return true;
}

module.exports = { 
  sendEmail,
  testConnection
};
