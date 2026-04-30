// scripts/test_hostinger_email.js
require('dotenv').config();
const { sendEmail, testConnection } = require('../config/smtp');
const { sendMessage } = require('../config/telegram');

async function runTest() {
  console.log('🧪 Starting Hostinger Email Test...');
  
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ SMTP Connection failed. Check .env settings.');
    await sendMessage('❌ *Hostinger Email Test Failed*\nConnection to SMTP server failed.');
    return;
  }

  const testEmail = process.env.EMAIL_USER || 'hey@naisora.com';
  const subject = '✅ Hostinger Email Test';
  const body = `
    <h1>Hostinger SMTP Test</h1>
    <p>This is a self-test email to confirm the switch to Hostinger is working.</p>
    <p>Sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
  `;

  try {
    await sendEmail(testEmail, subject, body);
    console.log(`✅ Test email sent to ${testEmail}`);
    await sendMessage(`✅ *Hostinger Email Test Success*\nSent test email from ${testEmail} to ${testEmail}.\nSMTP server verified.`);
  } catch (err) {
    console.error('❌ Failed to send test email:', err.message);
    await sendMessage(`❌ *Hostinger Email Test Failed*\nError: ${err.message}`);
  }
}

runTest();
