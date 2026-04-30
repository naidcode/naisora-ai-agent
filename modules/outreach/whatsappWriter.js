const { askClaude, askClaudeSonnet } = require('../../config/claude');
const { supabase } = require('../../config/database');

// ─── Write cold WhatsApp message (Lead Type Aware) ───────────────────────────
async function writeWhatsAppMessage(lead) {
  const area = lead.area || 'Bangalore';
  const leadType = lead.lead_type || 'unknown';
  const pagespeedScore = lead.pagespeed_score || 0;

  let prompt = '';
  if (leadType === 'no_website') {
    prompt = `Write a short WhatsApp cold message to ${lead.business_name} restaurant owner in ${area}, Bangalore.
They have no website.
Pain point: losing customers to competitors with websites.
Offer: free growth plan.
Tone: casual, friendly, Indian. Like texting a business owner.
Sign off as Nahid, Naisora.
Max 50 words.`;
  } else if (leadType === 'bad_website') {
    prompt = `Write a short WhatsApp cold message to ${lead.business_name} restaurant owner in ${area}, Bangalore.
Their website scored ${pagespeedScore}/100 — very slow.
Pain point: slow website hurting Google ranking and losing customers.
Offer: free audit report ready to share.
Tone: casual, friendly, Indian. Like texting a business owner.
Sign off as Nahid, Naisora.
Max 50 words.`;
  } else if (leadType === 'weak_seo') {
    prompt = `Write a short WhatsApp cold message to ${lead.business_name} restaurant owner in ${area}, Bangalore.
Their competitors rank above them on Google for ${area} restaurants.
Pain point: missing customers who search on Google.
Offer: free SEO audit ready.
Tone: casual, friendly, Indian. Like texting a business owner.
Sign off as Nahid, Naisora.
Max 50 words.`;
  } else {
    prompt = `Write a short WhatsApp cold message to ${lead.business_name} restaurant owner in ${area}, Bangalore.
They have a digital presence but could improve their professional brand image and visibility.
Offer: free website and local search audit.
Tone: casual, friendly, Indian. Like texting a business owner.
Sign off as Nahid, Naisora.
Max 50 words.`;
  }

  try {
    const message = await askClaude(prompt);
    return { message: message.trim(), variant: leadType };
  } catch (err) {
    console.error('WhatsApp writer error:', err.message);
    return { message: buildFallbackMessage(lead), variant: 'fallback' };
  }
}

// ─── Fallback template (if Sonnet fails) ─────────────────────────────────────
function buildFallbackMessage(lead) {
  const noWebsite = !lead.has_website;

  if (noWebsite) {
    return `Hi, I noticed ${lead.business_name} in ${lead.area} doesn't have a website yet. People searching for restaurants in ${lead.area} on Google can't see your menu or vibe. I build professional digital storefronts for restaurants here in Bangalore. Want me to send over a free website concept and local audit? — Nahid, Naisora`;
  }

  return `Hi, I was looking at ${lead.business_name} online and noticed your site design doesn't quite match the quality of your food. I help Bangalore restaurants upgrade to professional, modern websites that show up better on Google Maps. Would you like a free 2-min design audit? — Nahid, Naisora`;
}

// ─── WhatsApp System Prompt ──────────────────────────────────────────────────
const WHATSAPP_SYSTEM = `You are Nahid from Naisora, a web design agency in Bangalore. You are following up with a restaurant owner on WhatsApp. Tone: Friendly, casual, helpful, natural Indian English.`;

// ─── Write follow-up WhatsApp (Day 3) ────────────────────────────────────────
async function writeFollowUpMessage(lead) {
  const prompt = `Write a short WhatsApp follow-up message for a restaurant owner who didn't reply to our first message 3 days ago.

Business: ${lead.business_name}, ${lead.area}
Topic: ${lead.has_website ? 'upgrading their website design' : 'building a professional digital storefront'}

Keep it very short — 2 sentences max. Casual. Remind them about the free design concept/audit offer.`;

  try {
    const message = await askClaudeSonnet(prompt, WHATSAPP_SYSTEM, 150);
    return { message: message.trim(), variant: 'followup' };
  } catch (err) {
    return { message: `Hi again — just checking if you'd like that free design concept for ${lead.business_name}. No pressure, just thought it'd be helpful. — Nahid, Naisora`, variant: 'followup' };
  }
}

module.exports = { writeWhatsAppMessage, writeFollowUpMessage };