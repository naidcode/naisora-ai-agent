// scripts/test_whatsapp_ultramsg.js
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

const { sendMessage } = require('../config/telegram');

async function testWhatsApp() {
  const phone = '919886713828';
  const currentTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const message = `✅ WhatsApp test — agent working at ${currentTime}`;

  console.log(`\n🚀 Sending test WhatsApp to ${phone}...`);
  console.log(`💬 Message: ${message}`);

  try {
    const url = `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE}/messages/chat`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token: process.env.ULTRAMSG_TOKEN,
        to: `+${phone}`,
        body: message
      })
    });

    const resData = await response.json();
    console.log('📦 Response from UltraMsg:', resData);

    if (resData.sent === 'true' || resData.id) {
      console.log('✅ Success! Message sent.');
      await sendMessage(`✅ *WhatsApp Test Success*\nTo: ${phone}\nMessage: ${message}`);
    } else {
      console.error('❌ Failed:', resData.error || 'Unknown error');
      await sendMessage(`❌ *WhatsApp Test Failed*\nError: ${resData.error || 'Unknown error'}`);
    }
  } catch (err) {
    console.error('❌ Fatal Error:', err.message);
    await sendMessage(`❌ *WhatsApp Test Fatal Error*\nError: ${err.message}`);
  }
}

testWhatsApp();
