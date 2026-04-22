// diagnose-agent.js
const fs = require('fs');
const path = require('path');

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

const RESULTS = {
  supabase: { connection: false, tables: {} },
  scraper: { module_load: false, place_id_check: false, skip_existing: false },
  processor: { score_type: false, categorization: false, save_to_db: false },
  puppeteer: { working: false },
  instagram: { exported: false },
  linkedin: { exported: false },
  content_pipeline: { scraper: false, validator: false, writer: false, hook: false, pipeline: false },
};

async function runDiagnosis() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY);
  
  // Tables
  const tables = ['leads', 'clients', 'outreach_log', 'seo_reports', 'blog_posts', 'rankings', 'invoices', 'content_ideas'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    RESULTS.supabase.tables[table] = !error;
  }

  // Processor
  try {
    const { scoreLead } = require('./modules/scraper/leadProcessor');
    RESULTS.processor.score_type = (typeof scoreLead({ name: 'T' }) === 'number');
  } catch (e) {}

  // Outreach exports
  try {
    const inst = require('./modules/outreach/instagramOutreach');
    RESULTS.instagram.exported = (typeof inst.loginInstagram === 'function');
  } catch (e) {}
  try {
    const link = require('./modules/outreach/linkedinOutreach');
    RESULTS.linkedin.exported = (typeof link.loginLinkedIn === 'function');
  } catch (e) {}

  // Content
  const pMap = {
      'contentScraper': 'scraper',
      'contentValidator': 'validator',
      'scriptWriter': 'writer',
      'hookGenerator': 'hook',
      'contentPipeline': 'pipeline'
  };
  Object.entries(pMap).forEach(([file, key]) => {
      if (fs.existsSync(`./modules/content/${file}.js`)) {
          try {
              require(`./modules/content/${file}`);
              RESULTS.content_pipeline[key] = true;
          } catch (e) {
              console.log(`Error loading ${file}:`, e.message);
          }
      }
  });

  printReport();
}

function printReport() {
  console.log('\n=============================');
  console.log('🤖 NAISORA AGENT HEALTH REPORT');
  console.log('=============================');
  console.log(`${RESULTS.processor.score_type ? '✅' : '❌'} scoreLead() returns number`);
  console.log(`${RESULTS.instagram.exported ? '✅' : '❌'} Instagram login exported`);
  console.log(`${RESULTS.linkedin.exported ? '✅' : '❌'} LinkedIn login exported`);
  console.log(`${RESULTS.content_pipeline.scraper ? '✅' : '❌'} Content Scraper created`);
  console.log(`${RESULTS.content_pipeline.validator ? '✅' : '❌'} Content Validator created`);
  console.log(`${RESULTS.content_pipeline.writer ? '✅' : '❌'} Script Writer created`);
  console.log(`${RESULTS.content_pipeline.hook ? '✅' : '❌'} Hook Generator created`);
  console.log(`${RESULTS.content_pipeline.pipeline ? '✅' : '❌'} Content Pipeline created`);
  console.log(`${RESULTS.supabase.tables.invoices ? '✅' : '❌'} invoices table created`);
  console.log(`${RESULTS.supabase.tables.content_ideas ? '✅' : '❌'} content_ideas table created`);
  console.log('=============================');
  process.exit(0);
}

runDiagnosis();
