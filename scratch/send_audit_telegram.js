const { sendMessage } = require('../agency-ai-agent/config/telegram');

const auditMessage = `
🔍 <b>FULL AUDIT: naisora.com</b> 🚀
━━━━━━━━━━━━━━━━━━━━━━

📊 <b>OVERALL HEALTH: 89/100 (A-)</b>
━━━━━━━━━━━━━━━━━━━━━━

✅ <b>STRENGTHS:</b>
• Premium aesthetic & consistency
• Strong SEO foundation (Schema, Meta tags)
• Mobile-first architecture
• Smooth scrolling & micro-animations

🚨 <b>CRITICAL ISSUES:</b>
• <b>Image Sizes:</b> Some images up to 900KB (Impacts LCP)
• <b>Unoptimized Images:</b> next.config.mjs has unoptimized: true
• <b>Redundancy:</b> Navbar mobile logic duplicated (2x code)
• <b>Manual Maintenance:</b> Sitemap.xml is manual

📈 <b>TOP RECOMMENDATIONS:</b>
1. Compress images & convert to .webp
2. Fix Navbar code duplication
3. Automate Sitemap generation
4. Add Article & FAQ schema

━━━━━━━━━━━━━━━━━━━━━━
<i>Audit completed by Naisora AI Agent</i>
`.trim();

async function run() {
    console.log("Sending audit alert to Telegram...");
    await sendMessage(auditMessage);
    console.log("Done!");
}

run();
