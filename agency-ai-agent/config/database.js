// ============================================
// config/database.js
// This file connects to Supabase (your database)
// All leads, clients, and statuses are stored here
// ============================================

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Connect to your Supabase project
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ============================================
// LEAD STATUS VALUES
// Every lead in your database has one of these
// ============================================
const STATUS = {
  NEW: 'new',                     // Just scraped, not contacted yet
  CONTACTED: 'contacted',         // First email sent
  FOLLOWUP_1: 'followup_1',       // Day 3 follow-up sent
  FOLLOWUP_2: 'followup_2',       // Day 7 follow-up sent
  REPLIED: 'replied',             // They replied to us
  INTERESTED: 'interested',       // 🔥 HOT LEAD — they want to talk
  NOT_INTERESTED: 'not_interested', // They said no
  CLIENT: 'client',               // Deal closed, they're a client now
};

// ============================================
// DATABASE FUNCTIONS
// ============================================

// --- Save a new lead to the database ---
async function saveLead(leadData) {
  const { data, error } = await supabase
    .from('leads')
    .insert([{
      name: leadData.name,
      email: leadData.email,
      business_name: leadData.businessName,
      business_type: leadData.businessType,    // clinic, restaurant, etc.
      phone: leadData.phone || null,
      website: leadData.website || null,       // their current (bad) website
      city: leadData.city,
      source: leadData.source || 'google_maps', // where we found them
      status: STATUS.NEW,
      created_at: new Date().toISOString(),
    }]);

  if (error) {
    // If lead already exists (duplicate email), skip silently
    if (error.code === '23505') {
      console.log(`⚠️  Lead already exists: ${leadData.email}`);
      return null;
    }
    throw error;
  }

  console.log(`✅ Lead saved: ${leadData.businessName} — ${leadData.email}`);
  return data;
}

// --- Get all new leads that haven't been emailed yet ---
async function getNewLeads(limit = 50) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('status', STATUS.NEW)
    .limit(limit)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// --- Get leads that need a Day 3 follow-up ---
// (contacted 3+ days ago, no reply, no followup sent yet)
async function getLeadsForFollowup1() {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('status', STATUS.CONTACTED)
    .lt('last_contacted_at', threeDaysAgo.toISOString());

  if (error) throw error;
  return data || [];
}

// --- Get leads that need a Day 7 follow-up ---
async function getLeadsForFollowup2() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('status', STATUS.FOLLOWUP_1)
    .lt('last_contacted_at', sevenDaysAgo.toISOString());

  if (error) throw error;
  return data || [];
}

// --- Update a lead's status ---
async function updateLeadStatus(leadId, newStatus, extraData = {}) {
  const { error } = await supabase
    .from('leads')
    .update({
      status: newStatus,
      last_contacted_at: new Date().toISOString(),
      ...extraData
    })
    .eq('id', leadId);

  if (error) throw error;
  console.log(`📝 Lead ${leadId} status → ${newStatus}`);
}

// --- Mark a lead as interested (HOT LEAD!) ---
async function markAsInterested(leadId, replyContent) {
  await updateLeadStatus(leadId, STATUS.INTERESTED, {
    reply_content: replyContent,
    interested_at: new Date().toISOString(),
  });
  console.log(`🔥 HOT LEAD detected! Lead ID: ${leadId}`);
}

// --- Get weekly report numbers ---
async function getWeeklyStats() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekAgoISO = oneWeekAgo.toISOString();

  // Count leads found this week
  const { count: newLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgoISO);

  // Count emails sent this week
  const { count: emailsSent } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .gte('last_contacted_at', weekAgoISO)
    .neq('status', STATUS.NEW);

  // Count replies received
  const { count: replies } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .gte('last_contacted_at', weekAgoISO)
    .in('status', [STATUS.REPLIED, STATUS.INTERESTED]);

  // Count hot leads
  const { count: hotLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', STATUS.INTERESTED);

  return { newLeads, emailsSent, replies, hotLeads };
}

// --- Test database connection ---
async function testConnection() {
  console.log('🗃️  Testing Supabase connection...');
  
  const { data, error } = await supabase
    .from('leads')
    .select('count')
    .limit(1);

  if (error) {
    console.error('❌ Database error:', error.message);
    console.log('👉 Make sure you ran the schema.sql in your Supabase dashboard');
    return false;
  }

  console.log('✅ Supabase connected successfully!');
  return true;
}

module.exports = {
  supabase,
  STATUS,
  saveLead,
  getNewLeads,
  getLeadsForFollowup1,
  getLeadsForFollowup2,
  updateLeadStatus,
  markAsInterested,
  getWeeklyStats,
  testConnection,
};
