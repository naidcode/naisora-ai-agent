// ============================================
// index.js — MAIN ENTRY POINT
// Naisora AI Agent v2.0
// Command: node index.js
// ============================================

require('dotenv').config();

const { testConnection: testClaude } = require("./config/claude");
const { testConnection: testDatabase } = require("./config/database");
const { testConnection: testEmail } = require("./config/smtp");
const { testConnection: testTelegram } = require("./config/telegram");
const { sendWhatsAppMessage } = require("./config/whatsapp");
const { startAllJobs } = require("./scheduler/cronJobs");
const {
  scrapeOne,
  runFullScrape,
} = require("./modules/scraper/googleMapsScraper");
const { processLeads } = require("./modules/scraper/leadProcessor");
const { deduplicateLeads } = require("./modules/scraper/leadDeduplicator");
const { sendDailyWhatsApp } = require("./modules/outreach/whatsappSender");
const { checkReplies } = require("./modules/outreach/replyReader");
const {
  runInstagramOutreach,
} = require("./modules/outreach/instagramOutreach");
const { runLinkedInOutreach } = require("./modules/outreach/linkedinOutreach");
const { generateDailyPriorities } = require("./modules/outreach/leadScorer");
const { scrapeEmailsForLeads } = require("./modules/scraper/emailScraper");
const { auditWarmLeads } = require("./modules/seo/seoAudit");
const { publishApprovedDrafts } = require("./modules/wordpress/blogPublisher");
const { researchKeywords } = require("./modules/seo/keywordResearch");
const { runTechnicalAudit } = require("./modules/seo/technicalAudit");
const { runWeeklySeoForAllClients } = require("./modules/seo/weeklySeoEngine");
const { getCitationList } = require("./modules/offpage/citationSubmitter");
const { generateDashboard } = require("./modules/tracking/dashboard");
const { runMonthlyMentorSession } = require("./modules/reporting/mentorLLM");
const {
  weeklyFinancialSummary,
} = require("./modules/reporting/financialTracker");
const { generateReelIdeas } = require("./modules/social/reelIdeasGenerator");
const { getRestaurantHashtags } = require("./modules/social/hashtagResearcher");
const { startAutoPilot } = require("./system/autoPilot");
const { selectBestLeads } = require("./brain/leadSelector");
const { runFollowUpEngine } = require("./modules/outreach/followUpEngine");
const { isStopped, stopAgent, startAgent: resumeAgent } = require("./system/masterSwitch");

// ─── Detect if running in Server Mode (no interactive menu) ─────────────
const IS_SERVER =
  process.env.SERVER_MODE === 'true' ||
  process.env.NODE_ENV === 'production' ||
  !!process.env.RAILWAY_ENVIRONMENT ||
  !!process.env.RAILWAY_SERVICE_NAME;

// ============================================
// INTERACTIVE MENU (local only — skipped in server mode)
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
    console.log("  13 — Scrape emails for leads with websites");
    console.log("  14 — Audit warm lead websites (SEO scores)");
    console.log("  15 — Publish approved blog drafts");
    console.log("  16 — Research keywords for a restaurant");
    console.log("  17 — Run technical audit on a website");
    console.log("  18 — Run weekly SEO engine (all clients)");
    console.log("  24 — 🔥 START AI GROWTH OS (Autonomous)");
    console.log("  25 — 🎯 Select top leads for today");
    console.log("  26 — 🔄 Run follow-up engine now");
    console.log("  27 — 📊 Generate mini audit for a lead");
    console.log(`  ${isStopped() ? "OFF" : "ON "} — [${isStopped() ? "🔴 STOPPED" : "🟢 ACTIVE"}] — ${isStopped() ? "99 (UNPAUSE AGENT)" : "99 (KILL SWITCH)"}`);
    console.log("  0  — Exit\n");

    rl.question("Choose: ", async (choice) => {
      try {
        switch (choice.trim()) {
          case "7": {
            console.log(
              "\n🗺️  Test scrape: Koramangala restaurants (5 leads)...",
            );
            const testLeads = await scrapeOne("Koramangala", "restaurants", 5);
            const testProcessed = await processLeads(testLeads, false);
            const allTest = [
              ...testProcessed.hot_leads,
              ...testProcessed.warm_leads,
            ];
            await deduplicateLeads(allTest);
            break;
          }

          case "8": {
            console.log("\n🗺️  Full scrape: 5 areas, restaurants + cafes...");
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
            const { getReadyLeads } = require("./modules/scraper/leadDeduplicator");
            const result = await getReadyLeads(rawLeads);
            console.log(`\n✅ Session Complete: ${result.newLeads.length} new, ${result.followUpLeads.length} follow-ups.`);
            break;
          }

          case "9":
            console.log("\n📱 Sending WhatsApp outreach to hot leads...");
            await sendDailyWhatsApp();
            break;

          case "10":
            console.log("\n📬 Checking WhatsApp replies...");
            await checkReplies();
            break;

          case "11":
            console.log("\n📸 Running Instagram outreach...");
            await runInstagramOutreach();
            break;

          case "12":
            console.log("\n💼 Running LinkedIn outreach...");
            await runLinkedInOutreach();
            break;

          case "13":
            console.log("\n📧 Scraping emails for leads...");
            await scrapeEmailsForLeads(20);
            break;

          case "14":
            console.log("\n🔍 Auditing warm lead websites...");
            await auditWarmLeads(5);
            break;

          case "15":
            console.log("\n📝 Publishing approved blog drafts...");
            await publishApprovedDrafts();
            break;

          case "16": {
            console.log("\n🔍 Researching keywords...");
            const keywords = await researchKeywords({
              name: "Test Restaurant",
              area: "Koramangala",
              category: "restaurant",
            });
            console.log("Keywords found:", keywords.length);
            break;
          }

          case "17": {
            console.log("\n⚙️  Running technical audit on naisora.com...");
            const techAudit = await runTechnicalAudit("naisora.com");
            console.log("Score:", techAudit.score + "/100");
            console.log(
              "Issues:",
              techAudit.issues.map((i) => i.issue).join(", ") || "None",
            );
            break;
          }

          case "18":
            console.log("\n🚀 Running weekly SEO engine...");
            await runWeeklySeoForAllClients();
            break;

          case "19":
            await generateDashboard();
            break;

          case "20":
            await runMonthlyMentorSession();
            break;

          case "21":
            await weeklyFinancialSummary();
            break;

          case "22": {
            const reels = await generateReelIdeas(5);
            console.log(reels);
            break;
          }

          case "23": {
            const tags = await getRestaurantHashtags();
            console.log(tags);
            break;
          }
            
          case "24":
            console.log("\n🚀 Initializing Naisora AI Growth OS...");
            await startAutoPilot();
            break;

          case "25": {
            console.log("\n🎯 Selecting top 50 leads for today...");
            const bestLeads = await selectBestLeads(50);
            console.log(`\nTop 5 leads:`);
            bestLeads.slice(0, 5).forEach((l, i) => {
              console.log(`  ${i + 1}. ${l.business_name} (${l.area}) — Score: ${l.computed_score}`);
            });
            break;
          }

          case "26": {
            console.log("\n🔄 Running follow-up engine...");
            const fuResult = await runFollowUpEngine();
            console.log(`Follow-ups sent: ${fuResult.sent}`);
            break;
          }

          case "27": {
            console.log("\n📊 Generating mini audit for test lead...");
            const auditLead = { id: 'test', business_name: 'Test Restaurant', area: 'Koramangala', category: 'restaurant', has_website: false, review_count: 15, rating: 3.9 };
            const miniAuditResult = await generateMiniAudit(auditLead);
            console.log(formatAuditForWhatsApp(auditLead, miniAuditResult));
            break;
          }

          case "99": {
            if (isStopped()) {
              resumeAgent();
            } else {
              stopAgent();
            }
            break;
          }

          case "0":
            console.log("👋 Stopping agent. Bye!");
            rl.close();
            process.exit(0);

          default:
            console.log("❌ Invalid choice. Enter a number from the menu.");
        }
      } catch (e) {
        console.error("❌ Error:", e.message);
      }

      ask();
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

  if (IS_SERVER) {
    console.log("🚀 Running in SERVER MODE — scheduler active\n");
  } else {
    console.log("💻 Running locally\n");
  }

  // Fix 3: Memory check
  const os = require('os');
  const freeRAM = os.freemem() / 1024 / 1024;
  console.log(`🧠 Free RAM: ${Math.round(freeRAM)}MB`);
  if (freeRAM < 200) {
    console.log('⚠️ Low RAM — skipping Puppeteer tasks (IG/LinkedIn) to prevent crash');
    process.env.SKIP_PUPPETEER = 'true';
  }

  console.log("🚀 Starting up...\n");
  console.log("─".repeat(42));
  
  if (isStopped()) {
    console.log("🛑 WARNING: Agent is currently STOPPED (Kill Switch is ON).");
    console.log("   Automation, crons, and cycles will be SKIPPED.");
    console.log("   To resume, use option 99 in the menu.\n");
  } else {
    console.log("🟢 STATUS: Agent is ACTIVE and ready.\n");
  }

  console.log("📡 Testing all connections...\n");

  const results = {
    claude: false,
    database: false,
    email: false,
    telegram: false
  };

  try {
    await testClaude();
    results.claude = true;
  } catch (e) {
    console.error("❌ Claude failed — add ANTHROPIC_API_KEY to .env");
  }

  try {
    results.database = await testDatabase();
  } catch (e) {
    console.error(
      "❌ Database failed — check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env",
    );
  }

  try {
    results.email = await testEmail();
  } catch (e) {
    console.error("❌ Email failed — check RESEND_API_KEY in .env");
  }

  try {
    await testTelegram();
    results.telegram = true;
  } catch (e) {
    console.error(
      "❌ Telegram failed — check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env",
    );
  }

  console.log("\n" + "─".repeat(42));
  console.log("📊 CONNECTION STATUS:\n");
  console.log(
    `  🧠 Claude AI:    ${results.claude ? "✅ Connected" : "❌ Failed"}`,
  );
  console.log(
    `  🗃️  Database:     ${results.database ? "✅ Connected" : "❌ Failed"}`,
  );
  console.log(
    `  📧 Email:        ${results.email ? "✅ Resend Ready" : "❌ Resend Failed"}`,
  );
  console.log(
    `  📲 Telegram:     ${results.telegram ? "✅ Connected" : "❌ Failed"}`,
  );
  console.log(
    `  📱 WhatsApp:     ☁️  Queue Mode (Server) / 💻 Service Mode (Local)`,
  );


  if (!results.database) {
    console.log("\n❌ Database connection failed. Cannot start agent.");
    console.log("Fix SUPABASE_URL and SUPABASE_SERVICE_KEY in .env\n");
    process.exit(1);
  }

  if (!results.claude) {
    console.log("\n⚠️  Claude API not connected — AI features disabled.");
    console.log("Add ANTHROPIC_API_KEY to .env when ready.\n");
  }

  if (!results.email) {
    console.log("⚠️  Email not connected — outreach features disabled.\n");
  }

  console.log("\n" + "─".repeat(42));
  console.log("✅ Agent starting...");
  console.log("─".repeat(42) + "\n");


  console.log("─".repeat(42));
  console.log("\n🤖 Naisora Agent is live.\n");

  // ── On Server: keep process alive, no interactive menu ──
  if (IS_SERVER) {
    console.log(
      "☁️  Server mode — cron jobs running, waiting for scheduled tasks...",
    );
    console.log("📱 You will receive Telegram alerts for all activity.\n");

    // Start all scheduled cron jobs (Fix 1: Moved after server check)
    startAllJobs();

    // Keep process alive
    // Keep alive + start HTTP
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/status', (req, res) => res.json({ status: 'running', uptime: process.uptime() }))
app.get('/ping', (req, res) => res.send('ok'))

// ── UltraMsg Webhook Handler ──
app.post('/webhooks/whatsapp', async (req, res) => {
  try {
    const data = req.body;
    // UltraMsg format: data.data contains message details
    // For 'chat' messages, data.event_type is 'message_received'
    if (data.event_type === 'message_received') {
      const msg = data.data;
      if (msg && !msg.fromMe) {
        const phone = msg.from.split('@')[0].replace(/\D/g, ''); // Clean phone
        // Match phone with or without country code
        // Simple logic: if phone starts with 91, also check without 91
        const cleanPhone = phone.startsWith('91') && phone.length > 10 ? phone.substring(2) : phone;
        
        const text = msg.body;
        console.log(`📩 Webhook: Message from ${phone}: ${text}`);

        if (text) {
          const { handleWhatsAppReply } = require('./modules/outreach/whatsappAutoReply');
          const aiResponse = await handleWhatsAppReply(cleanPhone, text);
          
          if (aiResponse) {
            const { sendUltraMsg } = require('./config/ultramsg');
            await sendUltraMsg(phone, aiResponse);
            console.log(`🤖 Auto-replied to ${phone}`);
          }
        }
      }
    }
    res.status(200).send('ACK');
  } catch (err) {
    console.error('Webhook Error:', err.message);
    res.status(500).send('Error');
  }
});

app.listen(process.env.PORT || 3000, '0.0.0.0')
  } else {
    // Local: show interactive menu
    console.log("💻 Local mode — showing interactive menu...\n");
    
    // Start all scheduled cron jobs (Fix 1: Moved after server check)
    startAllJobs();

    showMenu();
  }
}

// ============================================
// RUN
// ============================================
startAgent().catch((error) => {
  console.error("\n💥 Fatal error starting agent:", error.message);
  console.error(error.stack);
  process.exit(1);
});
