
const { supabase, STATUS } = require('../config/database');

async function checkFirstLeads() {
  const { data: leads } = await supabase
    .from('leads')
    .select('id, business_name, email, created_at')
    .eq('outreach_status', STATUS.NEW)
    .order('created_at', { ascending: true })
    .limit(10);

  console.log('--- FIRST 10 NEW LEADS ---');
  leads.forEach((l, i) => {
    console.log(`${i+1}. ${l.business_name} | Email: ${l.email} | Created: ${l.created_at}`);
  });
}

checkFirstLeads();
