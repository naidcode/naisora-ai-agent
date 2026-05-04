// Load .env directly — dotenv was adding hidden \r characters to keys
const fs = require('fs');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !key.trim().startsWith('#')) {
      process.env[key.trim()] = rest.join('=').replace(/\r/g, '').trim();
    }
  });
}
const Anthropic = require('@anthropic-ai/sdk');

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// HAIKU — internal tasks (cheap, fast)
async function askClaude(prompt, maxTokens = 1000) {
  const msg = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  });
  return msg.content[0].text;
}

// SONNET — important work (client-facing)
async function askClaudeSonnet(prompt, systemPrompt = null, maxTokens = 2000) {
  const params = {
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  };
  if (systemPrompt) params.system = systemPrompt;
  const msg = await claude.messages.create(params);
  return msg.content[0].text;
}

// Helper with system prompt for Haiku
async function askClaudeWithSystem(systemPrompt, userPrompt, maxTokens = 1000) {
  const msg = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });
  return msg.content[0].text;
}

async function testConnection() {
  console.log('🧠 Testing Claude API...');
  const r = await askClaude('Reply with exactly: "Haiku connected!"');
  console.log('✅ Haiku:', r);
  const r2 = await askClaudeSonnet('Reply with exactly: "Sonnet connected!"');
  console.log('✅ Sonnet:', r2);
}

module.exports = { 
  askClaude, 
  askClaudeSonnet, 
  askClaudeWithSystem, 
  testConnection,
  callHaiku: askClaude 
};