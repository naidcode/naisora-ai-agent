
const { supabase } = require('../config/database');

async function diagnose() {
  try {
    console.log('--- Database Status Check ---');
    const { data: allLeads, error } = await supabase.from('leads').select('outreach_status').limit(1000);
    
    if (error) {
      console.error('Error fetching leads:', error.message);
      return;
    }

    const statuses = [...new Set(allLeads.map(l => l.outreach_status))];
    console.log('All status values in DB:', statuses);
    
    const statusCounts = {};
    allLeads.forEach(l => {
      statusCounts[l.outreach_status] = (statusCounts[l.outreach_status] || 0) + 1;
    });
    console.log('Status counts (top 1000):', statusCounts);

    // Check for hot leads
    const { count: hotLeadsCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_category', 'hot');
    console.log('Total hot leads:', hotLeadsCount);

    // Check for hot leads ready for WhatsApp
    const { count: readyForWhatsApp } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_category', 'hot')
      .not('phone', 'is', null)
      .not('outreach_status', 'eq', 'whatsapp_sent')
      .not('outreach_status', 'eq', 'skipped');
    console.log('Hot leads ready for WhatsApp:', readyForWhatsApp);

  } catch (err) {
    console.error('Diagnostic failed:', err.message);
  }
}

diagnose();
