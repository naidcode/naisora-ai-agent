// modules/outreach/leadScorer.js
// Naisora AI Agent — Lead Re-Scorer
// Updates lead scores based on behaviour (replies, engagement, time)
// Also generates daily priority list for manual outreach

const { createClient } = require('@supabase/supabase-js');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─── Re-score lead after reply ────────────────────────────────────────────────
async function rescoreAfterReply(leadId, sentiment) {
  const scoreMap = {
    interested: 95,
    has_question: 75,
    needs_followup: 60,
    out_of_office: 50,
    not_interested: 5,
    wrong_number: 0,
  };

  const newScore = scoreMap[sentiment] ?? 50;
  const newCategory = newScore >= 70 ? 'hot' : newScore >= 40 ? 'warm' : 'cold';

  await supabase
    .from('leads')
    .update({ lead_score: newScore, lead_category: newCategory })
    .eq('id', leadId);

  console.log(`📊 Lead re-scored: ${newScore}/100 [${newCategory}]`);
  return { score: newScore, category: newCategory };
}

// ─── Generate daily priority list ────────────────────────────────────────────
// Sends you a Telegram summary every morning of who to focus on
async function generateDailyPriorities() {
  // Hot leads waiting for manual follow-up
  const { data: hotLeads } = await supabase
    .from('leads')
    .select('business_name, area, phone, lead_score, reply_sentiment, reply_text')
    .eq('lead_category', 'hot')
    .in('outreach_status', ['meeting', 'replied'])
    .order('lead_score', { ascending: false })
    .limit(10);

  // New hot leads not yet contacted
  const { data: newHot } = await supabase
    .from('leads')
    .select('business_name, area, phone, lead_score')
    .eq('lead_category', 'hot')
    .eq('outreach_status', 'new')
    .order('lead_score', { ascending: false })
    .limit(5);

  // Build Telegram message
  let msg = `📋 *Daily Priority Report — ${new Date().toLocaleDateString('en-IN')}*\n\n`;

  if (hotLeads && hotLeads.length > 0) {
    msg += `🔥 *Follow up with these (replied):*\n`;
    hotLeads.forEach((l, i) => {
      msg += `${i + 1}. ${l.business_name} (${l.area})\n`;
      msg += `   📞 ${l.phone} | Score: ${l.lead_score}\n`;
      if (l.reply_text) {
        msg += `   💬 "${l.reply_text.substring(0, 60)}"\n`;
      }
      msg += '\n';
    });
  }

  if (newHot && newHot.length > 0) {
    msg += `\n📱 *New hot leads to contact today:*\n`;
    newHot.forEach((l, i) => {
      msg += `${i + 1}. ${l.business_name} (${l.area}) — ${l.phone}\n`;
    });
  }

  if ((!hotLeads || hotLeads.length === 0) && (!newHot || newHot.length === 0)) {
    msg += `No priority leads today. Run scraper to find more hot leads.`;
  }

  await sendTelegramAlert(msg);
  console.log('✅ Daily priority report sent to Telegram');
}

// ─── Weekly pipeline summary ──────────────────────────────────────────────────
async function weeklyPipelineSummary() {
  const { data: pipeline } = await supabase
    .from('leads')
    .select('outreach_status, lead_category')
    .order('created_at', { ascending: false });

  if (!pipeline) return;

  const counts = pipeline.reduce((acc, l) => {
    acc[l.outreach_status] = (acc[l.outreach_status] || 0) + 1;
    return acc;
  }, {});

  const msg =
    `📊 *Weekly Pipeline Summary*\n\n` +
    `🆕 New (not contacted): ${counts['new'] || 0}\n` +
    `📱 Contacted: ${counts['contacted'] || 0}\n` +
    `🔄 Follow-up sent: ${counts['followup_1'] || 0}\n` +
    `💬 Replied: ${counts['replied'] || 0}\n` +
    `🔥 In meeting: ${counts['meeting'] || 0}\n` +
    `✅ Closed: ${counts['closed'] || 0}\n` +
    `❌ Lost: ${counts['lost'] || 0}\n` +
    `🚫 Blacklisted: ${counts['blacklisted'] || 0}\n\n` +
    `Total leads in system: ${pipeline.length}`;

  await sendTelegramAlert(msg);
}

module.exports = { rescoreAfterReply, generateDailyPriorities, weeklyPipelineSummary };