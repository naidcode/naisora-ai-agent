
const { supabase, STATUS } = require('../config/database');

async function checkLeads() {
  const { count: total } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  const { count: news } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('outreach_status', STATUS.NEW);
  const { count: withEmail } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('outreach_status', STATUS.NEW).not('email', 'is', null);
  const { count: contacted } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('outreach_status', STATUS.CONTACTED);

  console.log('--- DATABASE STATUS ---');
  console.log(`Total Leads: ${total}`);
  console.log(`New Leads: ${news}`);
  console.log(`New Leads w/ Email: ${withEmail}`);
  console.log(`Contacted Leads: ${contacted}`);
  
  if (withEmail > 0) {
    const { data: sample } = await supabase.from('leads').select('*').eq('outreach_status', STATUS.NEW).not('email', 'is', null).limit(1);
    console.log('\nSample lead with email:');
    console.log(JSON.stringify(sample[0], null, 2));
  }
}

checkLeads();
