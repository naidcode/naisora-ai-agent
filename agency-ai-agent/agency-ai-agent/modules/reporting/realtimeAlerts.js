// modules/reporting/realtimeAlerts.js
// Sends instant Telegram alerts for critical events

const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

async function alertRankingDrop(client, keyword, oldPosition, newPosition) {
  if (newPosition > oldPosition + 3) {
    await sendTelegramAlert(
      `⚠️ *Ranking Drop Alert*\n\n` +
      `Client: ${client.business_name}\n` +
      `Keyword: "${keyword}"\n` +
      `Was: #${oldPosition} → Now: #${newPosition}\n` +
      `Drop: ${newPosition - oldPosition} positions\n\n` +
      `Action needed: Check for Google algorithm update or content issues.`
    );
  }
}

async function alertNegativeReview(client, review) {
  await sendTelegramAlert(
    `⭐ *Negative Review Alert*\n\n` +
    `Client: ${client.business_name}\n` +
    `Rating: ${review.rating}/5\n` +
    `Review: "${review.text?.substring(0, 200)}"\n\n` +
    `Action: Draft a response and reply within 24 hours.`
  );
}

async function alertWebsiteDown(client, url) {
  await sendTelegramAlert(
    `🚨 *Website Down Alert*\n\n` +
    `Client: ${client.business_name}\n` +
    `URL: ${url}\n` +
    `Time: ${new Date().toLocaleString('en-IN')}\n\n` +
    `Action: Contact hosting provider immediately.`
  );
}

async function alertNewLead(lead) {
  await sendTelegramAlert(
    `🔥 *New Hot Lead*\n\n` +
    `Business: ${lead.business_name}\n` +
    `Area: ${lead.area}\n` +
    `Phone: ${lead.phone}\n` +
    `Score: ${lead.lead_score}/100\n` +
    `No website: ${!lead.has_website ? 'Yes ✅' : 'No'}`
  );
}

module.exports = { alertRankingDrop, alertNegativeReview, alertWebsiteDown, alertNewLead };