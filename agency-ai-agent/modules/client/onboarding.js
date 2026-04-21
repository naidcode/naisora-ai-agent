// modules/client/onboarding.js
// Naisora AI Agent — Client Onboarding
// Runs when a lead converts to a paying client
// Collects all information needed to start their project

require('dotenv').config();
const { route } = require('../../config/llmRouter');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─── Generate onboarding questionnaire ───────────────────────────────────────
async function generateOnboardingQuestions(client) {
  const prompt = `Generate a client onboarding questionnaire for a restaurant that just hired a web design agency.

Restaurant: ${client.business_name}
Package: ${client.package || 'Growth'}
Service: Website design + SEO + monthly retainer

Generate 10 specific questions to gather all information needed to:
1. Build their website
2. Set up their Google Business Profile
3. Start their SEO strategy
4. Write their first blog posts

Questions should be easy for a non-technical restaurant owner to answer.
Format as a numbered list.`;

  return await route('client_report', prompt, null, 600);
}

// ─── Send welcome message to new client ──────────────────────────────────────
async function sendWelcomeMessage(client) {
  const message = await route(
    'whatsapp_message',
    `Write a warm welcome WhatsApp message for a new client.
Restaurant: ${client.business_name}
Owner: ${client.name || 'Owner'}
Package: ${client.package || 'Growth — ₹8,000 website + ₹3,500/month retainer'}
Agency: Naisora (Nahid)

Message should:
- Thank them for choosing Naisora
- Confirm what we're building
- Set timeline expectations (7-14 days for website)
- Ask them to share logo, photos, menu
- Give your WhatsApp for questions
Keep it warm and professional.`,
    null,
    300
  );

  await sendTelegramAlert(
    `🎉 *New Client Onboarded — ${client.business_name}*\n\n` +
    `Package: ${client.package || 'Growth'}\n` +
    `Monthly fee: ₹${client.monthly_fee || 3500}\n\n` +
    `Send this welcome message:\n\n${message}`
  );

  return message;
}

// ─── Complete onboarding flow ─────────────────────────────────────────────────
async function onboardClient(leadId, packageDetails) {
  console.log(`\n🎉 Starting onboarding for lead ${leadId}...`);

  // Get lead data
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (!lead) {
    console.error('Lead not found');
    return;
  }

  // Create client record
  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      lead_id: leadId,
      name: lead.business_name,
      business_name: lead.business_name,
      email: lead.email || '',
      phone: lead.phone,
      area: lead.area,
      category: lead.category,
      website: lead.website,
      package: packageDetails.package || 'growth',
      monthly_fee: packageDetails.monthlyFee || 3500,
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create client:', error.message);
    return;
  }

  // Update lead status
  await supabase
    .from('leads')
    .update({ outreach_status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', leadId);

  // Send welcome message
  await sendWelcomeMessage(client);

  // Generate onboarding questions
  const questions = await generateOnboardingQuestions(client);

  await sendTelegramAlert(
    `📋 *Onboarding Questions — ${client.business_name}*\n\n${questions.substring(0, 3000)}`
  );

  console.log(`✅ Client onboarded: ${client.business_name}`);
  return client;
}

module.exports = { onboardClient, sendWelcomeMessage, generateOnboardingQuestions };