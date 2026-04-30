const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs');

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
  
  const user = process.env.GMAIL_USER || 'hello@naisora.com';
  const imapOptions = {
    user: user,
    password: process.env.GMAIL_APP_PASSWORD,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    connTimeout: 10000,
    authTimeout: 10000,
    socketTimeout: 10000
  };

  if (!imapOptions.password) {
    console.error('❌ GMAIL_APP_PASSWORD missing in .env. Skipping IMAP.');
    return;
  }

  const imap = new Imap(imapOptions);

  return new Promise((resolve, reject) => {
    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

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
            try {
              await processMessage(imap, uid);
            } catch (processErr) {
              console.error(`   ❌ Error processing message UID ${uid}:`, processErr.message);
            }
          }

          imap.end();
          resolve();
        });
      });
    });

    imap.once('error', (err) => {
      console.error('❌ IMAP Connection Error:', err.message);
      imapFailureCount++;
      lastImapFailureTime = Date.now();
      
      if (imapFailureCount === 3) {
        sendMessage(`⚠️ *IMAP CRITICAL FAILURE* — Gmail connection failed 3 times in a row. Paused for 30 minutes.\nError: ${err.message}`);
      }
      
      resolve(); // Don't crash the scheduler
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
            imap.addFlags(uid, ['\\Seen'], (err) => resolve());
            return;
          }

          console.log(`   🎯 Match found! Lead: ${lead.business_name}`);

          // 2. Generate Claude Haiku response
          const systemPrompt = `You are Nahid from Naisora, a web design agency in Bangalore that builds websites and does SEO for restaurants and cafes.
You are replying to a restaurant owner on EMAIL who responded to your cold outreach.

Rules:
- Be friendly, warm, confident — like a real person
- Natural Indian English tone
- Max 4-5 lines per reply
- Always end with one question to keep conversation going
- Goal: book a free 10 minute call or send them the audit report
- Never use corporate language or sound like a bot
- If they ask price: website from ₹8,000, SEO from ₹3,000/month
- If not interested: be polite, wish them well, stop messaging
- If interested: offer to send audit or book a call

Their business: ${lead.business_name} in ${lead.area}`;

          const aiReply = await askClaudeWithSystem(systemPrompt, body);

          // 3. Send reply via SMTP (Resend)
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
            `💬 *Their message:* ${body.substring(0, 500)}${body.length > 500 ? '...' : ''}\n\n` +
            `🤖 *Our auto reply:* ${aiReply}`
          );

          // 7. Mark as seen in IMAP
          imap.addFlags(uid, ['\\Seen'], (err) => resolve());

        } catch (parseErr) {
          console.error('Error parsing email:', parseErr);
          resolve();
        }
      });
    });
  });
}

module.exports = { handleEmailReplies };
