// outreach/smartOutreach.js
// Naisora AI Growth OS — Hyper-Personalized Outreach
// Generates data-driven messages that get replies

const { askClaudeSonnet } = require('../config/claude');

async function generateSmartMessage(lead, auditData = null) {
  console.log(`📱 [SmartOutreach] Generating personalized pitch for ${lead.business_name}`);

  const context = `
    Business: ${lead.business_name}
    Location: ${lead.city}
    Website: ${lead.website || 'No website'}
    SEO Score: ${auditData ? auditData.overall_score : 'Not audited'}
    Top Issue: ${auditData ? auditData.issues[0] : 'Needs foundational web presence'}
  `;

  const prompt = `Use this data to write a short, punchy 3-sentence outreach message for WhatsApp.
    Context: ${context}
    
    Rules:
    - Never sound like a salesperson.
    - Mention one specific detail from their location or business.
    - Focus on how fixing the 'Top Issue' makes their business look professional and helps local people find them.
    - End with a low-friction question (e.g., "Worth a 2-min chat about this?").
    
    TONE: Friendly, expert, local.`;

  try {
    const message = await askClaudeSonnet(prompt);
    return message;
  } catch (err) {
    console.error('Outreach Generation Failed:', err.message);
    return 'Hi, I noticed some issues with your website that are costing you customers. Can we talk?';
  }
}

module.exports = { generateSmartMessage };
