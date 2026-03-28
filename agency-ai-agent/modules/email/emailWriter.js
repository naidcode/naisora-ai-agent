// ============================================
// modules/email/emailWriter.js
// Uses Claude AI to write personalized cold emails
// Every email is unique — not a template
// ============================================

const { askClaude } = require('../../config/claude');
require('dotenv').config();

// ============================================
// WRITE A COLD EMAIL FOR A SPECIFIC LEAD
// This is the heart of your outreach system
// ============================================
async function writeColdEmail(lead) {
  // Build the prompt for Claude
  // The more context you give, the better the email
  const prompt = `
You are writing a cold email for ${process.env.YOUR_NAME}, owner of ${process.env.YOUR_AGENCY_NAME}, 
a web design agency based in ${process.env.YOUR_CITY}, India.

Write a SHORT, friendly, personalized cold email to this business owner:

Business Name: ${lead.business_name}
Owner/Contact Name: ${lead.name}
Business Type: ${lead.business_type}
City: ${lead.city}
Current Website: ${lead.website || 'None — they have no website'}

RULES FOR THE EMAIL:
1. Subject line must be short and curiosity-driven (not salesy)
2. Opening must mention their specific business by name
3. Point out the problem (no website = losing customers)
4. Mention ONE specific benefit relevant to their business type
5. Include a soft CTA — just ask if they're interested, don't be pushy
6. Keep total email under 120 words
7. Sound like a real person, not a marketing robot
8. End with: "${process.env.YOUR_NAME} | ${process.env.YOUR_AGENCY_NAME} | ${process.env.YOUR_PORTFOLIO_URL}"
9. Do NOT use phrases like "I hope this email finds you well" or "I am reaching out to"

Business type specific tips:
- Clinic/Hospital: mention patients finding them on Google
- Restaurant: mention online menus, food delivery, reservations  
- Retail shop: mention online store, more customers
- Salon/Spa: mention online booking, Instagram presence
- Other: mention general — customers searching Google

Return your response in EXACTLY this format:
SUBJECT: [subject line here]
---
[email body here]
  `.trim();

  const response = await askClaude(prompt, 600);
  
  // Parse the response into subject and body
  const lines = response.split('\n');
  const subjectLine = lines.find(l => l.startsWith('SUBJECT:'));
  const subject = subjectLine ? subjectLine.replace('SUBJECT:', '').trim() : `Quick question about ${lead.business_name}`;
  
  // Everything after the --- separator is the body
  const separatorIndex = response.indexOf('---');
  const body = separatorIndex > -1 
    ? response.substring(separatorIndex + 3).trim()
    : response.replace(subjectLine, '').trim();

  return { subject, body };
}

// ============================================
// WRITE A DAY 3 FOLLOW-UP EMAIL
// Friendly nudge — different angle from first email
// ============================================
async function writeFollowup1(lead) {
  const prompt = `
Write a very short Day 3 follow-up email. The recipient is ${lead.name} from ${lead.business_name}.
They did not reply to our first email about building them a website.

Rules:
1. Reference that we emailed before (briefly)
2. New angle — mention a competitor in their industry having a great website
3. Very short — under 60 words
4. Casual tone, not desperate
5. One soft question at the end
6. Sign off as: ${process.env.YOUR_NAME}, ${process.env.YOUR_AGENCY_NAME}

Return format:
SUBJECT: [subject]
---
[body]
  `.trim();

  const response = await askClaude(prompt, 400);
  return parseEmailResponse(response, `Following up — ${lead.business_name}`);
}

// ============================================
// WRITE A DAY 7 FOLLOW-UP EMAIL  
// Final attempt — creates mild urgency
// ============================================
async function writeFollowup2(lead) {
  const prompt = `
Write a final Day 7 follow-up email for ${lead.name} at ${lead.business_name}.
This is our last attempt — keep it very short and human.

Rules:
1. Mention this is our last email (no pressure)
2. Leave door open — "reach out anytime"
3. Under 50 words
4. Genuinely friendly, zero desperation
5. Sign off as: ${process.env.YOUR_NAME}, ${process.env.YOUR_AGENCY_NAME}

Return format:
SUBJECT: [subject]
---
[body]
  `.trim();

  const response = await askClaude(prompt, 300);
  return parseEmailResponse(response, `Last note — ${lead.business_name}`);
}

// ============================================
// CLASSIFY A REPLY — What does it mean?
// Returns: interested / question / not_interested / other
// ============================================
async function classifyReply(replyText, leadName) {
  const prompt = `
Read this email reply from ${leadName} and classify their intent.

Reply:
"${replyText}"

Classify as ONE of these:
- "interested" — they want to discuss, asked for pricing, want to proceed
- "question" — they asked a specific question (price, timeline, process)
- "not_interested" — they said no, not needed, already have someone
- "other" — unclear, out of office, irrelevant

Reply with ONLY the classification word. Nothing else.
  `.trim();

  const classification = await askClaude(prompt, 10);
  return classification.trim().toLowerCase();
}

// ============================================
// WRITE AN AUTO-REPLY based on intent
// ============================================
async function writeAutoReply(lead, replyText, intent) {
  let prompt = '';

  if (intent === 'interested') {
    prompt = `
Write a warm, excited but professional reply to ${lead.name} from ${lead.business_name}.
They are interested in getting a website built.

Their message: "${replyText}"

In the reply:
1. Show excitement (but stay professional)
2. Suggest a quick 15-minute discovery call
3. Mention your portfolio: ${process.env.YOUR_PORTFOLIO_URL}
4. Give your phone number: ${process.env.YOUR_PHONE}
5. Ask for their availability this week
6. Keep under 100 words
7. Sign: ${process.env.YOUR_NAME}, ${process.env.YOUR_AGENCY_NAME}
    `.trim();

  } else if (intent === 'question') {
    prompt = `
Write a helpful reply to ${lead.name} from ${lead.business_name}.
They asked a question about web design services.

Their question: "${replyText}"

Answer their question briefly and:
1. Give them a ballpark answer
2. Mention that exact price depends on their requirements
3. Suggest a quick call to discuss: ${process.env.YOUR_PHONE}
4. Keep under 100 words
5. Sign: ${process.env.YOUR_NAME}, ${process.env.YOUR_AGENCY_NAME}

General pricing info to use if asked:
- Basic website: ₹5,000 - ₹8,000
- Business website: ₹8,000 - ₹15,000
- E-commerce: ₹15,000 - ₹30,000
- Timeline: 1-3 weeks typically
    `.trim();
  }

  if (!prompt) return null;

  const body = await askClaude(prompt, 400);
  return body;
}

// ============================================
// HELPER: Parse Claude's email response
// ============================================
function parseEmailResponse(response, defaultSubject) {
  const lines = response.split('\n');
  const subjectLine = lines.find(l => l.startsWith('SUBJECT:'));
  const subject = subjectLine 
    ? subjectLine.replace('SUBJECT:', '').trim() 
    : defaultSubject;
  
  const separatorIndex = response.indexOf('---');
  const body = separatorIndex > -1 
    ? response.substring(separatorIndex + 3).trim()
    : response.replace(subjectLine || '', '').trim();

  return { subject, body };
}

// ============================================
// TEST — Write a sample cold email
// ============================================
async function testEmailWriter() {
  console.log('✍️  Testing Claude email writer...\n');
  
  const testLead = {
    name: 'Raj Kumar',
    business_name: 'Raj Medical Clinic',
    business_type: 'clinic',
    city: 'Mumbai',
    website: null,
  };

  const email = await writeColdEmail(testLead);
  
  console.log('📧 SUBJECT:', email.subject);
  console.log('─'.repeat(50));
  console.log(email.body);
  console.log('─'.repeat(50));
  console.log('✅ Email writer working!');
}

module.exports = {
  writeColdEmail,
  writeFollowup1,
  writeFollowup2,
  classifyReply,
  writeAutoReply,
  testEmailWriter,
};
