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
const { askClaudeWithSystem, callHaiku } = require('../../config/claude');
const { sendMessage, sendTelegramOnce } = require('../../config/telegram');

// Failure tracking
let imapFailureCount = 0;
let lastImapFailureTime = 0;

function isAutoReply(email) {
  const subject = (email.subject || '').toLowerCase();
  const body = (email.body || '').toLowerCase();
  const from = (email.from || '').toLowerCase();

  // Sender patterns
  const autoSenders = [
    'mailer-daemon', 'noreply', 'no-reply',
    'donotreply', 'postmaster', 'autoresponder',
    'auto-reply', 'notifications', 'mailchannels'
  ];
  if (autoSenders.some(s => from.includes(s))) return true;

  // Subject patterns
  const autoSubjects = [
    'auto reply', 'automatic reply', 'out of office',
    'automated response', 'thank you for contacting',
    'we have received your', 'do not reply',
    'auto-response', 'away from office'
  ];
  if (autoSubjects.some(s => subject.includes(s))) return true;

  // Body patterns
  const autoPhrases = [
    'thank you for writing in',
    'thank you for contacting',
    'this is an automated',
    'this is an automatic',
    'we will respond as soon as possible',
    'we will get back to you',
    'we have received your email',
    'do not reply to this email',
    'please do not reply',
    'this email was sent automatically',
    'auto-generated'
  ];
  if (autoPhrases.some(p => body.includes(p))) return true;

  return false;
}

async function isSameMessageReceived(leadEmail, messageBody) {
  const { data } = await supabase
    .from('conversations')
    .select('last_message_body, reply_count, is_closed')
    .eq('lead_email', leadEmail)
    .maybeSingle();

  if (!data) return false;
  if (data.is_closed) return true;

  // Same message received again = auto-reply loop
  const similarity = data.last_message_body?.trim() === messageBody?.trim();
  if (similarity) return true;

  return false;
}

async function extractDecisionMaker(email) {
  const body = email.body || '';

  // Extract emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const foundEmails = body.match(emailRegex) || [];
  
  // Filter out the sender's own email and common noise
  const decisionEmails = foundEmails.filter(e => 
    !e.includes(email.from.split('@')[1]) === false &&
    !e.toLowerCase().includes('noreply') &&
    !e.toLowerCase().includes('naisora')
  );

  // Extract phone numbers (Indian format)
  const phoneRegex = /(\+91|91|0)?[\s-]?[6-9]\d{9}/g;
  const phones = body.match(phoneRegex) || [];

  // Extract names near designations using Claude Haiku
  let decisionMaker = null;
  if (decisionEmails.length > 0 || phones.length > 0) {
    const prompt = `
Extract the most senior decision maker from this email text.
Look for: General Manager, Owner, Director, Manager, Head.
Return JSON only:
{
  "name": "...",
  "designation": "...",
  "email": "...",
  "phone": "..."
}
If not found return: {}

Email text:
${body.substring(0, 1000)}
`;
    try {
      const raw = await callHaiku(prompt);
      decisionMaker = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch(e) {
      decisionMaker = { 
        email: decisionEmails[0] || null,
        phone: phones[0] || null 
      };
    }
  }

  if (decisionMaker && (decisionMaker.email || decisionMaker.phone)) {
    // Save to leads table
    await supabase.from('leads')
      .update({
        decision_maker_name: decisionMaker.name,
        decision_maker_email: decisionMaker.email,
        decision_maker_phone: decisionMaker.phone,
        decision_maker_designation: decisionMaker.designation,
        outreach_status: 'decision_maker_found'
      })
      .eq('email', email.from);

    // Schedule direct outreach in 24 hours
    await supabase.from('outreach_queue').insert({
      to_email: decisionMaker.email,
      to_phone: decisionMaker.phone,
      contact_name: decisionMaker.name,
      type: 'decision_maker_outreach',
      scheduled_for: new Date(Date.now() + 24*60*60*1000).toISOString(),
      status: 'pending'
    });

    // Telegram alert — professional format
    await sendMessage(`
🎯 <b>Decision Maker Found in Auto-Reply</b>

🏪 <b>Restaurant:</b> ${email.from}
👤 <b>Name:</b> ${decisionMaker.name || 'Unknown'}
💼 <b>Role:</b> ${decisionMaker.designation || 'Unknown'}
📧 <b>Email:</b> ${decisionMaker.email || 'N/A'}
📱 <b>Phone:</b> ${decisionMaker.phone || 'N/A'}

⏰ Direct outreach scheduled in 24 hours
📌 Action: Agent will contact by name directly
    `);
  }
}

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
          const messageId = parsed.messageId;
          const headers = parsed.headers ? Object.fromEntries(parsed.headers) : {};

          console.log(`   📩 Processing email from: ${fromEmail}`);

          const emailData = {
            from: fromEmail,
            subject: subject,
            body: body,
            messageId: messageId,
            headers: headers
          };

          // Guard 1: auto-reply detection
          if (isAutoReply(emailData)) {
            console.log(`   ⏭ Auto-reply detected from ${fromEmail} — extracting contacts`);
            
            // Extract decision maker from auto-reply body
            await extractDecisionMaker(emailData);
            
            // Mark in Supabase so we never reply to this thread again
            await supabase.from('conversations').upsert({
              lead_email: fromEmail,
              is_auto_reply: true,
              is_closed: true,
              last_message_body: body,
              updated_at: new Date().toISOString()
            }, { onConflict: 'lead_email' });

            // Send ONE Telegram alert only (not repeated)
            await sendTelegramOnce(
              `auto_${fromEmail}`,
              `⏭ Auto-reply detected\n📧 ${fromEmail}\n🔕 Thread closed`
            );

            // Mark as seen in IMAP
            imap.addFlags(uid, ['\\Seen'], (err) => {
              if (err) console.error('Error marking as seen:', err);
              resolve();
            });
            return;
          }

          // Guard 2: same message loop detection
          const isLoop = await isSameMessageReceived(fromEmail, body);
          if (isLoop) {
            console.log(`   🔄 Loop detected for ${fromEmail} — stopping`);
            await supabase.from('conversations').upsert({
              lead_email: fromEmail,
              is_closed: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'lead_email' });
            
            imap.addFlags(uid, ['\\Seen'], (err) => {
              if (err) console.error('Error marking as seen:', err);
              resolve();
            });
            return;
          }

          // 1. Match with lead in Supabase
          const { data: lead } = await supabase
            .from('leads')
            .select('*')
            .eq('email', fromEmail.toLowerCase())
            .maybeSingle();

          if (!lead) {
            console.log(`   ⏩ Skipping email from unknown sender: ${fromEmail}`);
            imap.addFlags(uid, ['\\Seen'], (err) => {
              if (err) console.error('Error marking as seen:', err);
            });
            return resolve();
          }

          console.log(`   🎯 Match found! Lead: ${lead.business_name}`);

          // Guard 3: reply count limit
          const { data: convo } = await supabase
            .from('conversations')
            .select('reply_count, is_closed')
            .eq('lead_email', fromEmail.toLowerCase())
            .maybeSingle();

          if (convo?.is_closed) {
            console.log(`   🔒 Conversation closed for ${fromEmail} — skipping`);
            imap.addFlags(uid, ['\\Seen'], (err) => {
              if (err) console.error('Error marking as seen:', err);
              resolve();
            });
            return;
          }

          if ((convo?.reply_count || 0) >= 3) {
            console.log(`   ⛔ Reply limit for ${fromEmail} — waiting for human`);
            
            await sendTelegramOnce(
              `limit_${fromEmail}`,
              `⏸ Reply limit reached\n📧 ${fromEmail}\n👤 Waiting for unique response\n💡 If they reply with unique message → agent continues`
            );
            
            await supabase.from('conversations').upsert({
              lead_email: fromEmail,
              is_closed: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'lead_email' });

            imap.addFlags(uid, ['\\Seen'], (err) => {
              if (err) console.error('Error marking as seen:', err);
              resolve();
            });
            return;
          }

          // Safe to reply — increment counter
          await supabase.from('conversations').upsert({
            lead_email: fromEmail,
            reply_count: (convo?.reply_count || 0) + 1,
            last_message_body: body,
            is_closed: false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'lead_email' });

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
