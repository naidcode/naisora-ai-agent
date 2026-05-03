/**
 * config/ultramsg.js
 * UltraMsg API helper for WhatsApp sending
 */

async function sendUltraMsg(phone, message) {
  const instance = process.env.ULTRAMSG_INSTANCE;
  const token = process.env.ULTRAMSG_TOKEN;

  if (!instance || !token) {
    throw new Error('ULTRAMSG_INSTANCE or ULTRAMSG_TOKEN missing in .env');
  }

  // Normalise phone: remove non-digits, ensure it starts with country code if needed.
  // UltraMsg expects it with or without +, but usually starts with country code.
  const cleanPhone = phone.replace(/\D/g, '');

  const url = `https://api.ultramsg.com/${instance}/messages/chat`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      token: token,
      to: `+${cleanPhone}`,
      body: message
    })
  });

  if (!response.ok) {
    console.error(`❌ UltraMsg Send Failed — Status: ${response.status} (${response.statusText})`);
    const errorText = await response.text();
    console.error(`   Details: ${errorText}`);
    throw new Error(`UltraMsg HTTP Error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.sent !== 'true' && !data.id) {
    throw new Error(data.error || 'UltraMsg failed to send');
  }

  return data;
}

module.exports = { sendUltraMsg };
