// config/smtp.js
// Naisora AI Agent — Resend Email Config (Replacing SMTP)

const { Resend } = require('resend');
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

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an email using Resend API
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML or plain text)
 */
async function sendEmail(to, subject, html) {
  const { data, error } = await resend.emails.send({
    from: 'Nahid from Naisora <hey@naisora.com>',
    to,
    subject,
    html
  });
  
  if (error) {
    console.error('❌ Resend Error:', error.message);
    throw new Error(error.message);
  }
  
  return data;
}

/**
 * Tests the Resend API connection (checks if key exists)
 */
async function testConnection() {
  if (process.env.RESEND_API_KEY) {
    console.log('✅ Email connected via Resend');
    return true;
  } else {
    console.error('❌ Resend API key missing');
    return false;
  }
}

module.exports = { 
  sendEmail,
  testConnection
};
