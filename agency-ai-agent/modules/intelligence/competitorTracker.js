// modules/intelligence/competitorTracker.js
// Tracks competing web agencies in Bangalore monthly

// Load .env directly — dotenv was adding hidden \r characters to keys
const fs = require('fs');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const cleaned = line.replace(/\r/g, '').trim();
    if (cleaned && !cleaned.startsWith('#') && cleaned.includes('=')) {
      const [key, ...rest] = cleaned.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
}
const { askClaudeSonnet } = require('../../config/claude');
const { sendMessage } = require('../../config/telegram');

const BANGALORE_AGENCIES = [
  { name: 'Generic Bangalore web agency', website: 'competitor1.com' },
  { name: 'Local freelancer competition', website: 'competitor2.com' },
];

async function generateCompetitorReport() {
  const prompt = `Generate a competitive analysis for Naisora, an AI web design agency in Bangalore targeting restaurants.

Context:
- Naisora's advantage: AI automation, restaurant niche focus, affordable pricing (₹8,000 website)
- Main competitors: freelance web designers, generic digital agencies, Fiverr sellers

Analyse:
1. What are freelance designers typically charging for restaurant websites in Bangalore?
2. What do generic agencies offer that Naisora doesn't?
3. What does Naisora offer that nobody else does?
4. What's the biggest competitive threat to Naisora in the next 6 months?
5. Top 3 ways to differentiate Naisora more strongly

Be specific and honest about weaknesses too.`;

  const response = await askClaudeSonnet(prompt);

  const { sendMessage } = require('../../config/telegram');
await sendMessage(
  `🔍 *Competitor Report*\n\n${response.substring(0, 3500)}`
);

  return response;
}

module.exports = { generateCompetitorReport };