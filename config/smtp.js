// config/smtp.js
// Naisora AI Agent — SMTP Email Config
// For non-Gmail accounts (Hostinger, Zoho, etc.)

const nodemailer = require('nodemailer');
const fs = require('fs');

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

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.YOUR_EMAIL,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail(to, subject, body) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.YOUR_NAME}" <${process.env.YOUR_EMAIL}>`,
      to: to,
      subject: subject,
      text: body,
    });

    console.log(`📧 Email sent via SMTP to ${to} | Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ SMTP Failed to send to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testConnection() {
  console.log('📧 Testing SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connected!');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    return false;
  }
}

module.exports = {
  sendEmail,
  testConnection,
};
