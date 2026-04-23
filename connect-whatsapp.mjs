// connect-whatsapp.mjs — RUN THIS LOCALLY ONLY
// This script will generate a QR code in your terminal.
// Once scanned, it saves the session to /auth_info_baileys/
// Then you can push these files to Railway to skip QR scanning there.

import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { fileURLToPath } from 'url';
import P from 'pino';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = P({ level: 'silent' });

async function connectWhatsApp() {
  console.log('🚀 Starting WhatsApp connection (Local Mode)...');
  
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, 'auth_info_baileys')
  );

  const sock = makeWASocket({
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
      console.log('\n📱 SCAN THIS QR CODE WITH YOUR WHATSAPP:');
      qrcode.generate(qr, { small: true });
      console.log('Note: Keep this terminal open until connection is successful.\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`🔄 Connection closed. Status: ${statusCode}. Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        connectWhatsApp();
      } else {
        console.log('❌ WhatsApp logged out — please delete /auth_info_baileys/ and run again.');
        process.exit(1);
      }
    }

    if (connection === 'open') {
      console.log('\n✅ SUCCESS: WhatsApp connected successfully!');
      console.log('📂 Session saved to /auth_info_baileys/');
      console.log('🚀 Now push these changes to GitHub/Railway.\n');
      process.exit(0);
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

connectWhatsApp().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
