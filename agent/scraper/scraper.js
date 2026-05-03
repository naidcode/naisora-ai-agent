const { db } = require('../database/database');
const { generateLeadId, scoreLead } = require('../dedup/dedup');

/**
 * Simple concurrency controller
 */
async function pLimit(limit, tasks) {
  const results = [];
  const executing = [];
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    if (limit <= tasks.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

function getAllBangaloreZones() {
  return [
    "Koramangala", "Indiranagar", "HSR Layout", "Jayanagar", "JP Nagar",
    "Whitefield", "Marathahalli", "Electronic City", "Malleshwaram", "Banashankari"
  ];
}

async function scrapeArea(area) {
  console.log(`🔍 Scraping Google Maps for: ${area}...`);
  try {
    const { scrapeOne } = require('../../modules/scraper/googleMapsScraper');
    const results = await scrapeOne(area, "restaurants", 10);
    
    let newCount = 0;
    let dupCount = 0;

    for (const rawLead of results) {
      const lead = {
        name: rawLead.business_name || rawLead.name,
        phone: rawLead.phone,
        email: rawLead.email,
        address: rawLead.address || rawLead.area,
        category: rawLead.category || "restaurant",
        source: "google_maps",
        rating: rawLead.rating,
        reviewCount: rawLead.review_count,
        hasWebsite: !!rawLead.website
      };

      const id = generateLeadId(lead);
      const exists = await db.leads.find(id);
      
      // Secondary similarity check
      const similar = !exists ? await db.leads.findSimilar(lead) : null;

      if (!exists && !similar) {
        const score = scoreLead(lead);
        await db.leads.insert({
          ...lead,
          id,
          score,
          contacted: false,
          lastContactedAt: null,
          createdAt: new Date()
        });
        newCount++;
      } else {
        dupCount++;
      }
    }
    console.log(`✅ Area ${area} done: ${newCount} new, ${dupCount} skipped.`);
    return { area, newCount, dupCount };
  } catch (err) {
    console.error(`Error scraping ${area}:`, err.message);
    return { area, error: err.message };
  }
}

async function scrapeBangalore() {
  const areas = getAllBangaloreZones();
  
  console.log(`🚀 Starting parallel scrape of ${areas.length} areas...`);
  
  const results = await pLimit(3, areas.map(area => () => scrapeArea(area)));
  
  const totals = results.reduce((acc, res) => {
    acc.new += res.newCount || 0;
    acc.skipped += res.dupCount || 0;
    return acc;
  }, { new: 0, skipped: 0 });

  console.log(`🏁 Full Bangalore Scrape Complete: ${totals.new} new leads, ${totals.skipped} duplicates blocked.`);
  return totals;
}

module.exports = {
  scrapeBangalore,
  getAllBangaloreZones,
  scrapeArea
};
