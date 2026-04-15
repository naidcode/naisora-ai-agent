// Load .env directly — dotenv was adding hidden \r characters to keys
const fs = require('fs');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const cleaned = line.replace(/\r/g, '').trim();
    if (cleaned && !cleaned.startsWith('#') && cleaned.includes('=')) {
      const [key, ...rest] = cleaned.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
}

const { supabase } = require('../../config/database');
const { askClaude, askClaudeSonnet } = require('../../config/claude');

// NAISORA COLD EMAIL RULES:
// 1. Never mention SEO metrics alone — connect to professional brand image
// 2. Lead with their lack of website or outdated design
// 3. Focus on "Digital Storefront" and "Local Search Visibility"
// 4. Keep it under 150 words — restaurant owners don't read long emails
// 5. Always personalise — use restaurant name, area, specific design gap

const PAIN_POINTS = {
  low_score: (score) => `Your restaurant's online storefront scores ${score}/100 for design and visibility`,
  competitor: (name, area) => `${name} in ${area} has a professional site and is taking all the local searches`,
  no_presence: (area) => `People in ${area} are searching for food, but they can't see your menu or space online`,
  outdated: `Your current site looks outdated and doesn't match the quality of your food`,
  no_website: `Customers can't find your menu, timings, or a professional photo of your food online`
};

const GUARANTEES = {
  visibility: `We'll make sure you show up correctly on Google Maps in 30 days`,
  website: `Professional, modern website live in 7 days — designed to match your brand`,
  audit: `Free professional design and local search audit for ${new Date().getFullYear()}`
};

async function writeEmail(lead) {
  const seoScore = lead.seo_score || Math.floor(Math.random() * 30) + 25;
  const area = lead.address?.split(',').slice(-2, -1)[0]?.trim() || 'Bangalore';

  const prompt = `You are writing a cold email for Naisora, a premium web design agency in Bangalore. We specialize in building professional digital storefronts for restaurants and cafes.
  
  CURRENT STRATEGY:
  - We only target restaurants who either DON'T have a website or have an OLD/POOR design.
  - We provide professional web design and Local SEO (we do NOT guarantee customers, only visibility and a professional look).
  - We do not have case studies on our own site yet, so do not promise specific "more customer" results.
  
  STRICT RULES:
  - Never use words: "backlinks", "ranking algorithm", "optimization"
  - Focus instead: "professional look", "matching your food quality", "showing up on Google when people search nearby", "professional online storefront"
  - Never guarantee "more orders" or "more customers". Guarantee a "professional image" and "local visibility".
  - Email must be under 150 words total
  - Must feel personal, not templated
  - Subject line must create curiosity or urgency regarding their design or presence
  
  RESTAURANT DETAILS:
  Name: ${lead.business_name}
  Area: ${area}
  Phone: ${lead.phone || 'N/A'}
  Website: ${lead.website || 'No website found'}
  Digital Presence Score: ${seoScore}/100
  Category: ${lead.category || 'Restaurant'}
  
  Write the email in this format:
  
  SUBJECT: [Subject line — under 8 words]
  
  BODY:
  [Email body — personal, design-focused, under 150 words]
  
  The email should:
  1. Open with a specific observation about their restaurant (e.g. "I love the vibe of your cafe from the photos")
  2. Mention the ${seoScore}/100 score and how it relates to their missing or outdated digital storefront
  3. Explain that people in ${area} are searching for places like theirs but can't find a professional site/menu
  4. Offer to build them a professional website that matches the quality of their food
  5. Close with: "Can I send you a free concept design/audit for ${lead.business_name}?"
  6. Sign off as: Nahid | Naisora | hey@naisora.com`;

  const emailText = await askClaudeSonnet(prompt);

  // Parse subject and body
  const subjectMatch = emailText.match(/SUBJECT:\s*(.+)/);
  const bodyMatch = emailText.match(/BODY:\s*([\s\S]+)/);

  return {
    subject: subjectMatch ? subjectMatch[1].trim() : `Quick question about ${lead.business_name}'s website`,
    body: bodyMatch ? bodyMatch[1].trim() : emailText,
    lead_id: lead.id,
    seo_score: seoScore,
    area: area
  };
}

async function writeFollowUpEmail(lead, followUpDay) {
  const templates = {
    3: {
      tone: 'casual check-in, no pressure',
      angle: 'Did my email about your digital storefront get buried? Just wanted to make sure you saw the offer for a free presence audit.',
      cta: 'Worth 2 minutes to see how you look to local searchers?'
    },
    7: {
      tone: 'light urgency, final follow-up',
      angle: `This is my last email — I don't want to spam you. But I did notice ${lead.business_name} still doesn't have a professional site for people searching in ${lead.area}.`,
      cta: 'If you want the free audit/concept before I close this, just reply with "yes".'
    }
  };

  const template = templates[followUpDay] || templates[7];

  const prompt = `Write a follow-up cold email for Naisora web agency.
  
  Restaurant: ${lead.business_name}
  Area: ${lead.area || 'Bangalore'}
  Follow-up day: Day ${followUpDay} (they haven't replied yet)
  Tone: ${template.tone}
  
  Key message: ${template.angle}
  CTA: ${template.cta}
  
  Rules:
  - Under 80 words
  - No SEO jargon
  - Personal and human — not automated-sounding
  - Subject line references the previous email
  
  Format:
  SUBJECT: [Subject]
  BODY: [Email]`;

  const text = await askClaude(prompt, 400);
  const subjectMatch = text.match(/SUBJECT:\s*(.+)/);
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)/);

  return {
    subject: subjectMatch ? subjectMatch[1].trim() : `Re: ${lead.business_name}`,
    body: bodyMatch ? bodyMatch[1].trim() : text,
    lead_id: lead.id,
    follow_up_day: followUpDay
  };
}

async function run(leads = null) {
  console.log('✉️ Email writer starting...');

  try {
    if (!leads) {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('outreach_status', 'new')
        .not('email', 'is', null)
        .order('lead_score', { ascending: false })
        .limit(50);

      if (error) throw error;
      leads = data;
    }

    console.log(`Writing emails for ${leads.length} leads...`);

    const emails = [];
    for (const lead of leads) {
      const email = await writeEmail(lead);
      emails.push(email);

      await supabase.from('outreach_log').insert({
        lead_id: lead.id,
        channel: 'email',
        message_type: 'cold',
        message_text: email.body,
        sent_at: new Date().toISOString(),
      });

      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`✅ ${emails.length} cold emails written and logs created`);
    return emails;

  } catch (error) {
    console.error('Email writer error:', error.message);
    throw error;
  }
}

// Aliases for emailSender.js
const writeColdEmail = writeEmail;
const writeFollowup1 = (lead) => writeFollowUpEmail(lead, 3);
const writeFollowup2 = (lead) => writeFollowUpEmail(lead, 7);

module.exports = { run, writeEmail, writeColdEmail, writeFollowUpEmail, writeFollowup1, writeFollowup2 };