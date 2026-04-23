import pkg from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { fileURLToPath } from 'url';

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function connectWhatsApp() {
  try {
    const { version } = await fetchLatestBaileysVersion();
    console.log('Using WA version:', version);
    
    const { state, saveCreds } = await useMultiFileAuthState(
      path.join(__dirname, 'auth_info_baileys')
    );

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['Ubuntu', 'Chrome', '20.0.0']
    });

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        console.log('📱 SCAN THIS QR CODE:');
        qrcode.generate(qr, { small: true });
      }
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log('Connection closed. Status:', statusCode);
        if (statusCode !== DisconnectReason.loggedOut) {
          console.log('🔄 Reconnecting in 3s...');
          setTimeout(() => connectWhatsApp(), 3000);
        } else {
          console.log('❌ Logged out — rescan QR');
        }
      }
      if (connection === 'open') {
        console.log('✅ WhatsApp connected successfully!');
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch(err) {
    console.error('❌ Error:', err.message);
  }
}

connectWhatsApp();
