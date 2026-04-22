// modules/scraper/leadProcessor.js
// Naisora AI Agent — Lead Processor
// Takes raw scraped leads → validates → scores → categorises → saves to Supabase
//
// SCORING LOGIC:
// No website           → +40 points (highest priority — easy sale)
// Phone available      → +20 points (we can WhatsApp them directly)
// Rating < 3.5         → +15 points (they need help, more receptive)
// Review count < 50    → +10 points (low visibility, easy to improve)
// GBP not verified     → +10 points (low hanging fruit)
// Rating 3.5–4.0       → +5 points  (decent but room to grow)
// Category = cafe      → +5 points  (smaller decision-maker, faster close)
//
// CATEGORIES:
// Score 70+  → HOT  (no website + phone = outreach today)
// Score 40+  → WARM (has website but weak presence)
// Score <40  → COLD (already well-established, low ROI)

// Load .env directly — dotenv was adding hidden \r characters to keys
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

const { supabase } = require('../../config/database');
const { sendMessage } = require('../../config/telegram');

// ─── Indian phone number normaliser ──────────────────────────────────────────
function normalisePhone(raw) {
  if (!raw) return null;

  // Remove all non-digit characters
  let digits = raw.replace(/\D/g, "");

  // Handle leading zero (common in India: 098...)
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Handle +91 prefix (9198...)
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  // Must be 10 digits now
  if (digits.length !== 10) return null;

  // Must start with 6, 7, 8, or 9 (Indian mobile for WhatsApp)
  if (!["6", "7", "8", "9"].includes(digits[0])) return null;

  return `+91${digits}`;
}

// ─── Score a single lead ──────────────────────────────────────────────────────
function scoreLead(lead) {
  let score = 0;
  const reasons = [];

  // No website — our PRIMARY target
  if (!lead.has_website) {
    score += 50;
    reasons.push("No website (foundational need)");
  } else {
    // If they HAVE a website, we only care if it's likely a "bad design"
    // We proxy this with low ratings/reviews or if it's a very old business
    score += 10; 
    reasons.push("Redesign candidate");
  }

  // Has phone — we can WhatsApp them (CRITICAL)
  if (lead.phone) {
    score += 20;
    reasons.push("Phone available");
  }

  // Rating-based scoring (proxy for poor digital management/design)
  const rating = parseFloat(lead.rating) || 0;
  if (rating > 0 && rating < 3.8) {
    score += 15;
    reasons.push("Low rating (suggests poor online image)");
  }

  // Review count — low means low visibility
  const reviews = parseInt(lead.review_count) || 0;
  if (reviews < 50) {
    score += 15;
    reasons.push("Low local visibility");
  }

  // GBP not verified — easy win for local SEO
  if (!lead.gbp_verified) {
    score += 10;
    reasons.push("GBP not verified");
  }

  // Cafes/Coffee Shops close faster
  const category = (lead.category || "").toLowerCase();
  if (category.includes("cafe") || category.includes("coffee")) {
    score += 5;
    reasons.push("Cafe focus");
  }

  return score;
}

// ─── Categorise based on score ────────────────────────────────────────────────
function categorizeLead(score) {
  if (score >= 60) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

// ─── Validate a single lead ────────────────────────────────────────────────────
function validateLead(raw) {
  const errors = [];

  if (!raw.name || raw.name.trim().length < 2) {
    errors.push("Missing or invalid name");
  }
  if (!raw.area) {
    errors.push("Missing area");
  }
  if (!raw.google_maps_url) {
    errors.push("Missing Google Maps URL");
  }

  return errors;
}

// ─── Process a single lead ────────────────────────────────────────────────────
function processLead(raw) {
  // Validate
  const errors = validateLead(raw);
  if (errors.length > 0) {
    return { valid: false, errors, lead: null };
  }

  // Normalise phone
  const normalisedPhone = normalisePhone(raw.phone);

  // Score
  const score = scoreLead({ ...raw, phone: normalisedPhone });

  // Build processed lead object
  const processed = {
    // Identity
    business_name: raw.name.trim(),
    area: raw.area,
    category: raw.category || "restaurant",
    address: raw.address || null,

    // Contact
    phone: normalisedPhone,
    website: raw.website || null,
    google_maps_url: raw.google_maps_url,

    // Presence signals
    has_website: raw.has_website || false,
    gbp_verified: raw.gbp_verified || false,
    rating: parseFloat(raw.rating) || null,
    review_count: parseInt(raw.review_count) || 0,

    // Scoring
    lead_score: score,
    lead_category: categorizeLead(score),
    score_reasons: [],

    // Pipeline status
    outreach_status: "new", // new → contacted → replied → closed → lost
    outreach_channel: null, // whatsapp | email | both
    source: raw.source || "google_maps",
    search_type: raw.search_type || null,

    // Timestamps
    scraped_at: raw.scraped_at || new Date().toISOString(),
    processed_at: new Date().toISOString(),
    last_contacted_at: null,
    reply_received_at: null,
  };

  return { valid: true, errors: [], lead: processed };
}

// ─── Save batch to Supabase ───────────────────────────────────────────────────
async function saveleadsToSupabase(processedLeads) {
  if (processedLeads.length === 0) return { saved: 0, errors: [] };

  const saveErrors = [];
  let savedCount = 0;

  // ── Insert in batches of 50 (Supabase best practice) ──
  const batchSize = 50;
  for (let i = 0; i < processedLeads.length; i += batchSize) {
    const batch = processedLeads.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from("leads")
      .insert(batch)
      .select("id");

    if (error) {
      console.error(`  ❌ Supabase insert error!`);
      console.error(`     Error Message: ${error.message}`);
      console.error(`     Error Code:    ${error.code}`);
      console.error(`     Error Details: ${error.details}`);
      console.error(`     Full Error Object:`, JSON.stringify(error, null, 2));
      saveErrors.push(error.message);
    } else {
      savedCount += data?.length || 0;
    }
  }

  console.log(`✅ Saved [${savedCount}] leads to DB`);
  return { saved: savedCount, errors: saveErrors };
}

// ─── Main processor function ──────────────────────────────────────────────────
/**
 * Process an array of raw scraped leads
 * @param {Array} rawLeads - Output from googleMapsScraper.js
 * @param {boolean} saveToDb - Whether to save to Supabase (default true)
 * @returns {Object} Processing summary
 */
async function processLeads(rawLeads, saveToDb = true) {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║     NAISORA — Lead Processor                 ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`📥 Incoming leads: ${rawLeads.length}\n`);

  const processed = [];
  const invalid = [];
  const stats = { hot: 0, warm: 0, cold: 0, noWebsite: 0, withPhone: 0 };

  for (const raw of rawLeads) {
    const result = processLead(raw);

    if (!result.valid) {
      invalid.push({ name: raw.name, errors: result.errors });
      continue;
    }

    const lead = result.lead;
    processed.push(lead);

    // Count stats
    stats[lead.lead_category]++;
    if (!lead.has_website) stats.noWebsite++;
    if (lead.phone) stats.withPhone++;

    // Log each lead
    const icon =
      lead.lead_category === "hot"
        ? "🔥"
        : lead.lead_category === "warm"
          ? "🌡️"
          : "🧊";

    console.log(
      `${icon} [${lead.lead_score}pts/${lead.lead_category.toUpperCase()}] ` +
        `${lead.business_name} — ${lead.area}\n` +
        `   📞 ${lead.phone || "No phone"} | ` +
        `🌐 ${lead.has_website ? lead.website : "NO WEBSITE"} | ` +
        `⭐ ${lead.rating || "?"} (${lead.review_count} reviews)\n` +
        `   💡 ${lead.score_reasons.join(", ")}\n`,
    );
  }

  // ── Save to Supabase ──
  let saveResult = { saved: 0, errors: [] };
  if (saveToDb && processed.length > 0) {
    console.log(`\n💾 Saving ${processed.length} leads to Supabase...`);
    saveResult = await saveleadsToSupabase(processed);
    if (saveResult.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${saveResult.errors.join(", ")}`);
    }
  }

  // ── Summary ──
  const summary = {
    total_raw: rawLeads.length,
    total_processed: processed.length,
    total_invalid: invalid.length,
    saved_to_db: saveResult.saved,
    by_category: stats,
    hot_leads: processed.filter((l) => l.lead_category === "hot"),
    warm_leads: processed.filter((l) => l.lead_category === "warm"),
  };

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📊 Processing Summary`);
  console.log(`   Total processed : ${processed.length}`);
  console.log(`   🔥 Hot leads    : ${stats.hot}  (outreach today)`);
  console.log(`   🌡️  Warm leads   : ${stats.warm} (nurture this week)`);
  console.log(`   🧊 Cold leads   : ${stats.cold} (deprioritise)`);
  console.log(`   🚫 No website   : ${stats.noWebsite}`);
  console.log(`   📞 Have phone   : ${stats.withPhone}`);
  console.log(`   ❌ Invalid/skip : ${invalid.length}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await sendMessage(
    `⚙️ *Lead Processing Complete*\n\n` +
      `Processed: ${processed.length} leads\n` +
      `🔥 Hot (outreach now): *${stats.hot}*\n` +
      `🌡️ Warm: ${stats.warm}\n` +
      `🧊 Cold: ${stats.cold}\n` +
      `🚫 No website: *${stats.noWebsite}*\n` +
      `📞 Have phone: ${stats.withPhone}\n` +
      `💾 Saved to DB: ${saveResult.saved}`,
  );

  return summary;
}

// ─── Get hot leads from Supabase (for outreach scheduler) ────────────────────
async function getHotLeads(limit = 20) {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("lead_category", "hot")
    .eq("outreach_status", "new")
    .order("lead_score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching hot leads:", error.message);
    return [];
  }

  return data || [];
}

// ─── Get leads by area (for targeted outreach) ────────────────────────────────
async function getLeadsByArea(area, category = "hot", limit = 10) {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("area", area)
    .eq("lead_category", category)
    .eq("outreach_status", "new")
    .order("lead_score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching leads by area:", error.message);
    return [];
  }

  return data || [];
}

module.exports = {
  processLeads,
  processLead,
  getHotLeads,
  getLeadsByArea,
  scoreLead,
};
