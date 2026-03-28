// modules/outreach/replyAnalyser.js
// Naisora AI Agent — Reply Analyser
// Uses Haiku to categorise every reply
// Sends instant Telegram alert when someone is interested

const { askClaudeWithSystem } = require('../../config/claude');
const { createClient } = require('@supabase/supabase-js');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─── Analysis categories ──────────────────────────────────────────────────────
const SENTIMENTS = {
  INTERESTED: 'interested',           // "Yes send me the audit", "Call me", "How much?"
  HAS_QUESTION: 'has_question',       // "What exactly do you do?", "Which services?"
  NOT_INTERESTED: 'not_interested',   // "Not interested", "We already have someone"
  WRONG_NUMBER: 'wrong_number',       // "Wrong number", "Who is this?"
  NEEDS_FOLLOWUP: 'needs_followup',   // Vague reply, unclear intent
  OUT_OF_OFFICE: 'out_of_office',     // Auto-reply or "Call later"
};

// ─── Haiku system prompt for analysis ────────────────────────────────────────
const ANALYSER_SYSTEM = `You analyse WhatsApp replies from restaurant owners to a web agency's cold outreach.

Classify the reply into exactly ONE category:
- interested: they want to know more, asked for price, said yes, want a call, asked for the audit
- has_question: they asked a specific question about the service
- not_interested: they said no, not needed, already have someone, go away
- wrong_number: they said wrong number, who is this, not a business
- needs_followup: vague reply, unclear intent, just said "ok" or "thanks"
- out_of_office: auto-reply, will reply later, busy message

Also extract:
- key_intent: one sentence summary of what they said
- suggested_response: 1-2 sentence reply we should send them

Respond in JSON only. Format:
{
  "sentiment": "interested",
  "key_intent": "They want to know the pricing",
  "suggested_response": "Great! Our website package starts at ₹8,000 one-time. Can I send you the full breakdown?"
}`;

// ─── Analyse a single reply ───────────────────────────────────────────────────
async function analyseReply(lead, replyText) {
  console.log(`\n🧠 Analysing reply from ${lead.business_name}...`);

  try {
    const raw = await askClaudeWithSystem(
      ANALYSER_SYSTEM,
      `Business: ${lead.business_name}, ${lead.area}\nReply: "${replyText}"`
    );

    // Parse JSON response
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(cleaned);

    // Save analysis to Supabase
    await supabase
      .from('leads')
      .update({
        reply_sentiment: analysis.sentiment,
        outreach_status: mapSentimentToStatus(analysis.sentiment),
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id);

    console.log(`   Sentiment: ${analysis.sentiment}`);
    console.log(`   Intent: ${analysis.key_intent}`);

    // Handle based on sentiment
    await handleSentiment(lead, replyText, analysis);

    return analysis;

  } catch (err) {
    console.error('Reply analyser error:', err.message);
    // Default — mark as needs followup
    await supabase
      .from('leads')
      .update({ reply_sentiment: 'needs_followup', outreach_status: 'replied' })
      .eq('id', lead.id);
    return null;
  }
}

// ─── Map sentiment to lead pipeline status ────────────────────────────────────
function mapSentimentToStatus(sentiment) {
  const map = {
    interested: 'meeting',
    has_question: 'replied',
    not_interested: 'lost',
    wrong_number: 'blacklisted',
    needs_followup: 'replied',
    out_of_office: 'contacted',
  };
  return map[sentiment] || 'replied';
}

// ─── Handle each sentiment differently ───────────────────────────────────────
async function handleSentiment(lead, replyText, analysis) {
  const { sentiment, key_intent, suggested_response } = analysis;

  if (sentiment === SENTIMENTS.INTERESTED) {
    // 🔥 HOT — instant Telegram alert with full context
    await sendTelegramAlert(
      `🔥 *HOT REPLY — ACTION NEEDED*\n\n` +
      `Business: *${lead.business_name}*\n` +
      `Area: ${lead.area}\n` +
      `Phone: ${lead.phone}\n` +
      `Score: ${lead.lead_score}/100\n\n` +
      `💬 Their reply:\n"${replyText}"\n\n` +
      `🧠 Intent: ${key_intent}\n\n` +
      `💡 Suggested reply:\n"${suggested_response}"\n\n` +
      `👉 Call them or WhatsApp them NOW`
    );

    // Re-score lead to 95
    await supabase
      .from('leads')
      .update({ lead_score: 95, lead_category: 'hot' })
      .eq('id', lead.id);

    console.log(`   🔥 HOT LEAD — Telegram alert sent!`);
     // Auto-generate intelligence report for interested leads
    const { triggerForReply } = require('../intelligence/clientIntelligence');
    triggerForReply(lead.id).catch(err => console.error('Intel report failed:', err.message));

    // Re-score lead to 95
    await supabase
      .from('leads')
      .update({ lead_score: 95, lead_category: 'hot' })
      .eq('id', lead.id);

  } else if (sentiment === SENTIMENTS.HAS_QUESTION) {
    // Send them the suggested response via WhatsApp
    await sendTelegramAlert(
      `❓ *Question from ${lead.business_name}*\n\n` +
      `"${replyText}"\n\n` +
      `💡 Suggested reply:\n"${suggested_response}"\n\n` +
      `Reply manually or approve auto-send`
    );
    console.log(`   ❓ Has question — Telegram alert sent`);

  } else if (sentiment === SENTIMENTS.NOT_INTERESTED) {
    console.log(`   ❌ Not interested — marked as lost`);

  } else if (sentiment === SENTIMENTS.WRONG_NUMBER) {
    // Blacklist — don't contact again
    await supabase
      .from('leads')
      .update({ outreach_status: 'blacklisted', lead_category: 'cold' })
      .eq('id', lead.id);
    console.log(`   🚫 Wrong number — blacklisted`);

  } else if (sentiment === SENTIMENTS.NEEDS_FOLLOWUP) {
    console.log(`   🔄 Vague reply — scheduled for follow-up`);
  }
}

module.exports = { analyseReply, SENTIMENTS };