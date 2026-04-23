// modules/content/contentPipeline.js
// Naisora AI Agent — Content Pipeline
// Runs the full sequence: Scrape → Validate → Script → Hooks

const { scrapeViralContent } = require('./contentScraper');
const { validateContentIdeas } = require('./contentValidator');
const { writeReelScript } = require('./scriptWriter');
const { generateHooks } = require('./hookGenerator');
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

async function runContentPipeline() {
  console.log('\n🎬 STARTING CONTENT PIPELINE...');
  
  try {
    // 1. Scrape
    const rawIdeas = await scrapeViralContent();
    if (!rawIdeas || rawIdeas.length === 0) return;

    // 2. Validate
    const validatedIdeas = await validateContentIdeas(rawIdeas);
    if (validatedIdeas.length === 0) return;

    for (const idea of validatedIdeas) {
      console.log(`\n🚀 Processing Idea: ${idea.url}`);
      
      // 3. Script
      const script = await writeReelScript(idea);
      
      // 4. Hooks
      const hooks = await generateHooks(script);
      
      // 5. Update Supabase with final output
      await supabase
        .from('content_ideas')
        .update({ script, hooks })
        .eq('id', idea.id);

      console.log('--- FINAL SCRIPT ---');
      console.log(script);
      console.log('--- HOOKS ---');
      console.log(hooks.join('\n'));
      console.log('--------------------');
    }

    console.log('\n✅ CONTENT PIPELINE COMPLETE');
  } catch (error) {
    console.error('❌ Pipeline failed:', error.message);
  }
}

// Support running directly
if (require.main === module) {
  runContentPipeline();
}

module.exports = { runContentPipeline };
