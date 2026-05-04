// modules/scraper/googleMapsScraper.js
// Naisora AI Agent — Google Maps Lead Scraper
// Scrapes restaurants and cafes from Google Maps across Bangalore areas
// Extracts: name, rating, reviews, phone, website, address, category
// Priority target: businesses with NO website (highest conversion)

const puppeteer = require("puppeteer");
const { sendMessage } = require('../../config/telegram');

// ─── Bangalore target areas ──────────────────────────────────────────────────
// Covered in order of restaurant density and digital gap opportunity
const BANGALORE_AREAS = [
  "Koramangala", "Indiranagar", "HSR Layout",
  "Jayanagar", "JP Nagar", "Whitefield",
  "Electronic City", "Marathahalli", "Bannerghatta Road",
  "Yelahanka", "Hebbal", "Rajajinagar",
  "Malleshwaram", "Basavanagudi", "BTM Layout",
  "Sarjapur Road", "Bellandur", "Kadugodi",
  "Bommanahalli", "Vijayanagar", "Cunningham Road",
  "MG Road", "Brigade Road", "Lavelle Road",
  "Richmond Town", "Shivajinagar", "Frazer Town",
  "Cox Town", "Benson Town", "RT Nagar",
  "Nagawara", "Thanisandra", "Hennur",
  "Horamavu", "Ramamurthy Nagar", "KR Puram",
  "Mahadevapura", "Brookefield", "Varthur",
  "Domlur", "Old Airport Road", "CV Raman Nagar",
  "Kammanahalli", "Kalyan Nagar", "Sahakar Nagar",
  "Jalahalli", "Peenya", "Yeshwanthpur",
  "Kengeri", "Uttarahalli", "Banashankari",
  "Padmanabhanagar", "Kumaraswamy Layout",
  "Hulimavu", "Gottigere", "Chandapura",
  "Begur", "Electronic City Phase 2", "Hoskote",
  "Devanahalli", "Anekal"
];

// ─── Search types ─────────────────────────────────────────────────────────────
const SEARCH_TYPES = ["restaurants", "cafes", "dine in", "food"];

// ─── Delay helper ─────────────────────────────────────────────────────────────
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomDelay = (min = 1500, max = 3500) =>
  delay(Math.floor(Math.random() * (max - min) + min));

// ─── Main scraper function ────────────────────────────────────────────────────
/**
 * Scrapes Google Maps for restaurant/cafe leads in a specific area
 * @param {string} area - Bangalore neighbourhood to search
 * @param {string} searchType - "restaurants" | "cafes" etc.
 * @param {number} maxResults - Max leads to scrape per search (default 20)
 * @returns {Array} Array of raw lead objects
 */
async function scrapeArea(area, searchType = "restaurants", maxResults = 20) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const leads = [];

  try {
    const page = await browser.newPage();

    // ── Stealth: Remove automation markers ──
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      window.chrome = { runtime: {} };
    });

    // ── Set realistic user agent ──
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    const searchQuery = `${searchType} in ${area} Bangalore`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://www.google.com/maps/search/${encodedQuery}`;

    console.log(`\n🔍 Scraping: "${searchQuery}"`);

    // ── Robust Navigation with Retries ──
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch (e) {
      console.log('⚠️  Initial navigation flake, retrying with simple load...');
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      } catch (e2) {
        console.log('⚠️  Second attempt failed, trying domcontentloaded...');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      }
    }
    await randomDelay(3000, 5000);

    // ── Scroll the results panel to load more listings ──
    await scrollResultsPanel(page, maxResults);

    // ── Extract all listing cards ──
    const rawLeads = await page.evaluate(() => {
      const results = [];

      // Google Maps result cards selector
      const cards = document.querySelectorAll(
        'div[role="feed"] > div > div > a[href*="/maps/place/"]',
      );

      cards.forEach((card) => {
        try {
          const name =
            card.querySelector(".qBF1Pd")?.textContent?.trim() ||
            card.getAttribute("aria-label")?.trim() ||
            null;

          const rating =
            card.querySelector(".MW4etd")?.textContent?.trim() || null;

          const reviewCount =
            card.querySelector(".UY7F9")?.textContent?.trim() || null;

          const category =
            card
              .querySelector(".W4Efsd span:first-child")
              ?.textContent?.trim() || null;

          const address =
            card
              .querySelector(".W4Efsd")
              ?.textContent?.replace(category || "", "")
              ?.trim() || null;

          const mapsUrl = card.getAttribute("href") || null;

          if (name) {
            results.push({
              name,
              rating,
              reviewCount,
              category,
              address,
              mapsUrl,
            });
          }
        } catch (e) {
          // Skip malformed card
        }
      });

      return results;
    });

    console.log(`  Found ${rawLeads.length} listings in panel`);

    // ── Visit each listing page to get phone + website ──
    for (let i = 0; i < Math.min(rawLeads.length, maxResults); i++) {
      const lead = rawLeads[i];
      if (!lead.mapsUrl) continue;

      try {
        await page.goto(
          lead.mapsUrl.startsWith("http")
            ? lead.mapsUrl
            : `https://www.google.com${lead.mapsUrl}`,
          { waitUntil: "domcontentloaded", timeout: 60000 },
        );
        await randomDelay(1500, 3000);

        const details = await page.evaluate(() => {
          // Phone number
          const phoneEl = document.querySelector(
            'button[data-item-id*="phone"] .Io6YTe',
          );
          const phone = phoneEl?.textContent?.trim() || null;

          // Website
          const websiteEl = document.querySelector(
            'a[data-item-id*="authority"] .Io6YTe',
          );
          const website = websiteEl?.textContent?.trim() || null;

          // Full address (more accurate from detail page)
          const addressEl = document.querySelector(
            'button[data-item-id*="address"] .Io6YTe',
          );
          const fullAddress = addressEl?.textContent?.trim() || null;

          // Business category from detail page
          const categoryEl = document.querySelector(".DkEaL");
          const category = categoryEl?.textContent?.trim() || null;

          // Rating + review count from detail page (more accurate)
          const ratingEl = document.querySelector(".F7nice span[aria-hidden]");
          const rating = ratingEl?.textContent?.trim() || null;

          const reviewEl = document.querySelector(".F7nice span[aria-label]");
          const reviewText = reviewEl?.getAttribute("aria-label") || null;
          // Extract number from "1,234 reviews"
          const reviewCount = reviewText
            ? reviewText.replace(/[^0-9,]/g, "").replace(",", "")
            : null;

          // Check if Google Business Profile is verified
          const verified = !!document.querySelector('[aria-label*="Claimed"]');

          return {
            phone,
            website,
            fullAddress,
            category,
            rating,
            reviewCount,
            verified,
          };
        });

        // ── Merge card data + detail page data ──
        const mapsUrl = lead.mapsUrl.startsWith("http")
          ? lead.mapsUrl
          : `https://www.google.com${lead.mapsUrl}`;
        
        let placeId = null;
        const placeIdMatch = mapsUrl.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/);
        if (placeIdMatch) {
          placeId = placeIdMatch[1];
        }

        if (!placeId) continue; // skip if no ID

        leads.push({
          name: lead.name,
          place_id: placeId,
          area: area,
          search_type: searchType,
          rating: details.rating || lead.rating || null,
          review_count: details.reviewCount
            ? parseInt(details.reviewCount)
            : lead.reviewCount
              ? parseInt(lead.reviewCount.replace(/[^0-9]/g, ""))
              : 0,
          category: details.category || lead.category || searchType,
          address: details.fullAddress || lead.address || null,
          phone: details.phone || null,
          website: details.website || null,
          has_website: !!details.website,
          gbp_verified: details.verified || false,
          google_maps_url: mapsUrl,
          scraped_at: new Date().toISOString(),
          outreach_status: "new",
          source: "google_maps",
        });

        process.stdout.write(
          `  [${i + 1}/${Math.min(rawLeads.length, maxResults)}] ` +
            `${lead.name} — Phone: ${details.phone || "❌"} | ` +
            `Website: ${details.website ? "✅" : "❌ NO SITE"}\n`,
        );
      } catch (err) {
        console.log(`  ⚠️  Skipped "${lead.name}" — ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`❌ Error scraping ${area}: ${err.message}`);
  } finally {
    await browser.close();
  }

  return leads;
}

// ─── Scroll results panel helper ──────────────────────────────────────────────
async function scrollResultsPanel(page, targetCount) {
  const panelSelector = 'div[role="feed"]';
  let previousCount = 0;
  let stuckCount = 0;
  const maxScrolls = Math.ceil(targetCount / 5) + 5;

  for (let i = 0; i < maxScrolls; i++) {
    const currentCount = await page.evaluate((sel) => {
      const panel = document.querySelector(sel);
      if (!panel) return 0;
      panel.scrollTop += 800;
      return document.querySelectorAll(
        'div[role="feed"] > div > div > a[href*="/maps/place/"]',
      ).length;
    }, panelSelector);

    if (currentCount >= targetCount) break;
    if (currentCount === previousCount) {
      stuckCount++;
      if (stuckCount >= 3) break; // No more results loading
    } else {
      stuckCount = 0;
    }

    previousCount = currentCount;
    await randomDelay(1200, 2000);
  }
}

function getAreasForToday(allAreas, areasPerRun = 5) {
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const startIndex = (dayIndex * areasPerRun) % allAreas.length;
  const areas = [];
  for (let i = 0; i < areasPerRun; i++) {
    areas.push(allAreas[(startIndex + i) % allAreas.length]);
  }
  return areas;
}

// ─── Run full Bangalore scrape ────────────────────────────────────────────────
/**
 * Main entry point — scrape all target areas and types
 * @param {Object} options - { areas, searchTypes, maxPerSearch, areasToday }
 * @returns {Array} Combined leads from all searches
 */
async function runFullScrape(options = {}) {
  const {
    areas = getAreasForToday(BANGALORE_AREAS, 5), // Default: scrape rotated areas
    searchTypes = ["restaurants", "cafes"],
    maxPerSearch = 15,
  } = options;

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║     NAISORA — Google Maps Lead Scraper       ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`📍 Areas: ${areas.join(", ")}`);
  console.log(`🔍 Types: ${searchTypes.join(", ")}`);
  console.log(`📊 Max per search: ${maxPerSearch}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const allLeads = [];
  let totalScraped = 0;
  let noWebsiteCount = 0;

  for (const area of areas) {
    for (const type of searchTypes) {
      const leads = await scrapeArea(area, type, maxPerSearch);
      allLeads.push(...leads);
      totalScraped += leads.length;
      noWebsiteCount += leads.filter((l) => !l.has_website).length;

      // ── Polite delay between searches (avoids rate limiting) ──
      console.log(`\n⏳ Waiting before next search...`);
      await delay(5000 + Math.random() * 3000);
    }
  }

  // ── Summary ──
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Scrape complete`);
  console.log(`   Total leads scraped : ${totalScraped}`);
  console.log(`   No website (priority): ${noWebsiteCount}`);
  console.log(`   Has website         : ${totalScraped - noWebsiteCount}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await sendMessage(
    `🗺️ *Maps Scrape Complete*\n\n` +
      `Areas: ${areas.join(", ")}\n` +
      `Total leads: ${totalScraped}\n` +
      `🎯 No website (hot leads): *${noWebsiteCount}*\n` +
      `Has website: ${totalScraped - noWebsiteCount}`,
  );

  return allLeads;
}

// ─── Scrape single area (for testing) ────────────────────────────────────────
async function scrapeOne(area, type = "restaurants", max = 5) {
  return await scrapeArea(area, type, max);
}

// ─── All available areas (export for cron scheduler) ─────────────────────────
function getAllAreas() {
  return BANGALORE_AREAS;
}

module.exports = { runFullScrape, scrapeOne, getAllAreas, BANGALORE_AREAS, getAreasForToday };
