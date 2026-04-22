// modules/content/hookGenerator.js
// Naisora AI Agent — Hook Generator
// Generates 5 attention-grabbing hooks for short-form content

const { askClaudeSonnet } = require('../../config/claude');

async function generateHooks(script) {
  console.log('🪝 Generating hooks...');
  
  const systemPrompt = `You are a viral content strategist specializing in short-form video (Reels/TikTok). 
Your task is to write 5 different high-converting hooks for a video script aimed at restaurant owners.`;

  const userPrompt = `Based on this script, give me 5 different hook variations (the first 3 seconds of the video):
---
${script}
---

Output as a JSON array of strings only.`;

  try {
    const hooksRaw = await askClaudeSonnet(userPrompt, systemPrompt, 300);
    // Attempt to parse JSON
    try {
        const hooks = JSON.parse(hooksRaw.replace(/```json|```/g, '').trim());
        return hooks;
    } catch (e) {
        return hooksRaw.split('\n').filter(line => line.trim()).slice(0, 5);
    }
  } catch (error) {
    return [
      "Still paying 25% commission? Stop it.",
      "The secret Bangalore restaurant owners won't tell you.",
      "Why your cafe isn't making money despite being full.",
      "Google Maps is your most important employee. Here's why.",
      "Stop hiring influencers that don't bring sales."
    ];
  }
}

module.exports = { generateHooks };
