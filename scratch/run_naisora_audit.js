const { auditWebsite } = require('../agency-ai-agent/modules/seo/seoAudit');

async function run() {
    console.log("🚀 Starting Official Technical & On-Page Audit for naisora.com...");
    
    const lead = {
        id: '9999', // Dummy ID
        business_name: 'Naisora Official',
        website: 'https://naisora.com',
        area: 'Bangalore'
    };

    try {
        const results = await auditWebsite(lead);
        console.log("✅ Audit completed successfully!");
        console.log("Results:", JSON.stringify(results, null, 2));
    } catch (error) {
        console.error("❌ Audit failed:", error.message);
    }
}

run();
