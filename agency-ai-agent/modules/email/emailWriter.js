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
  const priority = lead.priority || (lead.has_website ? 2 : 1);
  const area = lead.area || 'Bangalore';
  const businessName = lead.business_name;
  const pagespeedScore = lead.pagespeed_score || 45; // Default if not found
  const xIssues = lead.issues_found || 5; // Default if not found

  let subject = "";
  let body = "";

  if (priority === 1) {
    // Priority 1 — No Website
    subject = `${businessName} is losing customers to competitors right now`;
    body = `Hi ${businessName} team,

I searched for your restaurant on Google and couldn't find a website for you.

Every day customers search "restaurants in ${area}" on Google and find your competitors instead of you — because they have websites and you don't.

I build websites for restaurants in Bangalore that:
✅ Show up on Google searches
✅ Take online orders directly (no Zomato commission)
✅ Show your menu, photos, and location

I already researched your restaurant and prepared a free growth plan. Can I share it with you?

— Nahid, Naisora
naisora.com`;
  } else if (priority === 2) {
    // Priority 2 — Old/Bad Website
    subject = `Your website is costing you customers, ${businessName}`;
    body = `Hi ${businessName} team,

I checked your website and ran a free audit on it.
It scored ${pagespeedScore}/100 on Google's speed test.

This means:
❌ Customers leave before it loads
❌ Google ranks you lower than competitors
❌ It's not working on mobile phones

I redesign restaurant websites in Bangalore that load fast, look great on mobile, and rank higher on Google.

I've already prepared a free audit report for your site. Want me to send it over?

— Nahid, Naisora
naisora.com`;
  } else {
    // Priority 3 — Weak SEO
    subject = `Your competitors are showing up before you on Google, ${businessName}`;
    body = `Hi ${businessName} team,

I searched "restaurants in ${area}" on Google.
Your competitors are showing up before you.

I checked your website's SEO score — there are ${xIssues} things holding you back from ranking higher.

I help restaurants in Bangalore get to the top of Google searches — more visibility means more customers without paying Zomato commission.

I prepared a free SEO audit for your website. Want me to share it?

— Nahid, Naisora
naisora.com`;
  }

  return {
    subject,
    body,
    lead_id: lead.id
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