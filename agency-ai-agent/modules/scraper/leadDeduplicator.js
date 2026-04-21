// modules/scraper/leadDeduplicator.js
// Naisora AI Agent — Lead Deduplicator
//
// PROBLEM: Every time the scraper runs, it may find the same restaurants again.
// Without deduplication, the same restaurant gets outreach 5x — kills our reputation.
//
// DEDUP STRATEGY (3 layers):
// Layer 1 — Exact phone match      → definite duplicate (same business)
// Layer 2 — Exact name + area match → likely duplicate (same business)
// Layer 3 — Fuzzy name match        → possible duplicate (flagged for review)
//
// ALSO handles:
// - Cleaning out cold leads (score < 40) before saving
// - Removing leads with no phone AND no website (unreachable)
// - Flagging leads already in "contacted" or "closed" status

const { createClient } = require("@supabase/supabase-js");
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

// ─── Supabase client ─────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

// ─── Simple string normaliser for fuzzy matching ──────────────────────────────
function normaliseString(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, " ") // Collapse spaces
    .trim();
}

// ─── Levenshtein distance for fuzzy name match ────────────────────────────────
function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  matrix[0] = Array.from({ length: a.length + 1 }, (_, i) => i);

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Similarity score between 0 and 1
function nameSimilarity(a, b) {
  const na = normaliseString(a);
  const nb = normaliseString(b);
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(na, nb) / maxLen;
}

// ─── Fetch existing leads from Supabase ──────────────────────────────────────
async function fetchExistingLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select("id, business_name, phone, area, outreach_status, lead_category")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Failed to fetch existing leads:", error.message);
    return [];
  }

  return data || [];
}

// ─── Check a single lead against existing leads ───────────────────────────────
function checkDuplicate(newLead, existingLeads) {
  for (const existing of existingLeads) {
    // Layer 1: Exact phone match (strongest signal)
    if (newLead.phone && existing.phone && newLead.phone === existing.phone) {
      return {
        isDuplicate: true,
        reason: "exact_phone",
        matchedId: existing.id,
        existingStatus: existing.outreach_status,
        label: `Phone match: ${existing.phone}`,
      };
    }

    // Layer 2: Exact name + same area (definite duplicate)
    if (
      normaliseString(newLead.business_name) ===
        normaliseString(existing.business_name) &&
      normaliseString(newLead.area) === normaliseString(existing.area)
    ) {
      return {
        isDuplicate: true,
        reason: "exact_name_area",
        matchedId: existing.id,
        existingStatus: existing.outreach_status,
        label: `Name+Area match: ${existing.business_name} in ${existing.area}`,
      };
    }

    // Layer 3: Fuzzy name match in same area (flag as possible duplicate)
    if (
      normaliseString(newLead.area) === normaliseString(existing.area) &&
      nameSimilarity(newLead.business_name, existing.business_name) > 0.85
    ) {
      return {
        isDuplicate: true,
        reason: "fuzzy_name",
        matchedId: existing.id,
        existingStatus: existing.outreach_status,
        label: `Fuzzy match: "${newLead.business_name}" ≈ "${existing.business_name}"`,
      };
    }
  }

  return { isDuplicate: false };
}

// ─── Filter out unreachable leads ─────────────────────────────────────────────
function isReachable(lead) {
  // Must have at least phone OR website (if no website, that's fine — we walk in)
  // Must have phone for WhatsApp outreach
  // For email outreach, website gives us their contact page
  // Minimum: must have phone (WhatsApp) for our primary outreach channel

  if (!lead.phone) {
    return { reachable: false, reason: "No phone number — cannot WhatsApp" };
  }

  return { reachable: true, reason: null };
}

// ─── Main deduplication function ──────────────────────────────────────────────
/**
 * Deduplicate an array of processed leads against Supabase database
 * @param {Array} processedLeads - Output from leadProcessor.js
 * @returns {Object} { newLeads, duplicates, unreachable, summary }
 */
async function deduplicateLeads(processedLeads) {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║     NAISORA — Lead Deduplicator              ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`📥 Leads to check: ${processedLeads.length}`);
  console.log("🔄 Fetching existing leads from database...\n");

  const existingLeads = await fetchExistingLeads();
  console.log(`📊 Existing leads in DB: ${existingLeads.length}\n`);

  const newLeads = [];
  const duplicates = [];
  const unreachable = [];

  // ── Also deduplicate within the new batch itself ──
  // (same business can appear in multiple search types e.g. "restaurant" and "dine in")
  const seenInBatch = new Set();

  for (const lead of processedLeads) {
    // ── Step 1: Check reachability ──
    const reachCheck = isReachable(lead);
    if (!reachCheck.reachable) {
      unreachable.push({ lead, reason: reachCheck.reason });
      continue;
    }

    // ── Step 2: Check within-batch duplicates ──
    const batchKey = lead.phone
      ? lead.phone
      : `${normaliseString(lead.business_name)}_${normaliseString(lead.area)}`;

    if (seenInBatch.has(batchKey)) {
      duplicates.push({
        lead,
        reason: "within_batch",
        label: `Already in this batch: ${batchKey}`,
      });
      continue;
    }
    seenInBatch.add(batchKey);

    // ── Step 3: Check against Supabase ──
    const dupCheck = checkDuplicate(lead, existingLeads);

    if (dupCheck.isDuplicate) {
      // Log already-contacted leads differently
      const statusNote =
        dupCheck.existingStatus !== "new"
          ? ` [Already ${dupCheck.existingStatus.toUpperCase()}]`
          : "";

      console.log(
        `⏭️  SKIP — ${lead.business_name} (${lead.area})\n` +
          `   Reason: ${dupCheck.label}${statusNote}\n`,
      );

      duplicates.push({
        lead,
        reason: dupCheck.reason,
        matchedId: dupCheck.matchedId,
        label: dupCheck.label,
        existingStatus: dupCheck.existingStatus,
      });
    } else {
      // ── Brand new lead ──
      newLeads.push(lead);
      const icon =
        lead.lead_category === "hot"
          ? "🔥"
          : lead.lead_category === "warm"
            ? "🌡️"
            : "🧊";

      console.log(
        `✅ NEW — ${icon} ${lead.business_name} (${lead.area}) ` +
          `[Score: ${lead.lead_score}]\n` +
          `   📞 ${lead.phone} | 🌐 ${lead.has_website ? "Has website" : "NO WEBSITE"}\n`,
      );
    }
  }

  // ── Summary ──
  const hotNew = newLeads.filter((l) => l.lead_category === "hot").length;
  const warmNew = newLeads.filter((l) => l.lead_category === "warm").length;

  const summary = {
    total_checked: processedLeads.length,
    new_leads: newLeads.length,
    duplicates_skipped: duplicates.length,
    unreachable_skipped: unreachable.length,
    hot_new: hotNew,
    warm_new: warmNew,
  };

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📊 Deduplication Summary`);
  console.log(`   Total checked       : ${summary.total_checked}`);
  console.log(`   ✅ New (ready)      : ${summary.new_leads}`);
  console.log(`   🔥 Hot new leads    : ${hotNew}`);
  console.log(`   🌡️  Warm new leads   : ${warmNew}`);
  console.log(`   ⏭️  Duplicates skipped: ${summary.duplicates_skipped}`);
  console.log(`   📵 Unreachable skip : ${summary.unreachable_skipped}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await sendTelegramAlert(
    `🔍 *Deduplication Complete*\n\n` +
      `Checked: ${summary.total_checked}\n` +
      `✅ New leads ready: *${summary.new_leads}*\n` +
      `🔥 Hot (WhatsApp now): *${hotNew}*\n` +
      `🌡️ Warm: ${warmNew}\n` +
      `⏭️ Skipped (dupes): ${summary.duplicates_skipped}\n` +
      `📵 Unreachable: ${summary.unreachable_skipped}`,
  );

  return {
    newLeads,
    duplicates,
    unreachable,
    summary,
  };
}

// ─── Update lead status (called by outreach modules) ─────────────────────────
async function updateLeadStatus(leadId, newStatus, extraFields = {}) {
  const { error } = await supabase
    .from("leads")
    .update({
      outreach_status: newStatus,
      ...extraFields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) {
    console.error(`❌ Failed to update lead ${leadId}: ${error.message}`);
    return false;
  }

  return true;
}

// ─── Mark lead as contacted ───────────────────────────────────────────────────
async function markAsContacted(leadId, channel = "whatsapp") {
  return await updateLeadStatus(leadId, "contacted", {
    outreach_channel: channel,
    last_contacted_at: new Date().toISOString(),
  });
}

// ─── Full pipeline: Scrape → Process → Deduplicate → Return ready leads ───────
// This is the function cronJobs.js calls
async function getReadyLeads(rawLeads) {
  const { processLeads } = require("./leadProcessor");

  // Process raw leads (score + validate)
  const processSummary = await processLeads(rawLeads, false); // don't save yet

  // Deduplicate
  const allProcessed = [
    ...processSummary.hot_leads,
    ...processSummary.warm_leads,
  ];
  const dedupResult = await deduplicateLeads(allProcessed);

  // Now save only the genuinely new leads
  if (dedupResult.newLeads.length > 0) {
    const { createClient } = require("@supabase/supabase-js");
    const db = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
    );

    const { error } = await db.from("leads").insert(dedupResult.newLeads);
    if (error) {
      console.error("❌ Error saving new leads:", error.message);
    } else {
      console.log(
        `\n💾 Saved ${dedupResult.newLeads.length} new leads to Supabase`,
      );
    }
  }

  return dedupResult;
}

module.exports = {
  deduplicateLeads,
  updateLeadStatus,
  markAsContacted,
  getReadyLeads,
};
