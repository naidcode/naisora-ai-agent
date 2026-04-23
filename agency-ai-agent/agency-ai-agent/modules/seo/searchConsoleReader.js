// modules/seo/searchConsoleReader.js
// Reads Google Search Console data (requires OAuth per client)

require('dotenv').config();

// Placeholder — GSC requires OAuth per client
// Real connection added during client onboarding in Week 9
async function getSearchData(clientId, days = 28) {
  return {
    clicks: 0,
    impressions: 0,
    ctr: 0,
    averagePosition: 0,
    topQueries: [],
    topPages: [],
    note: 'GSC connection required — set up during client onboarding'
  };
}

async function getQuickWinKeywords(clientId) {
  // Keywords in positions 8-20 — easiest to push to page 1
  const data = await getSearchData(clientId);
  return data.topQueries.filter(q => q.position >= 8 && q.position <= 20);
}

module.exports = { getSearchData, getQuickWinKeywords };