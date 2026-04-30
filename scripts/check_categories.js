
const { supabase } = require('../config/database');

async function checkCategories() {
  console.log('--- Checking Lead Categories ---');
  const { data: leads, error } = await supabase
    .from('leads')
    .select('lead_category, outreach_status')
    .limit(1000);

  if (error) {
    console.error('Error fetching leads:', error.message);
    return;
  }

  const categories = {};
  leads.forEach(l => {
    categories[l.lead_category] = (categories[l.lead_category] || 0) + 1;
  });

  console.log('Category counts:', categories);
  
  const hotLeads = leads.filter(l => l.lead_category === 'hot');
  console.log('Hot leads count:', hotLeads.length);
  if (hotLeads.length > 0) {
    console.log('Hot leads statuses:', hotLeads.reduce((acc, l) => {
      acc[l.outreach_status] = (acc[l.outreach_status] || 0) + 1;
      return acc;
    }, {}));
  }
}

checkCategories();
