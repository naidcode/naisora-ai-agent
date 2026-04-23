// modules/tracking/rankingTracker.js
// Tracks keyword rankings for client websites over time

require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { alertRankingDrop } = require('../reporting/realtimeAlerts');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─── Check Google ranking for a keyword ──────────────────────────────────────
// Uses free SerpAPI alternative — scrapes Google search results
async function checkRanking(keyword, website) {
  try {
    const query = encodeURIComponent(keyword);
    const url = `https://www.google.com/search?q=${query}&num=30&gl=in&hl=en`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 10000,
    });

    // Find position of client website in results
    const html = response.data;
    const domain = website.replace(/https?:\/\//, '').replace(/\/$/, '');

    // Count position
    const links = html.match(/href="https?:\/\/[^"]+"/g) || [];
    let position = 0;

    for (let i = 0; i < links.length; i++) {
      if (links[i].includes(domain)) {
        position = i + 1;
        break;
      }
    }

    return position > 0 ? position : 100; // 100 = not found in top 30

  } catch (err) {
    console.error(`Ranking check failed for "${keyword}": ${err.message}`);
    return null;
  }
}

// ─── Track rankings for a client ─────────────────────────────────────────────
async function trackClientRankings(client, keywords) {
  if (!client.website || !keywords || keywords.length === 0) return;

  console.log(`\n📊 Tracking rankings for ${client.business_name}...`);

  const results = [];

  for (const kw of keywords.slice(0, 10)) {
    const keyword = kw.keyword || kw;
    const position = await checkRanking(keyword, client.website);

    if (position !== null) {
      // Get previous position
      const { data: prev } = await supabase
        .from('rankings')
        .select('position')
        .eq('lead_id', client.id)
        .eq('keyword', keyword)
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      const previousPosition = prev?.position || null;
      const change = previousPosition ? previousPosition - position : 0;

      // Save to database
      await supabase.from('rankings').insert({
        lead_id: client.id,
        keyword,
        position,
        previous_position: previousPosition,
        change,
        checked_at: new Date().toISOString(),
      });

      // Alert if ranking dropped significantly
      if (previousPosition && position > previousPosition + 3) {
        await alertRankingDrop(client, keyword, previousPosition, position);
      }

      results.push({ keyword, position, change });
      console.log(`  "${keyword}" — Position: ${position} ${change > 0 ? `(↑${change})` : change < 0 ? `(↓${Math.abs(change)})` : '(→)'}`);

      await new Promise(r => setTimeout(r, 2000)); // delay between checks
    }
  }

  return results;
}

module.exports = { checkRanking, trackClientRankings };