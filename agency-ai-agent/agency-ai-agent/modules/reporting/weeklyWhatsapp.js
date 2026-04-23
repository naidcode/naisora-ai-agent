// modules/reporting/weeklyWhatsapp.js
// Sends weekly WhatsApp report to clients every Sunday 7 PM

const { route } = require('../../config/llmRouter');
const { sendWhatsApp } = require('../outreach/whatsappSender');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function sendWeeklyWhatsAppReport(client) {
  const prompt = `Write a short WhatsApp weekly update for a restaurant client.

Restaurant: ${client.business_name}
Week: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}

Keep it simple — 5 bullet points max:
• What was done this week (blogs, SEO fixes, etc.)
• Current website score if available
• One good result or improvement
• What's happening next week
• Any action needed from them (approve blogs, share photos, etc.)

Sound like a real person giving a friendly update, not a corporate report.
End with: — Nahid, Naisora`;

  try {
    const message = await route('whatsapp_followup', prompt, null, 200);

    if (client.phone) {
      await sendWhatsApp(
        { id: client.lead_id, phone: client.phone, business_name: client.business_name },
        message
      );
      console.log(`✅ Weekly WhatsApp sent to ${client.business_name}`);
    }

    return message;
  } catch (err) {
    console.error(`Failed to send weekly report to ${client.business_name}: ${err.message}`);
  }
}

async function sendWeeklyReportsToAllClients() {
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active');

  if (!clients || clients.length === 0) return;

  for (const client of clients) {
    await sendWeeklyWhatsAppReport(client);
    await new Promise(r => setTimeout(r, 5000));
  }
}

module.exports = { sendWeeklyWhatsAppReport, sendWeeklyReportsToAllClients };