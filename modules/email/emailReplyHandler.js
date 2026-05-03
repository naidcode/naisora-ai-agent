const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs');

// Load .env directly
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

const { supabase } = require('../../config/database');
const { askClaudeWithSystem } = require('../../config/claude');
const { sendMessage } = require('../../config/telegram');

// Failure tracking
let imapFailureCount = 0;
let lastImapFailureTime = 0;

/**
 * Check Gmail IMAP for unread replies from leads and auto-reply using Claude
 */
async function handleEmailReplies() {
  const now = Date.now();
  if (imapFailureCount >= 3) {
    const minutesSinceFailure = (now - lastImapFailureTime) / (1000 * 60);
    if (minutesSinceFailure < 30) {
      console.log(`⏭️  Skipping Email Reply Handler (Paused for ${Math.round(30 - minutesSinceFailure)} more mins due to 3 consecutive failures)`);
      return;
    } else {
      console.log('🔄 30 minutes passed. Resetting IMAP failure count.');
      imapFailureCount = 0;
    }
  }

  console.log('\n📧 --- Email Reply Handler (IMAP) Starting ---');
  
  const user = process.env.IMAP_USER || 'hey@naisora.com';
  const imapOptions = {
    user: user,
    password: process.env.IMAP_PASS,
    host: process.env.IMAP_HOST || 'imap.hostinger.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    connTimeout: 10000,
    authTimeout: 10000,
    socketTimeout: 10000
  };

  if (!imapOptions.password) {
    console.error('❌ IMAP_PASS missing in .env. Skipping IMAP.');
    return;
  }

  const imap = new Imap(imapOptions);

  return new Promise((resolve, reject) => {
    imap.once('ready', () => {
      imapFailureCount = 0; // Reset on success
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        // Search for unread messages
        imap.search(['UNSEEN'], async (err, results) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (!results || results.length === 0) {
            console.log('   No new unread emails.');
            imap.end();
            return resolve();
          }

          console.log(`   Found ${results.length} unread emails. Processing...`);

          for (const uid of results) {
            await processMessage(imap, uid);
          }

          imap.end();
          resolve();
        });
      });
    });

    imap.once('error', async (err) => {
      console.error('IMAP Error:', err.message);
      imapFailureCount++;
      lastImapFailureTime = Date.now();

      if (imapFailureCount === 3) {
        await sendMessage(
          `🚨 *IMAP CRITICAL ERROR*\n\n` +
          `Failed 3 times in a row. Pausing for 30 mins.\n` +
          `Error: ${err.message}\n` +
          `Time: ${new Date().toLocaleString()}`
        );
      }
      reject(err);
    });

    imap.once('end', () => {
      console.log('📧 --- IMAP Connection Closed ---');
    });

    imap.connect();
  });
}

async function processMessage(imap, uid) {
  return new Promise((resolve, reject) => {
    const f = imap.fetch(uid, { bodies: '' });
    f.on('message', (msg, seqno) => {
      msg.on('body', async (stream, info) => {
        try {
          const parsed = await simpleParser(stream);
          const fromEmail = parsed.from.value[0].address;
          const subject = parsed.subject;
          const body = parsed.text;

          console.log(`   📩 Processing email from: ${fromEmail}`);

          // 1. Match with lead in Supabase
          const { data: lead } = await supabase
            .from('leads')
            .select('*')
            .eq('email', fromEmail.toLowerCase())
            .maybeSingle();

          if (!lead) {
            console.log(`   ⏩ Skipping email from unknown sender: ${fromEmail}`);
            // Mark as seen anyway? Or leave it? Usually better to mark as seen if it's not a lead to avoid reprocessing.
            imap.addFlags(uid, ['\\Seen'], (err) => {
              if (err) console.error('Error marking as seen:', err);
            });
            return resolve();
          }

          console.log(`   🎯 Match found! Lead: ${lead.business_name}`);

          // 2. Generate Claude Sonnet response
          const systemPrompt = `You are Nahid from Naisora, a web design agency in Bangalore that builds websites and does SEO for restaurants and cafes.

You are replying to a restaurant owner on EMAIL who responded to your cold outreach.

Rules:
- Be friendly, warm, confident — like a real person
- Natural Indian English tone
- Max 4-5 lines per reply
- Always end with one question to keep conversation going
- Goal: move them toward booking a call or sending an audit
- If they mention "price", "cost", "how much" → website from ₹8,000, SEO from ₹3,000/month
- If they mention "call", "meet", "talk", "interested" → send Calendly link: https://calendly.com/naisora/15min or ask for availability
- If they say "not interested", "no thanks", "remove" → be polite, wish them well, and I will mark them as opted out.
- Never use corporate language or sound like a bot

Their lead type: ${lead.lead_type || 'unknown'}
Their business: ${lead.business_name} in ${lead.area}
${lead.website_audit ? `Their website audit: ${JSON.stringify(lead.website_audit)}` : ''}`;

          const aiReply = await askClaudeWithSystem(systemPrompt, body);
          
          // 2.1 Handle Opt-out
          if (body.toLowerCase().includes('not interested') || body.toLowerCase().includes('no thanks') || body.toLowerCase().includes('remove')) {
            await supabase.from('leads').update({ opted_out: true }).eq('id', lead.id);
            console.log(`   ⛔ Lead opted out: ${lead.business_name}`);
          }
          
          // 2.2 Handle Hot Lead (Interest shown)
          if (body.toLowerCase().match(/call|meet|talk|interested|yes|price|cost|how much/)) {
            await supabase.from('leads').update({ lead_category: 'hot' }).eq('id', lead.id);
            await sendMessage(`🔥 *HOT LEAD — ${lead.business_name}* wants to meet or asked for pricing!\nReply: ${body}`);
          }

          // 3. Send reply via SMTP (Gmail)
          try {
            const { sendEmail } = require('../../config/smtp');
            await sendEmail(fromEmail, `Re: ${subject}`, aiReply);
            console.log(`   ✅ Sent auto-reply to ${lead.business_name}`);
          } catch (sendError) {
            console.error(`   ❌ Failed to send email reply to ${fromEmail}:`, sendError.message);
            return resolve();
          }

          // 4. Log to outreach_log
          await supabase.from('outreach_log').insert([
            {
              lead_id: lead.id,
              channel: 'email',
              message_type: 'reply_received',
              message_text: body,
              sent_at: new Date().toISOString()
            },
            {
              lead_id: lead.id,
              channel: 'email',
              message_type: 'auto_reply',
              message_text: aiReply,
              sent_at: new Date().toISOString()
            }
          ]);

          // 5. Update lead status
          await supabase
            .from('leads')
            .update({ 
              outreach_status: 'replied',
              reply_received_at: new Date().toISOString()
            })
            .eq('id', lead.id);

          // 6. Notify Telegram
          await sendMessage(
            `🔔 *NEW REPLY — Email*\n\n` +
            `👤 *Business:* ${lead.business_name}\n` +
            `📍 *Area:* ${lead.area}\n` +
            `💬 *Their message:* ${body.substring(0, 500)}${body.length > 500 ? '...' : ''}\n` +
            `🤖 *Our auto reply:* ${aiReply}\n` +
            `📊 *Lead type:* ${lead.lead_type}\n` +
            `🌡️ *Status:* ${lead.lead_category || 'hot'}`
          );

          // 7. Mark as seen in IMAP
          imap.addFlags(uid, ['\\Seen'], (err) => {
            if (err) console.error('Error marking as seen:', err);
            resolve();
          });

        } catch (parseErr) {
          console.error('Error parsing email:', parseErr);
          resolve();
        }
      });
    });
    f.once('error', (err) => {
      console.error('Fetch error:', err);
      resolve();
    });
  });
}

module.exports = { handleEmailReplies };
