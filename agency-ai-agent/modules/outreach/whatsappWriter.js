// modules/outreach/whatsappWriter.js
// Naisora AI Agent — WhatsApp Message Writer
// Uses Sonnet to write personalised WhatsApp cold messages
// RULES: Never say SEO. Never say "digital marketing". Lead with their problem.
// Always: audit score + competitor comparison + result guarantee

const { askClaudeSonnet } = require('../../config/claude');

// ─── System prompt — the most important part ─────────────────────────────────
const WHATSAPP_SYSTEM = `You write cold WhatsApp outreach messages for Naisora, a web design agency in Bangalore that helps restaurants get more customers from Google.

RULES — follow all of these exactly:
1. NEVER say "SEO", "digital marketing", "optimize", "rankings", "keywords"
2. ALWAYS translate to business language: "more customers from Google", "people find you first", "stop paying Zomato commission"
3. Lead with THEIR specific problem — use their name, area, rating, review count
4. Keep it SHORT — max 5-6 sentences for WhatsApp
5. Sound like a real person, not a salesperson
6. ONE clear call to action at the end — "Want me to send you the free audit?"
7. Close with name and agency: — Nahid, Naisora
8. Never use formal greetings like "Dear" or "Greetings"
9. If they have no website — make that the main pain point
10. If they have a website — mention their competitor ranks above them

OUTPUT: Only the WhatsApp message. No subject line. No explanation.`;

// ─── Build context for the message writer ────────────────────────────────────
function buildContext(lead) {
  const noWebsite = !lead.has_website;
  const lowRating = lead.rating && parseFloat(lead.rating) < 3.8;
  const fewReviews = lead.review_count < 50;

  let painPoints = [];
  if (noWebsite) painPoints.push('no website');
  if (lowRating) painPoints.push(`only ${lead.rating} stars on Google`);
  if (fewReviews) painPoints.push(`only ${lead.review_count} Google reviews`);

  return `
Business name: ${lead.business_name}
Area: ${lead.area}, Bangalore
Category: ${lead.category || 'restaurant'}
Has website: ${lead.has_website ? 'Yes — ' + lead.website : 'NO WEBSITE'}
Rating: ${lead.rating || 'unknown'} stars
Reviews: ${lead.review_count || 0} reviews
Lead score: ${lead.lead_score}/100
Main pain points: ${painPoints.join(', ') || 'low online visibility'}
Score reasons: ${lead.score_reasons ? lead.score_reasons.join(', ') : 'needs online presence'}
`;
}

// ─── Write cold WhatsApp message ──────────────────────────────────────────────
async function writeWhatsAppMessage(lead) {
  const context = buildContext(lead);

  const prompt = `Write a WhatsApp cold outreach message for this restaurant owner:

${context}

The message should feel like a local Bangalore agency owner reaching out personally after seeing their restaurant on Google Maps. Reference specific details about their business.`;

  try {
    const message = await askClaudeSonnet(prompt, WHATSAPP_SYSTEM, 300);
    return message.trim();
  } catch (err) {
    console.error('WhatsApp writer error:', err.message);
    // Fallback template if API fails
    return buildFallbackMessage(lead);
  }
}

// ─── Fallback template (if Sonnet fails) ─────────────────────────────────────
function buildFallbackMessage(lead) {
  const noWebsite = !lead.has_website;

  if (noWebsite) {
    return `Hi, I noticed ${lead.business_name} in ${lead.area} doesn't have a website yet. A lot of people search "restaurants near ${lead.area}" on Google and your competitors are showing up — you're not. I help Bangalore restaurants fix this and get direct customers without paying Zomato 30% commission. Want me to send you a free audit showing exactly what's missing? — Nahid, Naisora`;
  }

  return `Hi, I was looking at restaurants in ${lead.area} on Google and noticed ${lead.business_name} is showing up below some of your competitors. I ran a quick check and found a few things that are easy to fix. I help Bangalore restaurants get more customers from Google — completely free audit to start, results in 30 days or I work free. Want me to send it over? — Nahid, Naisora`;
}

// ─── Write follow-up WhatsApp (Day 3) ────────────────────────────────────────
async function writeFollowUpMessage(lead) {
  const prompt = `Write a short WhatsApp follow-up message for a restaurant owner who didn't reply to our first message 3 days ago.

Business: ${lead.business_name}, ${lead.area}
First message was about: ${lead.has_website ? 'improving their Google visibility' : 'building them a website to get Google customers'}

Keep it very short — 2-3 sentences max. Casual, not pushy. Remind them about the free audit offer.`;

  try {
    const message = await askClaudeSonnet(prompt, WHATSAPP_SYSTEM, 150);
    return message.trim();
  } catch (err) {
    return `Hi again — just checking if you had a chance to see my message about ${lead.business_name}. Happy to share the free audit whenever suits you. — Nahid, Naisora`;
  }
}

module.exports = { writeWhatsAppMessage, writeFollowUpMessage };