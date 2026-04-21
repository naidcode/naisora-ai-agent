// modules/intelligence/clientIntelligence.js
// Naisora AI Agent — Client Intelligence Report
// Triggers automatically when a lead replies to WhatsApp/email
// Generates complete business intelligence report in 2 minutes
// Sends to your Telegram so you're fully prepared before calling them

require('dotenv').config();
const { askClaudeSonnet } = require('../../config/claude');
const { auditWebsite } = require('../seo/seoAudit');
const { getQuickScore } = require('../seo/pagespeedAudit');
const { createClient } = require('@supabase/supabase-js');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── System prompt for intelligence report ────────────────────────────────────
const INTEL_SYSTEM = `You are a business intelligence analyst preparing a briefing for a web design agency owner before a sales call with a restaurant owner in Bangalore.

Write a practical, actionable report. Focus on:
1. What problems this business has that we can solve
2. What they actually want (read between the lines of their reply)
3. Exactly what to say to close the deal
4. Common objections they will raise and how to handle them

Be direct and specific. This is an internal document — be honest about weaknesses.`;

// ─── Generate intelligence report ────────────────────────────────────────────
async function generateIntelligenceReport(lead) {
  console.log(`\n🧠 Generating intelligence report for ${lead.business_name}...`);

  // Run website audit if they have a site
  let auditData = null;
  if (lead.has_website && lead.website) {
    try {
      auditData = await auditWebsite(lead);
    } catch (err) {
      console.log('Audit failed — continuing without it');
    }
  }

  // Build intelligence prompt
  const prompt = buildIntelPrompt(lead, auditData);

  let report;
  try {
    report = await askClaudeSonnet(prompt, INTEL_SYSTEM, 1500);
  } catch (err) {
    // Fallback if Claude not connected
    report = buildFallbackReport(lead, auditData);
  }

  // Save to Supabase
  await supabase.from('seo_reports').insert({
    lead_id: lead.id,
    report_type: 'client_intelligence',
    report_data: { report, auditData },
    summary: `Intelligence report for ${lead.business_name}`,
    audit_score: auditData?.overall_score || null,
  });

  // Send to Telegram (split into chunks if too long)
  await sendIntelToTelegram(lead, report, auditData);

  return report;
}

// ─── Build the intelligence prompt ───────────────────────────────────────────
function buildIntelPrompt(lead, auditData) {
  const websiteStatus = lead.has_website
    ? `Has website: ${lead.website}\nWebsite score: ${auditData?.overall_score || 'not audited'}/100`
    : 'NO WEBSITE — this is our main offer';

  return `Generate a client intelligence briefing for this sales call.

BUSINESS OVERVIEW:
Name: ${lead.business_name}
Location: ${lead.area}, Bangalore
Category: ${lead.category || 'restaurant'}
${websiteStatus}
Google Rating: ${lead.rating || 'unknown'} stars
Review Count: ${lead.review_count || 0} reviews
GBP Verified: ${lead.gbp_verified ? 'Yes' : 'No'}

LEAD INTELLIGENCE:
Lead Score: ${lead.lead_score}/100
Why they scored this: ${lead.score_reasons?.join(', ') || 'general weak online presence'}
Outreach channel: ${lead.outreach_channel || 'WhatsApp'}
Their reply: "${lead.reply_text || 'interested'}"
Reply sentiment: ${lead.reply_sentiment || 'interested'}

${auditData ? `WEBSITE AUDIT RESULTS:
Overall Score: ${auditData.overall_score}/100 (${auditData.grade})
Mobile Speed: ${auditData.pagespeed_mobile}/100
Top Issues: ${auditData.issues?.slice(0, 4).join(', ')}` : ''}

Write the following sections:
1. BUSINESS SNAPSHOT (2-3 sentences about their online presence)
2. THEIR PAIN POINTS (what problems they have — be specific)
3. WHAT THEY ACTUALLY WANT (based on their reply and business situation)
4. RECOMMENDED PACKAGE (which Naisora service fits best and why)
   - Landing Page ₹3,000 / Full Website ₹8,000 / Monthly Retainer ₹3,500/month
5. OPENING LINE (exactly how to start the call)
6. OBJECTION HANDLES (3 likely objections with exact responses)
7. CLOSING STRATEGY (how to close this specific client)`;
}

// ─── Build fallback report (when Claude not connected) ────────────────────────
function buildFallbackReport(lead, auditData) {
  const hasWebsite = lead.has_website;
  const score = auditData?.overall_score;

  return `
INTELLIGENCE REPORT — ${lead.business_name}
Generated: ${new Date().toLocaleDateString('en-IN')}

BUSINESS SNAPSHOT:
${lead.business_name} is a ${lead.category || 'restaurant'} in ${lead.area}, Bangalore.
${hasWebsite ? `They have a website scoring ${score}/100 — below average.` : 'They have NO website — highest priority prospect.'}
Google rating: ${lead.rating || 'unknown'} (${lead.review_count || 0} reviews)

PAIN POINTS:
${!hasWebsite ? '• No website — invisible on Google search\n• 100% dependent on Zomato/Swiggy commissions\n• Losing customers to competitors who show up online' : `• Website scores ${score}/100 — customers leave immediately\n• Losing Google rankings to competitors\n• Not getting direct orders`}

RECOMMENDED PACKAGE:
${!hasWebsite ? 'Full Website ₹8,000 + Monthly Retainer ₹3,500/month' : 'Website Redesign ₹8,000 + Monthly Retainer ₹3,500/month'}

OPENING LINE:
"Hi, is this ${lead.business_name.split(' ')[0]}? I'm Nahid from Naisora — I reached out about getting you more customers from Google. Do you have 5 minutes?"

KEY OBJECTIONS:
1. "Too expensive" → "It pays for itself with 2-3 extra tables per week. And we offer 30-day results guarantee."
2. "Already using Zomato" → "Zomato takes 30% commission. Your own website means 100% goes to you."
3. "Will think about it" → "Totally fine. Can I send you the free audit first so you can see exactly what's missing?"
`;
}

// ─── Send report to Telegram ──────────────────────────────────────────────────
async function sendIntelToTelegram(lead, report, auditData) {
  const header =
    `🧠 *Intelligence Report Ready*\n\n` +
    `Business: *${lead.business_name}*\n` +
    `Area: ${lead.area}\n` +
    `Phone: ${lead.phone}\n` +
    `Score: ${lead.lead_score}/100\n` +
    `${auditData ? `Website Score: ${auditData.overall_score}/100\n` : ''}` +
    `Reply: "${lead.reply_text?.substring(0, 100)}"\n\n` +
    `─────────────────────────\n`;

  await sendTelegramAlert(header);

  // Send report in chunks of 3500 chars (Telegram limit is 4096)
  const chunks = report.match(/[\s\S]{1,3500}/g) || [report];
  for (const chunk of chunks) {
    await sendTelegramAlert(chunk);
    await new Promise(r => setTimeout(r, 500));
  }
}

// ─── Auto-trigger when lead replies ──────────────────────────────────────────
// Called by replyAnalyser.js when sentiment is "interested" or "has_question"
async function triggerForReply(leadId) {
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (!lead) {
    console.error(`Lead ${leadId} not found`);
    return;
  }

  return await generateIntelligenceReport(lead);
}

module.exports = { generateIntelligenceReport, triggerForReply };