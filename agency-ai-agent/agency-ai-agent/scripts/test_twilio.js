// scripts/test_twilio.js
// Naisora AI — Twilio WhatsApp Debugger
// Run this to find out EXACTLY why your messages aren't sending.

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

const twilio = require('twilio');

async function debugTwilio() {
  console.log('🧪 Starting Twilio Debugger...\n');

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  const testNumber = '+91XXXXXXXXXX'; // <-- CHANGE THIS to your own phone number

  if (!sid || !token) {
    console.error('❌ ERROR: TWILIO_ACCOUNT_SID or AUTH_TOKEN missing in .env');
    return;
  }

  const client = twilio(sid, token);

  console.log(`📡 Attempting to send from: ${from}`);
  console.log(`📲 Attempting to send to: whatsapp:${testNumber}`);

  try {
    const message = await client.messages.create({
      from: from,
      to: `whatsapp:${testNumber}`,
      body: "Hello from Naisora AI! If you see this, your Twilio is working. 🚀"
    });

    console.log('\n✅ SUCCESS!');
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
  } catch (err) {
    console.log('\n❌ FAILED TO SEND.');
    console.log(`   Error Code: ${err.code}`);
    console.log(`   Error Message: ${err.message}`);
    
    if (err.code === 21608) {
      console.log('\n💡 DIAGNOSIS: This is a Sandbox restriction.');
      console.log('   You must send "join [your-sandbox-keyword]" from your phone to your Twilio number first.');
    } else if (err.code === 20003) {
      console.log('\n💡 DIAGNOSIS: Invalid Credentials. Check your SID and Auth Token.');
    }
  }
}

debugTwilio();
