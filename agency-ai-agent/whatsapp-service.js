/**
 * whatsapp-service.js
 * RUN THIS ON YOUR LOCAL LAPTOP 24/7
 * 
 * This script:
 * 1. Connects to WhatsApp via Baileys (local IP)
 * 2. Polls Supabase 'whatsapp_queue' every 60 seconds
 * 3. Sends pending messages and updates their status
 */

import pkg from '@whiskeysockets/baileys';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

let sock = null;

async function connectWhatsApp() {
  const authPath = path.join(__dirname, 'auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();
  console.log('Using WA version:', version);

  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    browser: ['Ubuntu', 'Chrome', '20.0.0']
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        console.log('🔄 Connection closed. Reconnecting...');
        connectWhatsApp();
      } else {
        console.log('❌ Logged out. Delete auth_info_baileys and restart.');
      }
    }
    if (connection === 'open') {
      console.log('✅ WhatsApp connected and ready to process queue!');
      startQueueProcessor();
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

async function startQueueProcessor() {
  console.log('🚀 Queue processor started (Polling every 60s)');
  
  setInterval(async () => {
    try {
      // Get pending messages
      const { data: queue, error } = await supabase
        .from('whatsapp_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (queue && queue.length > 0) {
        console.log(`📦 Found ${queue.length} messages in queue`);

        for (const item of queue) {
          try {
            console.log(`📤 Sending to ${item.phone}...`);
            
            // Clean phone number
            const cleanPhone = item.phone.toString().replace(/\D/g, '');
            const jid = cleanPhone.startsWith('91') ? `${cleanPhone}@s.whatsapp.net` : `91${cleanPhone}@s.whatsapp.net`;

            await sock.sendMessage(jid, { text: item.message });

            // Mark as sent in queue
            await supabase
              .from('whatsapp_queue')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', item.id);

            // Log in outreach_log for tracking
            await supabase.from('outreach_log').insert({
              channel: 'whatsapp',
              message_type: 'cold',
              message_text: item.message,
              sent_at: new Date().toISOString(),
              delivered: true
            });

            console.log(`✅ Sent to ${item.phone}`);
            
            // Random delay between messages (30-60s) to avoid spam detection
            const delay = Math.floor(Math.random() * (60000 - 30000 + 1)) + 30000;
            await new Promise(r => setTimeout(r, delay));

          } catch (sendErr) {
            console.error(`❌ Failed to send to ${item.phone}:`, sendErr.message);
            await supabase
              .from('whatsapp_queue')
              .update({ status: 'failed', error: sendErr.message })
              .eq('id', item.id);
          }
        }
      }
    } catch (err) {
      console.error('💥 Queue error:', err.message);
    }
  }, 60000);
}

connectWhatsApp().catch(err => console.error('Fatal:', err));
