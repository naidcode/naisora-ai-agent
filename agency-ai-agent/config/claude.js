require("dotenv").config();
const Anthropic = require('@anthropic-ai/sdk');

const client = new BedrockRuntimeClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ── Core Bedrock caller
async function callBedrock(
  modelId,
  prompt,
  systemPrompt = null,
  maxTokens = 1000,
) {
  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (systemPrompt) body.system = systemPrompt;

  const response = await client.send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body),
    }),
  );

  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.content[0].text;
}

// ── HAIKU — internal tasks (cheap, fast)
// Use for: Telegram alerts, lead categorisation, yes/no decisions
async function askClaude(prompt, maxTokens = 1000) {
  return await callBedrock(
    "us.anthropic.claude-3-5-haiku-20241022-v1:0",
    prompt,
    null,
    maxTokens,
  );
}

// ── SONNET — important work (client-facing)
// Use for: cold emails, SEO audits, blog posts, client reports
async function askClaudeSonnet(prompt, systemPrompt = null, maxTokens = 2000) {
  return await callBedrock(
    "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    prompt,
    systemPrompt,
    maxTokens,
  );
}

// ── Helper with system prompt (for Haiku)
async function askClaudeWithSystem(systemPrompt, userPrompt, maxTokens = 1000) {
  return await callBedrock(
    "us.anthropic.claude-3-5-haiku-20241022-v1:0",
    userPrompt,
    systemPrompt,
    maxTokens,
  );
}

async function testConnection() {
  console.log("🧠 Testing Claude via AWS Bedrock...");
  const r = await askClaude('Reply with exactly: "Haiku connected!"');
  console.log("✅ Haiku:", r);
  const r2 = await askClaudeSonnet('Reply with exactly: "Sonnet connected!"');
  console.log("✅ Sonnet:", r2);
}

module.exports = {
  askClaude,
  askClaudeSonnet,
  askClaudeWithSystem,
  testConnection,
};
