// modules/outreach/whatsappSender.js
// Naisora AI Agent — WhatsApp Sender (Queue Mode for Railway)

const { supabase } = require('../../config/database');
const { sendMessage } = require('../../config/telegram');

const DAILY_LIMIT = 25;

// Check how many messages sent or queued today
async function getTodayCount() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Check outreach_log (actual sends) + whatsapp_queue (pending/queued)
  const { count: logCount } = await supabase
    .from('outreach_log')
    .select('*', { count: 'exact', head: true })
    .eq('channel', 'whatsapp')
    .gte('sent_at', todayStart.toISOString());

  const { count: queueCount } = await supabase
    .from('whatsapp_queue')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString());

  return (logCount || 0) + (queueCount || 0);
}

// Main daily outreach
async function sendDailyWhatsApp() {
  if (process.env.WHATSAPP_ENABLED !== 'true') {
    console.log('⏭️  WhatsApp outreach disabled (WHATSAPP_ENABLED != true)');
    return;
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — WhatsApp Outreach (Queue)      ║');
  console.log('╚══════════════════════════════════════════════╝');

  const todayCount = await getTodayCount();
  const remaining = DAILY_LIMIT - todayCount;

  if (remaining <= 0) {
    console.log('🛑 Daily WhatsApp limit reached');
    await sendMessage('🛑 Daily WhatsApp limit reached (25 messages)');
    return;
  }

  console.log(`📊 Today: ${todayCount} handled, ${remaining} remaining\n`);

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      seo_audits (
        total_score,
        pitch
      )
    `)
    .eq('lead_category', 'hot')
    .neq('outreach_status', 'whatsapp_sent')
    .not('phone', 'is', null)
    .order('lead_score', { ascending: false })
    .limit(remaining);

  if (!leads || leads.length === 0) {
    console.log('📭 No hot leads ready for WhatsApp today.');
    return;
  }

  console.log(`🎯 ${leads.length} hot leads to queue today\n`);

  let queued = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    console.log(`\n📱 [${i + 1}/${leads.length}] Queuing: ${lead.business_name}`);

    let message = "";
    const audit = lead.seo_audits?.[0];
    
    const priority = lead.priority || (lead.has_website ? 2 : 1);
    const area = lead.area || 'Bangalore';
    const pagespeedScore = lead.pagespeed_score || 45;
    const xIssues = lead.issues_found || 5;

    if (audit) {
      message = `Hi ${lead.business_name} 👋

Your restaurant scores ${audit.total_score}/100 on Google's search and visibility audit.

${audit.pitch}

— Nahid, Naisora`;
    } else if (priority === 1) {
      message = `Hi ${lead.business_name} 👋

I searched for you on Google — you don't have a website yet.
You're losing customers daily to restaurants that do.

I build websites for Bangalore restaurants that get found on Google and take direct orders — no Zomato commission.

I made a free growth plan for you. Want me to share it?

— Nahid, Naisora`;
    } else if (priority === 2) {
      message = `Hi ${lead.business_name} 👋

I ran a free audit on your website — it scored ${pagespeedScore}/100 on Google's speed test.

That means slow loading, poor mobile experience, and lower Google ranking.

I fix this for Bangalore restaurants. Want me to send your free audit report?

— Nahid, Naisora`;
    } else {
      message = `Hi ${lead.business_name} 👋

Your competitors are showing up before you on Google for "${area} restaurants".

I found ${xIssues} SEO issues on your website holding you back.

I help Bangalore restaurants rank higher on Google. Want your free SEO audit?

— Nahid, Naisora`;
    }

    // INSERT into whatsapp_queue instead of sending directly
    const { error } = await supabase.from('whatsapp_queue').insert({
      phone: lead.phone,
      message: message,
      status: 'pending'
    });

    if (!error) {
      queued++;
      await supabase
        .from('leads')
        .update({
          outreach_status: 'whatsapp_sent',
          outreach_channel: 'whatsapp',
          whatsapp_count: (lead.whatsapp_count || 0) + 1,
          last_contacted_at: new Date().toISOString(),
        })
        .eq('id', lead.id);
    } else {
      console.error(`❌ Failed to queue for ${lead.business_name}:`, error.message);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 WhatsApp Queue: ${queued} messages added`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await sendMessage(
    `📱 *WhatsApp Outreach Queued*\n\n` +
    `✅ Queued: ${queued}\n` +
    `📊 Today total: ${todayCount + queued}/${DAILY_LIMIT}\n\n` +
    `💻 Run local whatsapp-service.js to send.`
  );
}

// Follow-up for leads (Day 3)
async function sendFollowUp() {
  if (process.env.WHATSAPP_ENABLED !== 'true') return;

  const todayCount = await getTodayCount();
  const remaining = DAILY_LIMIT - todayCount;

  if (remaining <= 0) {
    console.log('🛑 Daily WhatsApp limit reached');
    return;
  }

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('outreach_status', 'whatsapp_sent')
    .lt('last_contacted_at', threeDaysAgo.toISOString())
    .limit(remaining);

  if (!leads || leads.length === 0) {
    console.log('No WhatsApp follow-ups needed today.');
    return;
  }

  let queued = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const message = `Hi ${lead.business_name} 👋, just following up on my previous message. Did you get a chance to see the free audit I did for your website?`;

    const { error } = await supabase.from('whatsapp_queue').insert({
      phone: lead.phone,
      message: message,
      status: 'pending'
    });

    if (!error) {
      queued++;
      await supabase
        .from('leads')
        .update({
          outreach_status: 'followup_1',
          last_contacted_at: new Date().toISOString(),
        })
        .eq('id', lead.id);
    }
  }

  console.log(`✅ Follow-ups queued: ${queued}`);
  if (queued > 0) {
    await sendMessage(`🔄 Follow-ups queued: ${queued} WhatsApp messages`);
  }
}

module.exports = { sendDailyWhatsApp, sendFollowUp };