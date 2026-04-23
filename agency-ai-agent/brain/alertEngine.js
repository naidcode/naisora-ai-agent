// brain/alertEngine.js
// Naisora AI Growth OS — Autonomous Alert System
// Filters noise and only alerts on critical business events

const { sendMessage } = require('../config/telegram');

const AlertEngine = {
  async notifyHighValueLead(lead, score) {
    if (score > 80) {
      const msg = `🔥 *HIGH-VALUE LEAD DETECTED*\n\n` +
                  `Business: ${lead.business_name}\n` +
                  `Score: ${score}/100\n` +
                  `Potential: High (Needs priority outreach)`;
      await sendMessage(msg);
    }
  },

  async notifyRevenue(amount, source) {
    const msg = `💰 *REVENUE GENERATED*\n\n` +
                `Amount: ₹${amount}\n` +
                `Source: ${source}\n` +
                `The machine is working! 🚀`;
    await sendMessage(msg);
  },

  async notifyPerformanceDrop(metric, value) {
    const msg = `🚨 *PERFORMANCE ALERT*\n\n` +
                `${metric} has dropped to ${value}.\n` +
                `MasterBrain is re-adjusting strategy.`;
    await sendMessage(msg);
  }
};

module.exports = AlertEngine;
