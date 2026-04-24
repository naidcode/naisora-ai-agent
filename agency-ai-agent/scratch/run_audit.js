
const { auditWebsite } = require('../modules/seo/seoAudit');

async function run() {
  const lead = {
    id: 'temp-audit-' + Date.now(),
    business_name: 'Naisora',
    website: 'https://naisora.com',
    area: 'Bangalore'
  };

  console.log('🚀 Starting full audit for Isobel Coffeehouse...');
  try {
    const result = await auditWebsite(lead);
    console.log('✅ Audit completed successfully!');
    console.log('Result Summary:', JSON.stringify(result.summary, null, 2));
  } catch (error) {
    console.error('❌ Audit failed:', error);
  }
}

run();
