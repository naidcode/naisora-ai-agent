// ============================================
// modules/email/emailSender.js
// Sends cold emails to leads from the database
// Has rate limiting — max 50/day, random delays
// This protects your Gmail from being flagged
// ============================================

const { sendEmail } = require('../../config/gmail');
const { writeColdEmail } = require('./emailWriter');
const { getNewLeads, updateLeadStatus, STATUS } = require('../../config/database');
require('dotenv').config();

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
    try {
      console.log(`\n✍️  Writing email for: ${lead.business_name}...`);
      
      // Step 1: Use Claude to write a personalized email
      const email = await writeColdEmail(lead);
      
      console.log(`📧 Subject: ${email.subject}`);
      console.log(`📤 Sending to: ${lead.email}...`);
      
      // Step 2: Send the email via Gmail API
      const result = await sendEmail(lead.email, email.subject, email.body);
      
      if (result.success) {
        // Step 3: Update status in database
        await updateLeadStatus(lead.id, STATUS.CONTACTED, {
          email_subject: email.subject,
        });
        
        sent++;
        console.log(`✅ Sent! (${sent}/${leads.length})`);
        
      } else {
        failed++;
        console.log(`❌ Failed to send to ${lead.email}`);
      }

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
  console.log('\n' + '═'.repeat(40));
  console.log('📊 EMAIL SESSION COMPLETE');
  console.log(`✅ Sent:   ${sent}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📋 Total:  ${leads.length}`);
  console.log('═'.repeat(40) + '\n');

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
      const result = await sendEmail(lead.email, email.subject, email.body);
      
      if (result.success) {
        await updateLeadStatus(lead.id, STATUS.FOLLOWUP_1);
        console.log(`✅ Follow-up 1 sent to ${lead.business_name}`);
      }
      
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
      const result = await sendEmail(lead.email, email.subject, email.body);
      
      if (result.success) {
        await updateLeadStatus(lead.id, STATUS.FOLLOWUP_2);
        console.log(`✅ Final follow-up sent to ${lead.business_name}`);
      }
      
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
  const result = await sendEmail(testLead.email, '[TEST] ' + email.subject, email.body);
  
  if (result.success) {
    console.log('\n🎉 SUCCESS! Check your inbox for the test email.');
    console.log('If it looks good, your email system is ready!');
  } else {
    console.log('\n❌ Send failed. Check your Gmail API credentials in .env');
  }
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

module.exports = {
  sendDailyColdEmails,
  sendFollowupEmails1,
  sendFollowupEmails2,
  testSend,
};
