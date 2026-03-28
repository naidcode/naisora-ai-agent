// config/llmRouter.js
// Decides which AI model handles each task
// SONNET = important work (client sees it)
// HAIKU  = internal work (agent uses it)

const { askClaude, askClaudeSonnet, askClaudeWithSystem } = require('./claude');

// Tasks that use SONNET (premium — client-facing)
const SONNET_TASKS = [
  'cold_email',        // emails restaurant owners
  'seo_audit',         // full SEO report
  'blog_post',         // 1500-word blog
  'client_report',     // monthly report
  'reply_analysis',    // analysing client replies
  'intelligence',      // client intelligence report
  'social_caption',    // Instagram/Facebook captions
];

// Tasks that use HAIKU (cheap — internal only)
const HAIKU_TASKS = [
  'telegram_alert',    // internal Telegram messages
  'lead_score',        // scoring a lead
  'categorise',        // yes/no decisions
  'followup_email',    // Day 3 and Day 7 follow-ups
  'summary',           // quick summaries
];

async function route(taskType, prompt, systemPrompt = null) {
  if (SONNET_TASKS.includes(taskType)) {
    console.log(`🧠 [Router] ${taskType} → Sonnet`);
    return await askClaudeSonnet(prompt, systemPrompt);
  } else {
    console.log(`⚡ [Router] ${taskType} → Haiku`);
    if (systemPrompt) {
      return await askClaudeWithSystem(systemPrompt, prompt);
    }
    return await askClaude(prompt);
  }
}

module.exports = { route, SONNET_TASKS, HAIKU_TASKS };