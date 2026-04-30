// modules/reporting/billingAlerter.js
// Monitors all subscriptions and API costs — never get surprised

require('dotenv').config();
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

// Monthly subscriptions to monitor
const SUBSCRIPTIONS = [
  { name: 'Hostinger Hosting', cost: 125, renewalDay: 1 },
  { name: 'Google Workspace', cost: 125, renewalDay: 1 },
  { name: 'Domain (naisora.com)', cost: 83, renewalDay: 15 },
  { name: 'Railway.app', cost: 0, renewalDay: 1, note: 'Free tier — monitor usage' },
  { name: 'UltraMsg WhatsApp', cost: 2500, renewalDay: 1, note: 'Monthly subscription' },
];

async function checkUpcomingRenewals() {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const upcoming = SUBSCRIPTIONS.filter(sub => {
    const renewalDate = new Date(today.getFullYear(), today.getMonth(), sub.renewalDay);
    return renewalDate >= today && renewalDate <= nextWeek;
  });

  if (upcoming.length > 0) {
    await sendTelegramAlert(
      `💳 *Upcoming Renewals — Next 7 Days*\n\n` +
      upcoming.map(s => `• ${s.name}: ₹${s.cost}/month${s.note ? '\n  Note: ' + s.note : ''}`).join('\n') +
      `\n\nTotal: ₹${upcoming.reduce((sum, s) => sum + s.cost, 0)}`
    );
  }
}

async function weeklyCostSummary() {
  const totalMonthly = SUBSCRIPTIONS.reduce((sum, s) => sum + s.cost, 0);

  await sendTelegramAlert(
    `💰 *Monthly Cost Summary — Naisora*\n\n` +
    SUBSCRIPTIONS.map(s => `• ${s.name}: ₹${s.cost}`).join('\n') +
    `\n\nTotal fixed costs: ₹${totalMonthly}/month\n` +
    `Variable: Claude API (~₹500)\n` +
    `Total estimate: ₹${totalMonthly + 500}/month\n\n` +
    `Break-even: 1 client paying ₹3,500/month`
  );
}

module.exports = { checkUpcomingRenewals, weeklyCostSummary };