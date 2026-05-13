// outreach/followUpEngine.js
// Naisora AI Growth OS — Automated Follow-Up Engine
// Sends the right message on Day 2, Day 4, and Day 7 after initial contact
// Goal: keep leads warm and push toward a discovery call

const { supabase } = require('../../config/database');
const { sendMessage: sendTelegram } = require('../../config/telegram');
const { askClaudeSonnet } = require('../../config/claude');
const { formatAuditForWhatsApp, buildFallbackAudit } = require('../../seo/miniAudit');
const { sendUltraMsg } = require('../../config/ultramsg');

// ─── Follow-up schedule (days after first contact) ───────────────────────────
const FOLLOWUP_SCHEDULE = {
  followup_1: { daysAfter: 2, label: 'Day 2' },
  followup_2: { daysAfter: 4, label: 'Day 4' },
  followup_3: { daysAfter: 7, label: 'Day 7 (Final)' },
};

// ─── Write a contextual follow-up message ────────────────────────────────────
async function writeFollowUpMessage(lead, followupStage) {
  const stage = FOLLOWUP_SCHEDULE[followupStage];

  // Day 2: Soft nudge + deliver audit as hook
  if (followupStage === 'followup_1') {
    const audit = buildFallbackAudit(lead);
    const auditMsg = formatAuditForWhatsApp(lead, audit);

    return `Hi — just following up on my message yesterday.\n\nI went ahead and ran the quick audit anyway:\n\n${auditMsg}`;
  }

  // Day 4: Add urgency + competitor framing
  if (followupStage === 'followup_2') {
    const prompt = `Write a 3-sentence WhatsApp follow-up for a restaurant owner who hasn't replied after 4 days.

Business: ${lead.business_name}, ${lead.area}, Bangalore
Context: We offered them a free website audit showing they're not ranking on Google.

Rules:
- Don't beg or be pushy
- Mention a competitor nearby is benefiting from better Google presence
- End with "Worth a 10-min call this week?"
- Sign off: — Nahid, Naisora`;

    try {
      const msg = await askClaudeSonnet(prompt);
      return msg.trim();
    } catch {
      return `Hi again from Naisora. Restaurants near ${lead.area} that fixed their Google presence are seeing 30–40% more walk-ins. Wanted to check if you had 10 minutes this week to look at yours? — Nahid, Naisora`;
    }
  }

  // Day 7: Final message — closing the loop with an open door
  return `Hi ${lead.business_name || ''} — this is my last follow-up.\n\nThe free audit for your restaurant is still here if you want it. It shows exactly which Google searches you're missing and what it would take to fix.\n\nNo pressure — just let me know. — Nahid, Naisora`;
}

// ─── Send a follow-up via WhatsApp (UltraMsg) ──────────────────────────────────
async function sendFollowUpMessage(lead, followupStage) {
  const message = await writeFollowUpMessage(lead, followupStage);

  try {
    const result = await sendUltraMsg(lead.phone, message);

    // Log it
    await supabase.from('outreach_log').insert({
      lead_id: lead.id,
      channel: 'whatsapp',
      message_type: followupStage,
      message_text: message,
      sent_at: new Date().toISOString(),
      delivered: true,
      external_msg_id: result.id || 'ultramsg',
    });

    // Update lead status
    await supabase.from('leads')
      .update({
        outreach_status: followupStage,
        last_contacted_at: new Date().toISOString(),
      })
      .eq('id', lead.id);

    console.log(`   ✅ ${FOLLOWUP_SCHEDULE[followupStage].label} sent → ${lead.business_name}`);
    
    // Telegram Alert for visibility
    await sendTelegram(`📱 WhatsApp follow-up sent to ${lead.business_name} (${FOLLOWUP_SCHEDULE[followupStage].label})`);
    
    return { success: true };
  } catch (err) {
    console.error(`   ❌ Follow-up failed → ${lead.business_name}: ${err.message}`);
    return { success: false };
  }
}

// ─── Main runner — determine which leads need which follow-up today ──────────
async function runFollowUpEngine() {
  console.log('\n🔄 [FollowUpEngine] Checking who needs follow-up today...');

  // FIX 1: Startup delay
  await new Promise(r => setTimeout(r, 3000));

  // FIX 2: fetchWithRetry helper
  async function fetchWithRetry(queryFn, label, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await queryFn();
        if (error) throw new Error(error.message);
        return data || [];
      } catch (err) {
        console.log(`⚠ ${label} retry ${i+1}/3: ${err.message}`);
        if (i === retries - 1) {
          console.error(`❌ ${label} failed after 3 retries`);
          return []; // return empty, don't crash
        }
        await new Promise(r => setTimeout(r, 5000 * (i + 1)));
      }
    }
  }

  const now = new Date();
  let sent = 0;
  let skipped = 0;
  let totalFetched = 0;

  for (const [stage, config] of Object.entries(FOLLOWUP_SCHEDULE)) {
    const cutoffDate = new Date(now - config.daysAfter * 24 * 60 * 60 * 1000);
    const dayBefore = new Date(cutoffDate - 24 * 60 * 60 * 1000);

    // Find leads that were last contacted exactly N days ago and haven't replied
    const leads = await fetchWithRetry(
      () => supabase
        .from('leads')
        .select('*')
        .eq('outreach_status', config.daysAfter === 2 ? 'contacted' : `followup_${config.daysAfter === 4 ? 1 : 2}`)
        .lt('last_contacted_at', cutoffDate.toISOString())
        .gte('last_contacted_at', dayBefore.toISOString())
        .not('phone', 'is', null)
        .limit(20),
      `${config.label} leads`
    );

    totalFetched += leads.length;

    if (!leads || leads.length === 0) {
      console.log(`   ${config.label}: No leads due`);
      continue;
    }

    console.log(`   ${config.label}: ${leads.length} leads need follow-up`);

    for (const lead of leads) {
      const result = await sendFollowUpMessage(lead, stage);
      result.success ? sent++ : skipped++;
      // Small delay between messages
      await new Promise(r => setTimeout(r, 10000)); // 10 seconds
    }
  }

  // FIX 3: If totalFetched is 0, send Telegram alert (Supabase might be down or DNS issues)
  if (totalFetched === 0) {
    await sendTelegram('⚠️ No leads fetched in followUpEngine — Supabase may be slow or DNS issues persist. Skipping follow-ups.');
    return { sent: 0, skipped: 0 };
  }

  console.log(`\n✅ [FollowUpEngine] Done — ${sent} sent, ${skipped} failed`);
  return { sent, skipped };
}

module.exports = { runFollowUpEngine, writeFollowUpMessage };
