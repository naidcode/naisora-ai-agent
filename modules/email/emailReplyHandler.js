const { google } = require('googleapis');
const { supabase } = require('../../config/database');
const { askClaudeWithSystem } = require('../../config/claude');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);
oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

/**
 * Check Gmail for unread replies from leads and auto-reply using Claude
 */
async function handleEmailReplies() {
  console.log('\n📧 --- Email Reply Handler Starting ---');
  
  try {
    // 1. Fetch unread messages from Inbox
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread label:inbox'
    });

    const messages = res.data.messages || [];
    if (messages.length === 0) {
      console.log('   No new unread emails.');
      return;
    }

    console.log(`   Found ${messages.length} unread emails. Checking for leads...`);

    for (const msgRef of messages) {
      const msg = await gmail.users.messages.get({ userId: 'me', id: msgRef.id });
      const headers = msg.data.payload.headers;
      
      const fromHeader = headers.find(h => h.name === 'From')?.value || '';
      const subjectHeader = headers.find(h => h.name === 'Subject')?.value || '';
      
      // Extract email address from "Name <email@example.com>"
      const fromEmailMatch = fromHeader.match(/<(.+)>|(\S+@\S+)/);
      const fromEmail = fromEmailMatch ? (fromEmailMatch[1] || fromEmailMatch[2]) : fromHeader;

      if (!fromEmail) continue;

      // 2. Match with lead in Supabase
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('email', fromEmail.toLowerCase())
        .maybeSingle();

      if (!lead) {
        console.log(`   ⏩ Skipping email from unknown sender: ${fromEmail}`);
        // Mark as read so we don't check it again (optional, but keeps inbox clean)
        await gmail.users.messages.batchModify({
          userId: 'me',
          ids: [msgRef.id],
          removeLabelIds: ['UNREAD']
        });
        continue;
      }

      console.log(`   📩 Reply from lead: ${lead.business_name} (${fromEmail})`);

      // 3. Extract snippet or full body
      const body = msg.data.snippet; // Snippet is usually enough for a first reply

      // 4. Generate Claude Haiku response
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

Their lead type: ${lead.lead_type || 'unknown'}
Their business: ${lead.business_name} in ${lead.area}`;

      const aiReply = await askClaudeWithSystem(systemPrompt, body);

      // 5. Send reply via Resend
      const { data, error: sendError } = await resend.emails.send({
        from: 'Nahid from Naisora <hey@naisora.com>',
        to: [fromEmail],
        subject: `Re: ${subjectHeader}`,
        text: aiReply,
      });

      if (sendError) {
        console.error(`   ❌ Failed to send email reply to ${fromEmail}:`, sendError.message);
        continue;
      }

      console.log(`   ✅ Sent auto-reply to ${lead.business_name}`);

      // 6. Log to outreach_log
      await supabase.from('outreach_log').insert({
        lead_id: lead.id,
        channel: 'email',
        message_type: 'reply_received',
        message_text: body,
        sent_at: new Date().toISOString()
      });

      await supabase.from('outreach_log').insert({
        lead_id: lead.id,
        channel: 'email',
        message_type: 'auto_reply',
        message_text: aiReply,
        sent_at: new Date().toISOString()
      });

      // 7. Update lead status
      await supabase
        .from('leads')
        .update({ 
          outreach_status: 'replied',
          reply_received_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      // 8. Mark as read in Gmail
      await gmail.users.messages.batchModify({
        userId: 'me',
        ids: [msgRef.id],
        removeLabelIds: ['UNREAD']
      });

      const { sendMessage } = require('../../config/telegram');
      await sendMessage(
        `🔔 *NEW REPLY — Email*\n\n` +
        `👤 *Business:* ${lead.business_name}\n` +
        `📍 *Area:* ${lead.area}\n` +
        `💬 *Their message:* ${body}\n` +
        `🤖 *Our auto reply:* ${aiReply}\n` +
        `📊 *Lead type:* ${lead.lead_type}\n` +
        `🌡️ *Status:* ${lead.lead_category || 'hot'}`
      );
    }

  } catch (error) {
    console.error('❌ Email reply handler error:', error.message);
  }
}

module.exports = { handleEmailReplies };
