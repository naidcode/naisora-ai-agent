// scripts/scrape_and_process.js
const { runFullScrape } = require('../modules/scraper/googleMapsScraper');
const { processLeads } = require('../modules/scraper/leadProcessor');

(async () => {
  try {
    console.log('🔍 Starting scraper to find new leads...');
    const rawLeads = await runFullScrape({
      areas: ['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'Jayanagar'],
      searchTypes: ['restaurants', 'cafes'],
      maxPerSearch: 20
    });
    
    console.log(`✅ Scraped ${rawLeads.length} raw leads. Processing...`);
    const processed = await processLeads(rawLeads, false);
    console.log(`✅ Processed ${processed.hot_leads.length} hot leads.`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Lead generation failed:', err.message);
    process.exit(1);
  }
})();
