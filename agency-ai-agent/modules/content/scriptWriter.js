// modules/content/scriptWriter.js
// Naisora AI Agent — Script Writer
// Writes reel scripts in Nahid's punchy, direct voice

const { askClaudeSonnet } = require('../../config/claude');

async function writeReelScript(idea) {
  console.log(`✍️  Writing script for: ${idea.url}`);
  
  const systemPrompt = `You are Nahid Pasha, a young, direct, and punchy founder of Naisora, a restaurant marketing agency in Bangalore.
Voice style:
- Fast-paced, no fluff
- Direct but supportive of restaurant owners
- Mixed punchy English with natural Bangalore/Indian expressions (e.g., using "da", "scene", "boss" appropriately if it fits, but keep it professional-modern)
- Focus on ROI and direct orders, not just "likes"`;

  const userPrompt = `Write a 60-second Instagram Reel script for a restaurant owner.
Topic/Idea: ${idea.meta_info || 'Reducing Zomato/Swiggy commission dependency'}

Structure:
1. Strong Hook (3 seconds)
2. The Pain Point (Why current way is failing)
3. The Solution (Naisora's approach)
4. Key Action Steps
5. Call to Action (DM "NAISORA" to start)

Keep it short, high-energy, and Bangalore-targeted.`;

  try {
    const script = await askClaudeSonnet(userPrompt, systemPrompt, 500);
    return script;
  } catch (error) {
    console.error('❌ Script writing failed:', error.message);
    return `[Hook] Stop paying 30% to delivery apps!
[Problem] You're working 14 hours a day but Zomato is taking half your profit. That's not a business, that's a charity.
[Solution] At Naisora, we build your own direct ordering system. Real customer data, zero commission.
[Steps] 1. Get your own link. 2. Push it on Insta. 3. Watch the profit stay with YOU.
[CTA] DM "NAISORA" and let's fix your margins today.`;
  }
}

module.exports = { writeReelScript };
