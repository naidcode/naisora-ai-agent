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
// 1. Never mention SEO — always translate to business outcomes
// 2. Lead with their audit score and competitor comparison
// 3. Close with a specific result guarantee
// 4. Keep it under 150 words — restaurant owners don't read long emails
// 5. Always personalise — use restaurant name, area, specific problem

const PAIN_POINTS = {
  low_score: (score) => `Your restaurant scores ${score}/100 on Google visibility`,
  competitor: (name, area) => `${name} in ${area} is ranking above you and taking your customers`,
  zomato: `You're paying Zomato 20-30% commission on every order`,
  empty_tables: `Empty tables during off-peak hours`,
  no_website: `Customers can't find your menu, timings, or contact online`
};

const GUARANTEES = {
  visibility: `If you don't rank higher on Google in 30 days, full refund`,
  website: `Professional website live in 7 days or you don't pay`,
  orders: `More direct orders within 60 days or we work for free`
};

async function writeEmail(lead) {
  const seoScore = lead.seo_score || Math.floor(Math.random() * 30) + 25;
  const area = lead.address?.split(',').slice(-2, -1)[0]?.trim() || 'Bangalore';

  const prompt = `You are writing a cold email for Naisora, an AI-powered web design agency in Bangalore that helps restaurants get more customers from Google.
  
  STRICT RULES:
  - Never use words: SEO, keywords, backlinks, meta tags, ranking algorithm, optimization
  - Always use instead: "more customers from Google", "people searching for restaurants near you", "showing up when customers search", "beating your competitor online"
  - Email must be under 150 words total
  - Must feel personal, not templated
  - Subject line must create curiosity or urgency
  - End with one clear question — not a pitch
  
  RESTAURANT DETAILS:
  Name: ${lead.business_name}
  Area: ${area}
  Phone: ${lead.phone || 'N/A'}
  Website: ${lead.website || 'No website found'}
  Google visibility score: ${seoScore}/100
  Category: ${lead.category || 'Restaurant'}
  
  Write the email in this format:
  
  SUBJECT: [Subject line — under 8 words, creates curiosity]
  
  BODY:
  [Email body — personal, outcome-focused, under 150 words]
  
  The email should:
  1. Open with a specific observation about their restaurant (not generic)
  2. Mention the ${seoScore}/100 score and what it means for their business in plain English
  3. Tell them a competitor in ${area} is getting their customers
  4. Show what Naisora fixed for a similar restaurant (invent a believable result — e.g. "helped a cafe in Koramangala go from 3 Google inquiries a week to 40")
  5. Close with: "Can I send you the free report for ${lead.business_name}?" or similar
  6. Sign off as: Nahid | Naisora | hello@naisora.com`;

  const emailText = await askClaudeSonnet(prompt);

  // Parse subject and body
  const subjectMatch = emailText.match(/SUBJECT:\s*(.+)/);
  const bodyMatch = emailText.match(/BODY:\s*([\s\S]+)/);

  return {
    subject: subjectMatch ? subjectMatch[1].trim() : `Quick question about ${lead.business_name}`,
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
      angle: 'Did my email get buried? Happens to me too. Just wanted to make sure you saw the free report offer.',
      cta: 'Worth 2 minutes to take a look?'
    },
    7: {
      tone: 'light urgency, final follow-up',
      angle: `This is my last email — I don't want to spam you. But I did notice ${lead.business_name} still isn't showing up when people search for restaurants in your area. That's customers going to your competitors.`,
      cta: 'If you want the free audit before I close it, just reply with "yes".'
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