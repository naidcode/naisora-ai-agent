const { supabase, STATUS } = require('../../config/database');
const { sendMessage } = require('../../config/telegram');
const { askClaude } = require('../../config/claude');
const { sendEmail } = require('../../config/smtp');
const { writeFollowup1, writeFollowup2 } = require('../email/emailWriter');
const { sendScraperFollowUpEmail } = require('../email/emailSender');

/**
 * Follow Up Engine
 * Checks for leads that need follow-up across all channels
 */
async function runFollowUpEngine() {
  console.log('🚀 runFollowUpEngine started');
  
  // FIX 1: Add startup delay before first Supabase call to allow DNS resolution
  await new Promise(r => setTimeout(r, 3000));

  console.log('\n🔄 --- Starting Follow Up Engine ---');
  const today = new Date();
  const twoDaysAgo = new Date(today.getTime() - (2 * 24 * 60 * 60 * 1000)).toISOString();

  let stats = {
    email: 0,
    whatsapp: 0,
    instagram: 0,
    linkedin: 0,
    leads: []
  };

  // FIX 2: Helper for robust fetching with retries
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

  try {
    // 1. Email Follow Ups
    console.log('📧 Checking Email follow-ups...');
    const emailLeads = await fetchWithRetry(
      () => supabase
        .from('leads')
        .select('*')
        .eq('outreach_status', STATUS.CONTACTED)
        .lte('last_contacted_at', twoDaysAgo),
      'email leads'
    );

    for (const lead of emailLeads || []) {
      try {
        const prompt = `Write a short, friendly follow-up email to ${lead.business_name}. 
We messaged them 2 days ago about their ${lead.lead_type.replace('_', ' ')}.
Tone: natural, non-pushy, helpful. 
Max 3-4 lines. 
Sign as Nahid.`;
        const message = await askClaude(prompt);
        await sendEmail(lead.email, `Checking in: ${lead.business_name}`, message);
        
        await supabase.from('leads').update({
          outreach_status: STATUS.FOLLOWUP_1,
          last_contacted_at: new Date().toISOString()
        }).eq('id', lead.id);

        stats.email++;
        stats.leads.push({ name: lead.business_name, area: lead.area, channel: 'Email', type: lead.lead_type });
        console.log(`✅ Email follow-up sent to ${lead.business_name}`);
      } catch (e) {
        console.error(`❌ Failed email follow-up for ${lead.business_name}:`, e.message);
      }
    }

    // 2. WhatsApp Follow Ups
    console.log('📱 Checking WhatsApp follow-ups...');
    const waLeads = await fetchWithRetry(
      () => supabase
        .from('leads')
        .select('*')
        .eq('outreach_status', STATUS.WHATSAPP_SENT)
        .lte('last_contacted_at', twoDaysAgo),
      'WhatsApp leads'
    );

    // FIX 3: If both return empty array → send Telegram alert
    if (emailLeads.length === 0 && waLeads.length === 0) {
      await sendMessage('⚠️ No leads fetched — Supabase may be slow or DNS issues persist. Skipping follow-ups.');
      return;
    }
    for (const lead of waLeads || []) {
      try {
        const prompt = `Write a short WhatsApp follow-up to ${lead.business_name}. 
2 days since first message. 
Tone: casual, Indian English, friendly. 
Max 2 lines.`;
        const message = await askClaude(prompt);
        
        // Use UltraMsg directly for follow-ups
        const { sendWhatsAppMessage } = require('../../config/whatsapp');
        await sendWhatsAppMessage(lead.phone, message);

        await supabase.from('leads').update({
          outreach_status: STATUS.WHATSAPP_FOLLOWUP_1,
          last_contacted_at: new Date().toISOString()
        }).eq('id', lead.id);

        stats.whatsapp++;
        stats.leads.push({ name: lead.business_name, area: lead.area, channel: 'WhatsApp', type: lead.lead_type });
        console.log(`✅ WhatsApp follow-up sent to ${lead.business_name}`);
      } catch (e) {
        console.error(`❌ Failed WhatsApp follow-up for ${lead.business_name}:`, e.message);
      }
    }

    // 3. Instagram & LinkedIn (Skipped for now as per current logic, but adding logging)
    console.log('📸 Instagram/LinkedIn follow-ups: skipping (manual check required)');

    // Send Telegram Alert
    const leadList = stats.leads.map(l => `- ${l.name} (${l.area}) — ${l.channel} — ${l.type}`).join('\n');
    
    const report = `🔄 *Follow Up Report — ${today.toLocaleDateString()}*

📧 Email Follow Ups: ${stats.email} sent
📱 WhatsApp Follow Ups: ${stats.whatsapp} sent
📸 Instagram Follow Ups: ${stats.instagram} sent
💼 LinkedIn Follow Ups: ${stats.linkedin} sent

*Leads followed up:*
${leadList || 'No follow ups sent today.'}`;

    await sendMessage(report);
    console.log('✅ Follow up report sent.');
    console.log('✅ runFollowUpEngine finished');

  } catch (err) {
    console.error('💥 Fatal error in follow up engine:', err.message);
  }
}

module.exports = { runFollowUpEngine };
