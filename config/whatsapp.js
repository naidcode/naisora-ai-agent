const qrcode = require('qrcode-terminal');
const path = require('path');

let sock = null;

async function connectWhatsApp() {
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = await import('@whiskeysockets/baileys');
  
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, '../auth_info_baileys')
  );

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('📱 SCAN THIS QR CODE WITH YOUR WHATSAPP:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('🔄 Reconnecting WhatsApp...');
        connectWhatsApp();
      } else {
        console.log('❌ WhatsApp logged out — rescan QR');
      }
    }
    if (connection === 'open') {
      console.log('✅ WhatsApp connected successfully via Baileys');
    }
  });

  sock.ev.on('creds.update', saveCreds);
  return sock;
}

async function sendWhatsAppMessage(phone, message) {
  try {
    if (!sock) throw new Error('WhatsApp not connected');
    const jid = `91${phone}@s.whatsapp.net`;
    const delay = Math.floor(Math.random() * (90000 - 30000 + 1)) + 30000;
    await new Promise(resolve => setTimeout(resolve, delay));
    await sock.sendMessage(jid, { text: message });
    console.log(`✅ WhatsApp message sent to ${phone}`);
    return true;
  } catch (err) {
    console.log(`❌ Failed to send to ${phone}: ${err.message}`);
    return false;
  }
}

module.exports = { connectWhatsApp, sendWhatsAppMessage };
