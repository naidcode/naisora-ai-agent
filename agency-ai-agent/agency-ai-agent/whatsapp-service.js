/**
 * whatsapp-service.js
 * RUN THIS ON YOUR LOCAL LAPTOP 24/7
 * 
 * FINAL FIX: Atomic locking to prevent race conditions and duplicate messages.
 * "One database row -> one processing execution -> one message send"
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

// --- System State ---
let sock = null;
const processingUsers = new Set(); 
const lastMessageTime = new Map(); 
const COOLDOWN_MS = 60000;         // 60 second cooldown per user

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

  // Ensure event listeners are registered only once
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

// Global flag to prevent multiple processor instances
let isProcessorRunning = false;

async function startQueueProcessor() {
  if (isProcessorRunning) return;
  isProcessorRunning = true;

  console.log('🚀 Queue processor active (Polling every 60s)');
  
  setInterval(async () => {
    try {
      // Step 1: Fetch pending messages with a small batch limit
      const { data: queue, error } = await supabase
        .from('whatsapp_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10); // Safeguard 2: Batch size limit

      if (error) throw error;
      if (!queue || queue.length === 0) return;

      for (const item of queue) {
        const phone = item.phone.toString().replace(/\D/g, '');

        // Pre-check In-memory lock to skip noise
        if (processingUsers.has(phone)) continue;

        // Pre-check Cooldown
        const now = Date.now();
        const lastSent = lastMessageTime.get(phone) || 0;
        if (now - lastSent < COOLDOWN_MS) {
          console.log(`⏭️  SKIP: Cooldown for ${phone}`);
          continue;
        }

        // MANDATORY STEP 1: Atomic Lock
        // Try to update status from 'pending' -> 'processing'
        const { data: lockedItem, error: lockError } = await supabase
          .from('whatsapp_queue')
          .update({ status: 'processing' })
          .eq('id', item.id)
          .eq('status', 'pending') // Critical: Ensure it's still pending
          .select();

        if (lockError || !lockedItem || lockedItem.length === 0) {
          console.log(`⏭️  LOCK FAILED: Skipping item ${item.id} (already handled)`);
          continue;
        }

        // Acquire in-memory lock for parallel safety within this instance
        processingUsers.add(phone);

        try {
          // MANDATORY STEP 2: Send Message
          console.log(`📤 SENDING: ${phone}`);
          const jid = phone.startsWith('91') ? `${phone}@s.whatsapp.net` : `91${phone}@s.whatsapp.net`;
          
          await sock.sendMessage(jid, { text: item.message });

          // MANDATORY STEP 3: Finalize Status (Success)
          await supabase
            .from('whatsapp_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', item.id);

          // Log success
          console.log(`✅ SUCCESS: Sent to ${phone}`);
          
          // Log in outreach_log
          await supabase.from('outreach_log').insert({
            lead_id: item.lead_id || null,
            channel: 'whatsapp',
            message_text: item.message,
            sent_at: new Date().toISOString(),
            delivered: true
          });

          // Update cooldown tracker
          lastMessageTime.set(phone, Date.now());

        } catch (sendErr) {
          // MANDATORY STEP 3: Finalize Status (Failure)
          console.error(`❌ SEND FAILED: ${phone} - ${sendErr.message}`);
          
          const retryCount = (item.retries || 0) + 1;
          const status = retryCount >= 3 ? 'failed' : 'pending'; // Retry Safety

          await supabase
            .from('whatsapp_queue')
            .update({ 
              status: status, 
              retries: retryCount,
              error: sendErr.message 
            })
            .eq('id', item.id);
        } finally {
          // Release in-memory lock
          processingUsers.delete(phone);
        }

        // Throttling: 10-20s delay between sends to protect number
        await new Promise(r => setTimeout(r, 15000));
      }
    } catch (err) {
      console.error('💥 Processor Error:', err.message);
    }
  }, 60000);
}

connectWhatsApp().catch(err => console.error('Fatal:', err));
