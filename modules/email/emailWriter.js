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
  const area = lead.area || 'Bangalore';
  const leadType = lead.lead_type || 'unknown';
  const pagespeedScore = lead.pagespeed_score || 0;

  let bodyPrompt = '';
  if (leadType === 'no_website') {
    bodyPrompt = `Write a short cold email to ${lead.business_name} restaurant in ${area}, Bangalore.
They have no website at all.
Pain point: losing customers to competitors who have websites.
Offer: free website audit and growth plan.
Tone: friendly, direct, confident. Not salesy.
Sign off as Nahid from Naisora (naisora.com).
Max 100 words. No subject line needed.`;
  } else if (leadType === 'bad_website') {
    bodyPrompt = `Write a short cold email to ${lead.business_name} restaurant in ${area}, Bangalore.
Their website scored ${pagespeedScore}/100 on Google speed test.
Pain point: slow website losing customers and ranking lower on Google.
Offer: free website audit report already prepared.
Tone: friendly, direct, confident. Not salesy.
Sign off as Nahid from Naisora (naisora.com).
Max 100 words. No subject line needed.`;
  } else if (leadType === 'weak_seo') {
    bodyPrompt = `Write a short cold email to ${lead.business_name} restaurant in ${area}, Bangalore.
Their website has weak SEO — competitors ranking above them on Google.
Pain point: missing customers who search restaurants in ${area} on Google.
Offer: free SEO audit already done.
Tone: friendly, direct, confident. Not salesy.
Sign off as Nahid from Naisora (naisora.com).
Max 100 words. No subject line needed.`;
  } else {
    // If skip or unknown, don't write email
    return null;
  }

  const subjectPrompt = `Write one cold email subject line for ${lead.business_name} restaurant.
Lead type: ${leadType}
Max 8 words. No clickbait. Professional and curiosity-driven.`;

  const [body, subject] = await Promise.all([
    askClaudeSonnet(bodyPrompt),
    askClaudeSonnet(subjectPrompt)
  ]);

  return {
    subject: subject.replace(/"/g, '').trim(),
    body: body.trim(),
    lead_id: lead.id,
    lead_type: leadType
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

// ─── Scraper Check-in (for leads found again) ──────────────────────────────────
async function writeScraperFollowUpEmail(lead) {
  const prompt = `Write a extremely short, friendly check-in email for a restaurant owner.
  
  Business: ${lead.business_name}
  Location: ${lead.area}
  Context: We reached out before about their digital storefront/website. We just saw their listing again while auditing ${lead.area} restaurants.
  
  Rules:
  - Max 3 sentences
  - Mention: "I was just looking at restaurant listings in ${lead.area} again and saw ${lead.business_name}"
  - Reference: "Wanted to check if you got my previous email regarding your digital presence?"
  - Tone: Helpful, not pushy
  - Subject: Re-checking ${lead.business_name} presence
  
  Sign off: Nahid | Naisora`;

  const text = await askClaudeSonnet(prompt);
  const subjectMatch = text.match(/SUBJECT:\s*(.+)/i);
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i);

  return {
    subject: subjectMatch ? subjectMatch[1].trim() : `Still interested in a site for ${lead.business_name}?`,
    body: bodyMatch ? bodyMatch[1].trim() : text,
    lead_id: lead.id
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
      if (!email) {
        console.log(`⏩ Skipping email for ${lead.business_name} (Type: ${lead.lead_type})`);
        continue;
      }
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

module.exports = { run, writeEmail, writeColdEmail, writeFollowUpEmail, writeFollowup1, writeFollowup2, writeScraperFollowUpEmail };