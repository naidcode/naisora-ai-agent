const { loadEnv } = require('../config/envLoader');
loadEnv();

const Imap = require('imap');

const imap = new Imap({
  user: process.env.EMAIL_USER,
  password: process.env.IMAP_PASS,
  host: process.env.IMAP_HOST || 'imap.hostinger.com',
  port: parseInt(process.env.IMAP_PORT) || 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('ready', () => {
  console.log('✅ IMAP connected successfully');
  console.log('User:', process.env.EMAIL_USER);
  console.log('Host:', process.env.IMAP_HOST);
  imap.end();
});

imap.once('error', (err) => {
  console.log('❌ IMAP FAILED:', err.message);
  console.log('User:', process.env.EMAIL_USER);
  console.log('Host:', process.env.IMAP_HOST);
  console.log('Pass length:', process.env.IMAP_PASS?.length);
  console.log('Has \\r:', process.env.IMAP_PASS?.includes('\r'));
});

imap.connect();
