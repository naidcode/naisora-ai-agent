/**
 * whatsapp-service.js
 * UltraMsg API Queue Processor
 * Processes the whatsapp_queue table and sends via UltraMsg
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env manually to be safe
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

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const processingUsers = new Set();
const lastMessageTime = new Map();
const COOLDOWN_MS = 60000;

async function startQueueProcessor() {
  console.log('🚀 UltraMsg Queue processor active (Polling every 30s)');
  
  setInterval(async () => {
    try {
      const { data: queue, error } = await supabase
        .from('whatsapp_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) throw error;
      if (!queue || queue.length === 0) return;

      for (const item of queue) {
        const phone = item.phone.toString().replace(/\D/g, '');

        if (processingUsers.has(phone)) continue;

        const now = Date.now();
        const lastSent = lastMessageTime.get(phone) || 0;
        if (now - lastSent < COOLDOWN_MS) {
          console.log(`⏭️  SKIP: Cooldown for ${phone}`);
          continue;
        }

        const { data: lockedItem, error: lockError } = await supabase
          .from('whatsapp_queue')
          .update({ status: 'processing' })
          .eq('id', item.id)
          .eq('status', 'pending')
          .select();

        if (lockError || !lockedItem || lockedItem.length === 0) continue;

        processingUsers.add(phone);

        try {
          console.log(`📤 SENDING via UltraMsg: ${phone}`);
          
          const url = `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE}/messages/chat`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              token: process.env.ULTRAMSG_TOKEN,
              to: `+${phone}`,
              body: item.message
            })
          });

          const resData = await response.json();

          if (resData.sent === 'true' || resData.id) {
            await supabase
              .from('whatsapp_queue')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', item.id);

            console.log(`✅ SUCCESS: Sent to ${phone}`);
            
            await supabase.from('outreach_log').insert({
              lead_id: item.lead_id || null,
              channel: 'whatsapp',
              message_text: item.message,
              sent_at: new Date().toISOString(),
              delivered: true
            });

            lastMessageTime.set(phone, Date.now());
          } else {
            throw new Error(resData.error || 'UltraMsg failed');
          }

        } catch (sendErr) {
          console.error(`❌ SEND FAILED: ${phone} - ${sendErr.message}`);
          const retryCount = (item.retries || 0) + 1;
          const status = retryCount >= 3 ? 'failed' : 'pending';

          await supabase
            .from('whatsapp_queue')
            .update({ 
              status: status, 
              retries: retryCount,
              error: sendErr.message 
            })
            .eq('id', item.id);
        } finally {
          processingUsers.delete(phone);
        }

        await new Promise(r => setTimeout(r, 10000));
      }
    } catch (err) {
      console.error('💥 Processor Error:', err.message);
    }
  }, 30000);
}

startQueueProcessor();
