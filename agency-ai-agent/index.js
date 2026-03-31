// ============================================
// index.js — MAIN ENTRY POINT
// Naisora AI Agent v2.0
// Command: node index.js
// ============================================

require("dotenv").config();

const { testConnection: testClaude } = require("./config/claude");
const { testConnection: testDatabase } = require("./config/database");
const { testConnection: testGmail } = require("./config/gmail");
const { testConnection: testTelegram } = require("./config/telegram");
const { startAllJobs } = require("./scheduler/cronJobs");
const {
  scrapeOne,
  runFullScrape,
} = require("./modules/scraper/googleMapsScraper");
const { processLeads } = require("./modules/scraper/leadProcessor");
const { deduplicateLeads } = require("./modules/scraper/leadDeduplicator");
const { sendDailyWhatsApp } = require("./modules/outreach/whatsappSender");
const { checkReplies } = require("./modules/outreach/replyReader");
const { generateDailyPriorities } = require("./modules/outreach/leadScorer");
const {
  runInstagramOutreach,
} = require("./modules/outreach/instagramOutreach");
const { runLinkedInOutreach } = require("./modules/outreach/linkedinOutreach");
const { sendDailyWhatsApp } = require("./modules/outreach/whatsappSender");
const { checkReplies } = require("./modules/outreach/replyReader");
const { generateDailyPriorities } = require("./modules/outreach/leadScorer");
const {
  runInstagramOutreach,
} = require("./modules/outreach/instagramOutreach");
const { runLinkedInOutreach } = require("./modules/outreach/linkedinOutreach");
const { scrapeEmailsForLeads } = require("./modules/scraper/emailScraper");
const { auditWarmLeads } = require("./modules/seo/seoAudit");
const {
  publishWeeklyBlogs,
  publishApprovedDrafts,
} = require("./modules/wordpress/blogPublisher");
const { researchKeywords } = require("./modules/seo/keywordResearch");
const { runTechnicalAudit } = require("./modules/seo/technicalAudit");
const { runWeeklySeoForAllClients } = require("./modules/seo/weeklySeoEngine");
const { writeWeeklySocialPlan } = require("./modules/content/socialWriter");
const { getCitationList } = require("./modules/offpage/citationSubmitter");

// ============================================
// INTERACTIVE MENU
// ============================================
async function showMenu() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = () => {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 MANUAL COMMANDS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  7  — Test scrape: Koramangala (5 leads)");
    console.log("  8  — Full scrape: 5 areas + process + dedup");
    console.log("  9  — Send WhatsApp outreach (hot leads today)");
    console.log("  10 — Check WhatsApp replies");
    console.log("  11 — Run Instagram outreach");
    console.log("  12 — Run LinkedIn outreach");
    console.log("  0  — Exit\n");

    rl.question("Choose: ", async (choice) => {
      switch (choice.trim()) {
        case "7":
          console.log(
            "\n🗺️  Test scrape: Koramangala restaurants (5 leads)...",
          );
          try {
            const testLeads = await scrapeOne("Koramangala", "restaurants", 5);
            const testProcessed = await processLeads(testLeads, false);
            const allTest = [
              ...testProcessed.hot_leads,
              ...testProcessed.warm_leads,
            ];
            await deduplicateLeads(allTest);
          } catch (e) {
            console.error("❌ Scrape failed:", e.message);
          }
          break;

        case "8":
          console.log("\n🗺️  Full scrape: 5 areas, restaurants + cafes...");
          try {
            const rawLeads = await runFullScrape({
              areas: [
                "Koramangala",
                "Indiranagar",
                "HSR Layout",
                "Jayanagar",
                "JP Nagar",
              ],
              searchTypes: ["restaurants", "cafes"],
              maxPerSearch: 15,
            });
            const processed = await processLeads(rawLeads, false);
            const allLeads = [...processed.hot_leads, ...processed.warm_leads];
            await deduplicateLeads(allLeads);
          } catch (e) {
            console.error("❌ Full scrape failed:", e.message);
          }
          break;

        case "9":
          console.log("\n📱 Sending WhatsApp outreach to hot leads...");
          try {
            await sendDailyWhatsApp();
          } catch (e) {
            console.error("❌ WhatsApp outreach failed:", e.message);
          }
          break;

        case "10":
          console.log("\n📬 Checking WhatsApp replies...");
          try {
            await checkReplies();
          } catch (e) {
            console.error("❌ Reply check failed:", e.message);
          }
          break;

        case "11":
          console.log("\n📸 Running Instagram outreach...");
          try {
            await runInstagramOutreach();
          } catch (e) {
            console.error("❌ Instagram outreach failed:", e.message);
          }
          break;

        case "12":
          console.log("\n💼 Running LinkedIn outreach...");
          try {
            await runLinkedInOutreach();
          } catch (e) {
            console.error("❌ LinkedIn outreach failed:", e.message);
          }
        case "13":
          await scrapeEmailsForLeads(20);
          break;

        case "14":
          await auditWarmLeads(5);
          break;

        case "15":
          await publishApprovedDrafts();
          break;

        case "16":
          const keywords = await researchKeywords({
            name: "Test Restaurant",
            area: "Koramangala",
            category: "restaurant",
          });
          console.log("Keywords found:", keywords.length);
          break;

        case "17":
          const audit = await runTechnicalAudit("naisora.com");
          console.log("Technical audit:", audit);
          break;

        case "18":
          await runWeeklySeoForAllClients();
          break;

        case "0":
          console.log("👋 Stopping agent. Bye!");
          rl.close();
          process.exit(0);

        default:
          console.log("❌ Invalid choice. Enter a number from the menu.");
      }

      ask(); // show menu again after each action
    });
  };

  ask();
}

// ============================================
// STARTUP
// ============================================
async function startAgent() {
  console.clear();
  console.log("╔════════════════════════════════════════╗");
  console.log("║       NAISORA AI AGENT — v2.0          ║");
  console.log("║   AI-Powered Web Design Agency Bot     ║");
  console.log("╚════════════════════════════════════════╝\n");
  console.log("🚀 Starting up...\n");
  console.log("─".repeat(42));

  console.log("\n📡 Testing all connections...\n");

  const results = {
    claude: false,
    database: false,
    gmail: false,
    telegram: false,
  };

  // Test Claude AI
  try {
    await testClaude();
    results.claude = true;
  } catch (e) {
    console.error("❌ Claude failed — add ANTHROPIC_API_KEY to .env");
  }

  // Test Database
  try {
    results.database = await testDatabase();
  } catch (e) {
    console.error(
      "❌ Database failed — check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env",
    );
  }

  // Test Gmail
  try {
    results.gmail = await testGmail();
  } catch (e) {
    console.error("❌ Gmail failed — will connect after Week 3");
  }

  // Test Telegram
  try {
    await testTelegram();
    results.telegram = true;
  } catch (e) {
    console.error(
      "❌ Telegram failed — check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env",
    );
  }

  // Show status
  console.log("\n" + "─".repeat(42));
  console.log("📊 CONNECTION STATUS:\n");
  console.log(
    `  🧠 Claude AI:    ${results.claude ? "✅ Connected" : "❌ Failed"}`,
  );
  console.log(
    `  🗃️  Database:     ${results.database ? "✅ Connected" : "❌ Failed"}`,
  );
  console.log(
    `  📧 Gmail:        ${results.gmail ? "✅ Connected" : "❌ Failed"}`,
  );
  console.log(
    `  📲 Telegram:     ${results.telegram ? "✅ Connected" : "❌ Failed"}`,
  );

  // ── Only Database is critical — everything else is optional ──
  if (!results.database) {
    console.log("\n❌ Database connection failed. Cannot start agent.");
    console.log("Fix SUPABASE_URL and SUPABASE_SERVICE_KEY in .env\n");
    process.exit(1);
  }

  if (!results.claude) {
    console.log("\n⚠️  Claude API not connected — AI features disabled.");
    console.log("Add ANTHROPIC_API_KEY to .env when ready.\n");
  }

  if (!results.gmail) {
    console.log("⚠️  Gmail not connected — email features disabled.");
    console.log("Will connect after Week 3.\n");
  }

  console.log("\n" + "─".repeat(42));
  console.log("✅ Agent starting with available connections...");
  console.log("─".repeat(42) + "\n");

  // Start all scheduled jobs
  startAllJobs();

  console.log("─".repeat(42));
  console.log("\n🤖 Naisora Agent is live. Press Ctrl+C to stop.\n");

  // Show interactive menu
  showMenu();
}

// ============================================
// RUN
// ============================================
startAgent().catch((error) => {
  console.error("\n💥 Fatal error starting agent:", error.message);
  console.error(error.stack);
  process.exit(1);
});
