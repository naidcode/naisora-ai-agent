// modules/social/contentPlanner.js
// Naisora AI Agent — Weekly Content Planner
// Plans 7 days of content for Naisora's Instagram

const { route } = require('../../config/llmRouter');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

async function generateWeeklyContentPlan() {
  const prompt = `Create a 7-day Instagram content plan for Naisora, an AI web design agency in Bangalore targeting restaurant owners.

Week goals:
- Show expertise in restaurant web design
- Build trust with restaurant/cafe owners
- Attract leads who need websites

For each day provide:
- Content type (reel/carousel/static post/story)
- Topic and hook
- Key message
- Best posting time
- CTA

Mix of: AI agent demos, client results, restaurant tips, behind scenes, educational content.

Format as a clear daily plan.`;

  const plan = await route('client_report', prompt, null, 1000);

  await sendTelegramAlert(`📅 *Weekly Content Plan — Naisora*\n\n${plan.substring(0, 3500)}`);

  return plan;
}

module.exports = { generateWeeklyContentPlan };