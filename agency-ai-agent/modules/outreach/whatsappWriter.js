// modules/outreach/whatsappWriter.js
// Naisora AI Growth OS — WhatsApp Message Writer (A/B Variant Aware)
// Variant A: Lead with PROBLEM (what they're losing)
// Variant B: Lead with PROOF (what we've achieved for similar businesses)

const { askClaudeSonnet } = require('../../config/claude');
const { supabase } = require('../../config/database');

// ─── Load the currently winning variant from system_config ────────────────────
async function getActiveVariant() {
  try {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'active_outreach_variant')
      .single();
    return data?.value || 'A';
  } catch {
    return 'A'; // safe default
  }
}

// ─── System prompt — the most important part ─────────────────────────────────
const WHATSAPP_SYSTEM = `You write hyper-personalized, high-conversion WhatsApp outreach messages for Naisora, a premium Bangalore web design agency. Your goal is to get restaurant owners to say "YES" to a free design audit or website concept.

STRATEGY:
- Target restaurants without a website or with a poor/old design.
- Offer: Professional Web Design + Local SEO visibility.
- DO NOT guarantee customers or orders (only visibility and professional look).
- DO NOT use case studies/results we haven't achieved yet.

RULES — follow all of these strictly:
1. NEVER use corporate jargon like "ROI", "SEO", "optimization", or "digital marketing".
2. TALK like a local expert: Use phrases like "professional look", "found on Google Maps", "proper digital storefront in [Area]".
3. LEVERAGE LOSS AVERSION: Explain how they look to people searching right now (e.g., "People are searching for places in [Area], but your online storefront doesn't match your quality").
4. BE PITHY: 3-5 short sentences.
5. NO SALES VOX: Sound like a helpful neighbor who is a design expert.
6. TARGETED PAIN: 
   - No website? -> "You're invisible to people searching for food in [Area] right now."
   - Bad design? -> "Your food is great but your site doesn't reflect that quality yet."
7. CTA: End with a low-friction question: "Should I send over a free website concept/audit?"
8. CLOSING: "— Nahid, Naisora"

OUTPUT: Only the WhatsApp message text. No subject lines, no intro, no emojis (unless it's a single 📱).`;

// ─── Build context for the message writer ────────────────────────────────────
function buildContext(lead) {
  const noWebsite = !lead.has_website;
  const lowRating = lead.rating && parseFloat(lead.rating) < 3.8;
  const fewReviews = lead.review_count < 50;

  let painPoints = [];
  if (noWebsite) painPoints.push('no website (invisible online)');
  if (!noWebsite) painPoints.push('outdated/basic website design');
  if (lowRating) painPoints.push(`only ${lead.rating} stars on Google`);
  if (fewReviews) painPoints.push(`low review count`);

  return `
Business name: ${lead.business_name}
Area: ${lead.area}, Bangalore
Category: ${lead.category || 'restaurant'}
Has website: ${lead.has_website ? 'Yes — ' + lead.website : 'NO WEBSITE'}
Rating: ${lead.rating || 'unknown'} stars
Reviews: ${lead.review_count || 0} reviews
Main pain points: ${painPoints.join(', ')}
`;
}

// ─── Write cold WhatsApp message (A/B Variant Aware) ─────────────────────────
async function writeWhatsAppMessage(lead) {
  const context = buildContext(lead);
  const variant = await getActiveVariant();

  // Variant A: Lead with DESIGN/PROFESSIONALISM gap
  // Variant B: Lead with LOCAL SEARCH visibility
  const variantInstruction = variant === 'B'
    ? `Focus on LOCAL SEARCH: People in ${lead.area} are searching for ${lead.category || 'food'} right now, but they can't see a professional site for them. Mention being found on Maps.`
    : `Focus on DESIGN QUALITY: Their current presence (or lack thereof) doesn't match the quality of their food. Talk about a "Professional Digital Storefront".`;

  const prompt = `Write a WhatsApp cold outreach message for this restaurant owner:

${context}

APPROACH FOR THIS MESSAGE:
${variantInstruction}

The message should feel like a local Bangalore agency owner reaching out personally. Max 5 sentences.`;

  try {
    const message = await askClaudeSonnet(prompt, WHATSAPP_SYSTEM, 300);
    return { message: message.trim(), variant };
  } catch (err) {
    console.error('WhatsApp writer error:', err.message);
    return { message: buildFallbackMessage(lead), variant };
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

module.exports = { writeWhatsAppMessage, writeFollowUpMessage, getActiveVariant };