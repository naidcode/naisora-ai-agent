// config/smtp.js
// Naisora AI Agent — Gmail SMTP Config (Nodemailer)

const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const fs = require('fs');

// Load .env directly
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const cleaned = line.replace(/\r/g, '').trim();
    if (cleaned && !cleaned.startsWith('#') && cleaned.includes('=')) {
      const [key, ...rest] = cleaned.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
}

/**
 * Create a transporter using either App Password or OAuth2
 */
async function createTransporter() {
  const user = process.env.GMAIL_USER || process.env.GMAIL_EMAIL || 'hello@naisora.com';
  
  // Method 1: App Password
  if (process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }
  
  // Method 2: OAuth2
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: user,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN
      }
    });
  }

  throw new Error('No Gmail credentials found (GMAIL_APP_PASSWORD or OAuth tokens).');
}

/**
 * Sends an email using Gmail SMTP
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML or plain text)
 */
async function sendEmail(to, subject, html) {
  try {
    const transporter = await createTransporter();
    const fromUser = process.env.GMAIL_USER || 'hello@naisora.com';
    
    const info = await transporter.sendMail({
      from: `"Nahid from Naisora" <${fromUser}>`,
      to,
      subject,
      text: html.replace(/<[^>]*>?/gm, ''), // Simple text fallback
      html: html
    });
    
    return info;
  } catch (error) {
    console.error('❌ Gmail SMTP Error:', error.message);
    throw error;
  }
}

/**
 * Tests the Gmail connection
 */
async function testConnection() {
  try {
    const transporter = await createTransporter();
    await transporter.verify();
    console.log('✅ Email connected via Gmail SMTP');
    return true;
  } catch (error) {
    console.error('❌ Gmail Connection Failed:', error.message);
    return false;
  }
}

module.exports = { 
  sendEmail,
  testConnection
};
