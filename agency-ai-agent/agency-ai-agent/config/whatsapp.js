const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const P = require('pino');
const logger = P({ level: 'silent' });

let sock = null;
let connectionState = 'NOT_CONNECTED'; // NOT_CONNECTED, CONNECTING, CONNECTED

async function connectWhatsApp() {
  const authPath = path.join(__dirname, '../auth_info_baileys');
  const credsPath = path.join(authPath, 'creds.json');

  if (!fs.existsSync(credsPath)) {
    connectionState = 'NOT_CONNECTED';
    console.log('⚠️ WhatsApp not connected — run connect-whatsapp.mjs locally first');
    return null;
  }

  connectionState = 'CONNECTING';

  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = await import('@whiskeysockets/baileys');
  
  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger,
    browser: ['Naisora Agent', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
    retryRequestDelayMs: 2000
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('📱 SCAN THIS QR CODE WITH YOUR WHATSAPP:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      connectionState = 'CONNECTING';
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log(`🔄 Connection closed (Status ${statusCode}). Reconnecting in 5s...`);
        setTimeout(() => connectWhatsApp(), 5000);
      } else {
        connectionState = 'NOT_CONNECTED';
        console.log('❌ WhatsApp logged out — run connect-whatsapp.mjs locally again');
      }
    }
    if (connection === 'open') {
      connectionState = 'CONNECTED';
      console.log('✅ WhatsApp: Connected');
    }
  });

  sock.ev.on('creds.update', saveCreds);
  return sock;
}

function getWhatsAppStatus() {
  const authPath = path.join(__dirname, '../auth_info_baileys');
  const credsPath = path.join(authPath, 'creds.json');
  
  if (!fs.existsSync(credsPath)) return '❌ Not connected';
  if (connectionState === 'CONNECTED') return '✅ Connected';
  if (connectionState === 'CONNECTING') return '⚠️ Session found — connecting...';
  return '❌ Not connected';
}

async function sendWhatsAppMessage(phone, message) {
  try {
    if (!sock || connectionState !== 'CONNECTED') {
      console.log('⏭️ Skipping WhatsApp (Not Connected)');
      return false;
    }
    
    const cleanPhone = phone.toString().replace(/\D/g, '');
    const jid = cleanPhone.startsWith('91') ? `${cleanPhone}@s.whatsapp.net` : `91${cleanPhone}@s.whatsapp.net`;
    
    const delay = Math.floor(Math.random() * (90000 - 30000 + 1)) + 30000;
    console.log(`⏳ Waiting ${Math.round(delay/1000)}s before sending to ${cleanPhone}...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    await sock.sendMessage(jid, { text: message });
    console.log(`✅ WhatsApp message sent to ${phone}`);
    return true;
  } catch (err) {
    console.log(`❌ Failed to send to ${phone}: ${err.message}`);
    return false;
  }
}

module.exports = { connectWhatsApp, getWhatsAppStatus, sendWhatsAppMessage };
