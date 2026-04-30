
const { supabase } = require('../config/database');

async function checkLeads() {
  console.log('--- Checking Lead Statuses ---');
  const { data: leads, error } = await supabase
    .from('leads')
    .select('outreach_status, email, phone')
    .limit(1000);

  if (error) {
    console.error('Error fetching leads:', error.message);
    return;
  }

  const statuses = {};
  let withEmail = 0;
  let withPhone = 0;

  leads.forEach(l => {
    statuses[l.outreach_status] = (statuses[l.outreach_status] || 0) + 1;
    if (l.email) withEmail++;
    if (l.phone) withPhone++;
  });

  console.log('Status counts:', statuses);
  console.log('Leads with email:', withEmail);
  console.log('Leads with phone:', withPhone);

  // Test pending leads query
  const { data: pendingLeads } = await supabase
    .from('leads')
    .select('*')
    .eq('outreach_status', 'pending')
    .limit(5);
  
  console.log('Pending leads (status="pending"):', pendingLeads?.length || 0);

  // Test new leads query
  const { data: newLeads } = await supabase
    .from('leads')
    .select('*')
    .eq('outreach_status', 'new')
    .limit(5);
  
  console.log('New leads (status="new"):', newLeads?.length || 0);
}

checkLeads();
