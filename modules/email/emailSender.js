// ============================================
// modules/email/emailSender.js
// Sends cold emails to leads from the database
// Has rate limiting — max 50/day, random delays
// This protects your Gmail from being flagged
// ============================================

const { sendEmail } = require('../../config/smtp');
const { writeColdEmail } = require('./emailWriter');
const { getNewLeads, updateLeadStatus, logOutreach, STATUS } = require('../../config/database');
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

// ============================================
// MAIN FUNCTION: Send emails to all new leads
// Call this every morning at 10 AM
// ============================================
async function sendDailyColdEmails() {
  const TARGET_MINIMUM = 50;
  console.log('\n📬 Starting daily email send...');
  console.log('Time:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  
  // 1. Get new leads
  let leads = await getNewLeads(TARGET_MINIMUM);
  let followUpsUsed = 0;

  // 2. If not enough new leads, pull from existing leads not contacted in 7+ days
  if (leads.length < TARGET_MINIMUM) {
    const gap = TARGET_MINIMUM - leads.length;
    console.log(`ℹ️  Only ${leads.length} new leads found. Pulling ${gap} follow-ups to hit target...`);
    const { getLeadsForFollowupGeneric } = require('../../config/database');
    const oldLeads = await getLeadsForFollowupGeneric('email', gap);
    leads = [...leads, ...oldLeads];
    followUpsUsed = oldLeads.length;
  }

  if (leads.length === 0) {
    console.log('ℹ️  No leads available for email today.');
    return { sent: 0, failed: 0, gap_filled: 0 };
  }

  console.log(`📋 Total leads for today: ${leads.length}\n`);

  let sent = 0;
  let failed = 0;
  let skippedNoEmail = 0;

  for (const lead of leads) {
    let emailAddress = lead.email;

    // Fix 4: Fallback - try to find email if missing
    if (!emailAddress && lead.website) {
      console.log(`🔍 No email for ${lead.business_name}, trying to find from website: ${lead.website}...`);
      emailAddress = await findEmailOnWebsite(lead.website);
      if (emailAddress) {
        console.log(`✅ Found email: ${emailAddress}`);
        // Update lead in DB so we don't have to scrape again
        await updateLeadStatus(lead.id, lead.outreach_status, { email: emailAddress });
      }
    }

    if (!emailAddress) {
      console.log(`⚠️  Skipping ${lead.business_name} (no email found after search)`);
      skippedNoEmail++;
      continue;
    }

    try {
      console.log(`\n✍️  Writing email for: ${lead.business_name}...`);
      
      let email = await writeColdEmail(lead);
      
      // Fix 4: Null check for email object
      if (!email || !email.subject || !email.body) {
        console.log(`⚠️ AI failed to write email for ${lead.business_name}. Using default template.`);
        email = {
          subject: `Question about ${lead.business_name}`,
          body: `Hi,\n\nI noticed ${lead.business_name} in ${lead.area} doesn't have a modern website yet. We're helping restaurants in Bangalore get more direct orders through better websites and SEO.\n\nWould you be open to a quick 10-minute chat about how we can help you grow?\n\nBest,\nNahid from Naisora`
        };
      }
      
      console.log(`📧 Subject: ${email.subject}`);
      console.log(`📤 Sending to: ${emailAddress}...`);
      
      await sendEmail(emailAddress, email.subject, email.body);
      
      await updateLeadStatus(lead.id, STATUS.CONTACTED, {
        email_subject: email.subject,
      });
      
      await logOutreach(lead.id, 'email', 'cold', email.body, {
        subject: email.subject
      });
      
      sent++;
      console.log(`✅ Sent! (${sent}/${leads.length})`);

      if (sent < leads.length) {
        const waitTime = randomDelay(2, 5);
        console.log(`⏳ Waiting ${waitTime} seconds before next email...`);
        await sleep(waitTime * 1000);
      }

    } catch (error) {
      failed++;
      console.error(`❌ Error processing lead ${lead.business_name} (${emailAddress}):`, error.message);
      
      const { sendMessage } = require('../../config/telegram');
      await sendMessage(
        `❌ *Email failed for ${lead.business_name}*\n` +
        `Reason: ${error.message || 'SMTP error'}\n` +
        `Email: ${emailAddress || 'N/A'}`
      );
    }
  }

  // Print final summary
  const today = new Date().toLocaleDateString();
  const noWebsiteLeads = leads.filter(l => l.lead_type === 'no_website').length;
  const badWebsiteLeads = leads.filter(l => l.lead_type === 'bad_website').length;
  const weakSeoLeads = leads.filter(l => l.lead_type === 'weak_seo').length;

  const hotLeadsEmailed = leads.filter(l => l.lead_category === 'hot' && sent > 0)
    .map(l => `- ${l.business_name} (${l.area})`).join('\n');

  const { sendMessage } = require('../../config/telegram');
  await sendMessage(
    `📧 *Email Outreach Report — ${today}*\n\n` +
    `Target: ${TARGET_MINIMUM} | Sent: ${sent} | ${sent >= TARGET_MINIMUM ? '✅' : '❌'}\n` +
    `❌ Failed: ${failed}\n` +
    `⏭️ Skipped (No Email): ${skippedNoEmail}\n` +
    `🔄 Gap filled by follow-ups: ${followUpsUsed}\n\n` +
    `*Breakdown:*\n` +
    `🔴 No website leads: ${noWebsiteLeads}\n` +
    `🟡 Bad website leads: ${badWebsiteLeads}\n` +
    `🟢 Weak SEO leads: ${weakSeoLeads}\n\n` +
    `*Hot leads emailed today:*\n${hotLeadsEmailed || 'None'}`
  );

  return { sent, failed, gap_filled: followUpsUsed };
}

async function findEmailOnWebsite(url) {
  const { launchBrowser } = require('../../config/puppeteer');
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const content = await page.content();
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = content.match(emailRegex);
    
    if (matches && matches.length > 0) {
      // Filter out common false positives or image extensions
      return matches.find(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.jpeg') && !e.endsWith('.webp'));
    }
  } catch (err) {
    console.error(`   ❌ Failed to scrape email from ${url}:`, err.message);
  } finally {
    if (browser) await browser.close();
  }
  return null;
}

// ============================================
// SEND FOLLOW-UP EMAILS (Day 3)
// ============================================
async function sendFollowupEmails1() {
  const { getLeadsForFollowup1 } = require('../../config/database');
  const { writeFollowup1 } = require('./emailWriter');
  
  console.log('\n🔁 Sending Day 3 follow-ups...');
  
  const leads = await getLeadsForFollowup1();
  
  if (leads.length === 0) {
    console.log('ℹ️  No Day 3 follow-ups needed today.');
    return;
  }

  console.log(`📋 ${leads.length} leads need Day 3 follow-up`);

  for (const lead of leads) {
    try {
      let email = await writeFollowup1(lead);
      if (!email || !email.subject || !email.body) {
        email = {
          subject: `Re: Question about ${lead.business_name}`,
          body: `Hi,\n\nJust following up on my previous email. Did you get a chance to see how we could help ${lead.business_name} with a better website?\n\nBest,\nNahid`
        };
      }
      await sendEmail(lead.email, email.subject, email.body);
      
      await updateLeadStatus(lead.id, STATUS.FOLLOWUP_1);
      await logOutreach(lead.id, 'email', 'followup_1', email.body, {
        subject: email.subject
      });
      console.log(`✅ Follow-up 1 sent to ${lead.business_name}`);
      
      await sleep(randomDelay(3, 7) * 1000);
      
    } catch (error) {
      console.error(`❌ Follow-up 1 failed for ${lead.email}:`, error.message);
    }
  }
}

// ============================================
// SEND FOLLOW-UP EMAILS (Day 7 — Final)
// ============================================
async function sendFollowupEmails2() {
  const { getLeadsForFollowup2 } = require('../../config/database');
  const { writeFollowup2 } = require('./emailWriter');
  
  console.log('\n🔁 Sending Day 7 final follow-ups...');
  
  const leads = await getLeadsForFollowup2();
  
  if (leads.length === 0) {
    console.log('ℹ️  No Day 7 follow-ups needed today.');
    return;
  }

  for (const lead of leads) {
    try {
      let email = await writeFollowup2(lead);
      if (!email || !email.subject || !email.body) {
        email = {
          subject: `Final follow up: ${lead.business_name}`,
          body: `Hi,\n\nI haven't heard back, so I'll assume you're not interested right now. No worries! If you ever need help with your website or SEO, feel free to reach out.\n\nBest,\nNahid`
        };
      }
      await sendEmail(lead.email, email.subject, email.body);
      
      await updateLeadStatus(lead.id, STATUS.FOLLOWUP_2);
      await logOutreach(lead.id, 'email', 'followup_2', email.body, {
        subject: email.subject
      });
      console.log(`✅ Final follow-up sent to ${lead.business_name}`);
      
      await sleep(randomDelay(3, 7) * 1000);
      
    } catch (error) {
      console.error(`❌ Follow-up 2 failed for ${lead.email}:`, error.message);
    }
  }
}

// ============================================
// TEST: Send ONE test email to yourself
// Run this first before sending to real leads
// ============================================
async function testSend() {
  console.log('\n🧪 RUNNING TEST EMAIL SEND');
  console.log('This sends a test email to YOURSELF\n');
  
  const testLead = {
    id: 'test-001',
    name: 'Test Owner',
    email: process.env.YOUR_EMAIL,   // sends to YOUR own email
    business_name: 'Test Business (This is a test)',
    business_type: 'restaurant',
    city: process.env.YOUR_CITY,
    website: null,
  };

  console.log('✍️  Writing email with Claude...');
  const email = await writeColdEmail(testLead);
  
  console.log('\n📧 PREVIEW:');
  console.log('Subject:', email.subject);
  console.log('─'.repeat(50));
  console.log(email.body);
  console.log('─'.repeat(50));
  
  console.log('\n📤 Sending to your own email...');
  await sendEmail(testLead.email, '[TEST] ' + email.subject, email.body);
  
  console.log('\n🎉 SUCCESS! Check your inbox for the test email.');
  console.log('If it looks good, your email system is ready!');
}

async function sendScraperFollowUpEmail(lead) {
  const { writeScraperFollowUpEmail } = require('./emailWriter');
  
  try {
    console.log(`\n🔄 Writing auto follow-up for: ${lead.business_name}...`);
    let email = await writeScraperFollowUpEmail(lead);
    if (!email || !email.subject || !email.body) {
      email = {
        subject: `I found ${lead.business_name} on Google Maps`,
        body: `Hi,\n\nI was looking at restaurants in ${lead.area} and found ${lead.business_name}. I noticed you don't have a website listed. We specialize in building sites for Bangalore restaurants.\n\nInterested in a free audit?\n\nBest,\nNahid`
      };
    }
    
    console.log(`📧 Subject: ${email.subject}`);
    await sendEmail(lead.email, email.subject, email.body);
    
    await updateLeadStatus(lead.id, 'follow_up_sent');
    await logOutreach(lead.id, 'email', 'auto_followup', email.body, {
      subject: email.subject
    });
    console.log(`✅ Auto follow-up sent!`);
    return true;
  } catch (error) {
    console.error(`❌ Auto follow-up failed for ${lead.email}:`, error.message);
  }
  return false;
}

// ============================================
// HELPERS
// ============================================

// Random delay between min and max seconds
function randomDelay(minSeconds, maxSeconds) {
  return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
}

// Sleep for milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (require.main === module) {
  sendDailyColdEmails().catch(err => {
    console.error('❌ Fatal error in email sender:', err.message);
    process.exit(1);
  });
}

module.exports = {
  sendDailyColdEmails,
  sendFollowupEmails1,
  sendFollowupEmails2,
  sendScraperFollowUpEmail,
  testSend,
};
