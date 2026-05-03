const { db } = require('../database/database');

/**
 * Detect if a message is an automated reply (Level 2)
 */
async function isAutoReply(leadId, message, responseTime) {
  const text = message.toLowerCase();
  
  const keywords = [
    "thank you for contacting",
    "automated message",
    "we will get back",
    "auto reply",
    "out of office",
    "busy at the moment",
    "delivery status",
    "notification"
  ];

  const keywordMatch = keywords.some(k => text.includes(k));
  const fastReply = responseTime < 1500;

  // Level 2: Check for repeated messages
  const history = await db.conversations.getHistory(leadId);
  const repeated = history.filter(m => m === message).length >= 2;

  // Level 2: Template-like (very short or very specific patterns)
  const templateLike = message.length < 30 || (message.length < 120 && keywordMatch);

  const autoDetected = (keywordMatch && fastReply) || repeated || templateLike;
  
  return autoDetected;
}

/**
 * Handle incoming replies from leads
 */
async function handleReply(leadId, message, responseTime) {
  const isAuto = await isAutoReply(leadId, message, responseTime);

  let convo = await db.conversations.findByLead(leadId);

  // If no conversation exists yet, create one
  if (!convo) {
    convo = {
      id: leadId + '_convo',
      leadId: leadId,
      lastMessage: message,
      isAutoReply: isAuto,
      isClosed: isAuto,
      messageCount: 1,
      lastResponseTime: responseTime,
      createdAt: new Date()
    };
    await db.conversations.insert(convo);
  } else {
    const updates = {
      lastMessage: message,
      messageCount: (convo.messageCount || 0) + 1,
      lastResponseTime: responseTime
    };

    if (isAuto) {
      updates.isAutoReply = true;
      updates.isClosed = true;
    }

    if (updates.messageCount > 3) {
      updates.isClosed = true;
    }

    await db.conversations.update(convo.id, updates);
  }

  if (isAuto) {
    console.log(`🤖 Auto-reply detected for lead ${leadId}. Marking as do_not_engage.`);
    await db.leads.update(leadId, { do_not_engage: true });
    return;
  }

  if (convo && convo.messageCount > 3) {
    console.log(`🛡️ Message limit reached for lead ${leadId}. Closing conversation.`);
    return;
  }

  console.log(`📩 Normal reply from lead ${leadId}: ${message}`);
}

module.exports = {
  isAutoReply,
  handleReply
};
