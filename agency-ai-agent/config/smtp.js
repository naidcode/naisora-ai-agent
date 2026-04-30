// config/smtp.js
// Naisora AI Agent — Hostinger SMTP Config (Nodemailer)

const nodemailer = require('nodemailer');

/**
 * Initialize Nodemailer transporter with Hostinger settings
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || 'hey@naisora.com',
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Sends an email using Hostinger SMTP
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 */
async function sendEmail(to, subject, html) {
  try {
    const fromUser = process.env.EMAIL_USER || 'hey@naisora.com';
    const info = await transporter.sendMail({
      from: `"Nahid from Naisora" <${fromUser}>`,
      to: to,
      subject: subject,
      html: html,
      text: html.replace(/<[^>]*>?/gm, '') // Simple text fallback
    });
    
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Email Sending Failed (Hostinger):', error.message);
    throw error;
  }
}

/**
 * Tests the SMTP connection
 */
async function testConnection() {
  try {
    await transporter.verify();
    console.log('✅ Email connected via Hostinger SMTP');
    return true;
  } catch (error) {
    console.error('❌ Hostinger SMTP Connection Failed:', error.message);
    return false;
  }
}

module.exports = { 
  sendEmail,
  testConnection
};
