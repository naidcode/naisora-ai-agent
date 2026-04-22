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

// 1. Initial Transporter Config (Port 465)
let transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || process.env.YOUR_EMAIL,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// 2. Fallback logic and Detailed Logging
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP failed:', error.message);
    console.error('Host:', process.env.SMTP_HOST);
    console.error('Port:', process.env.SMTP_PORT);
    console.error('User:', process.env.SMTP_USER || process.env.YOUR_EMAIL);

    console.log('🔄 Attempting fallback to port 587...');
    
    // Fallback — try port 587 if 465 fails
    transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || process.env.YOUR_EMAIL,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    transporter.verify((fallbackError, fallbackSuccess) => {
      if (fallbackError) {
        console.error('❌ Fallback SMTP failed:', fallbackError.message);
      } else {
        console.log('✅ Fallback SMTP connected successfully (Port 587)');
      }
    });
  } else {
    console.log('✅ SMTP connected successfully');
  }
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
