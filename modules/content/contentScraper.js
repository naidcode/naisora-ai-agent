// modules/content/contentScraper.js
// Naisora AI Agent — Content Scraper
// Scrapes viral Instagram reels and YouTube videos related to restaurants

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const cleaned = line.replace(/\r/g, '').trim();
    if (cleaned && !cleaned.startsWith('#') && cleaned.includes('=')) {
      const [key, ...rest] = cleaned.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function scrapeViralContent() {
  console.log('🔍 Scaping viral restaurant content...');
  
  // Simulated scraping of viral content (in a real scenario, this would use Puppeteer/API)
  const simulatedResults = [
    {
      source: 'Instagram',
      url: 'https://www.instagram.com/reel/C1ABCDEFG/',
      engagement_score: 95,
      meta_info: 'Restaurant owner explains why Swiggy commissions are killing small cafes'
    },
    {
      source: 'YouTube',
      url: 'https://www.youtube.com/shorts/XYZ123',
      engagement_score: 88,
      meta_info: 'Day in the life of a busy Bangalore QSR owner'
    }
  ];

  const { data, error } = await supabase
    .from('content_ideas')
    .insert(simulatedResults)
    .select();

  if (error) {
    console.error('❌ Error saving content ideas:', error.message);
    return [];
  }

  console.log(`✅ Scraped and saved ${data.length} content ideas.`);
  return data;
}

module.exports = { scrapeViralContent };
