// config/smtp.js
// Naisora AI Agent — Hostinger SMTP Email Config
// Using nodemailer for reliability

const nodemailer = require('nodemailer');

// Hostinger SMTP configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || 'hey@naisora.com',
    pass: process.env.SMTP_PASS,
  },
  pool: true, // Use pooled connections for better performance
  maxConnections: 5,
  maxMessages: 100
});

/**
 * Sends an email using Hostinger SMTP
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} body - Email body (HTML or Plain Text)
 */
async function sendEmail(to, subject, body) {
  console.log(`✉️ Preparing to send email to: ${to}`);
  
  try {
    const mailOptions = {
      from: `"Nahid from Naisora" <${process.env.EMAIL_USER || 'hey@naisora.com'}>`,
      to: to,
      subject: subject,
      html: body, // Assume HTML
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ SMTP Email Sending Failed:', error.message);
    throw error;
  }
}

/**
 * Tests the SMTP connection
 */
async function testConnection() {
  console.log('📡 Testing Hostinger SMTP connection...');
  
  if (!process.env.SMTP_PASS) {
    console.error('❌ SMTP_PASS missing in .env');
    return false;
  }

  try {
    await transporter.verify();
    console.log('✅ Hostinger SMTP connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Hostinger SMTP Connection Failed:', error.message);
    return false;
  }
}

module.exports = { 
  sendEmail,
  testConnection,
  transporter
};
