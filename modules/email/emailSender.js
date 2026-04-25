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
  console.log('\n📬 Starting daily email send...');
  console.log('Time:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  
  // Get up to 50 new leads from database
  const leads = await getNewLeads(50);
  
  if (leads.length === 0) {
    console.log('ℹ️  No new leads to email today.');
    return { sent: 0, failed: 0 };
  }

  console.log(`📋 Found ${leads.length} new leads to email\n`);

  let sent = 0;
  let failed = 0;

  for (const lead of leads) {
    if (!lead.email) {
      console.log(`⚠️  Skipping ${lead.business_name} (no email)`);
      continue;
    }
    try {
      console.log(`\n✍️  Writing email for: ${lead.business_name}...`);
      
      // Step 1: Use Claude to write a personalized email
      const email = await writeColdEmail(lead);
      
      console.log(`📧 Subject: ${email.subject}`);
      console.log(`📤 Sending to: ${lead.email}...`);
      
      // Step 2: Send the email via Gmail API
      await sendEmail(lead.email, email.subject, email.body);
      
      // Step 3: Update status in database
      await updateLeadStatus(lead.id, STATUS.CONTACTED, {
        email_subject: email.subject,
      });
      
      // Step 4: Log to outreach_log
      await logOutreach(lead.id, 'email', 'cold', email.body, {
        subject: email.subject
      });
      
      sent++;
      console.log(`✅ Sent! (${sent}/${leads.length})`);

      // Wait 2-5 minutes between emails
      // This makes it look human — not automated
      // IMPORTANT: Don't remove this delay!
      if (sent < leads.length) {
        const waitTime = randomDelay(2, 5);
        console.log(`⏳ Waiting ${waitTime} seconds before next email...`);
        await sleep(waitTime * 1000);
      }

    } catch (error) {
      failed++;
      console.error(`❌ Error processing lead ${lead.email}:`, error.message);
    }
  }

  // Print final summary
  // 1. Get stats
  const today = new Date().toLocaleDateString();
  const noWebsiteLeads = leads.filter(l => l.lead_type === 'no_website').length;
  const badWebsiteLeads = leads.filter(l => l.lead_type === 'bad_website').length;
  const weakSeoLeads = leads.filter(l => l.lead_type === 'weak_seo').length;

  const hotLeadsEmailed = leads.filter(l => l.lead_category === 'hot' && sent > 0)
    .map(l => `- ${l.business_name} (${l.area}) — ${l.lead_type}`).join('\n');

  const { sendMessage } = require('../../config/telegram');
  await sendMessage(
    `📧 *Email Outreach Report — ${today}*\n\n` +
    `✅ Emails sent: ${sent}\n` +
    `❌ Failed: ${failed}\n` +
    `🔄 Follow ups sent: 0\n\n` + // Follow ups handled by followUpEngine
    `*Breakdown:*\n` +
    `🔴 No website leads: ${noWebsiteLeads} emails\n` +
    `🟡 Bad website leads: ${badWebsiteLeads} emails\n` +
    `🟢 Weak SEO leads: ${weakSeoLeads} emails\n\n` +
    `*Hot leads emailed today:*\n${hotLeadsEmailed || 'None'}`
  );

  return { sent, failed };
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
      const email = await writeFollowup1(lead);
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
      const email = await writeFollowup2(lead);
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
    const email = await writeScraperFollowUpEmail(lead);
    
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
