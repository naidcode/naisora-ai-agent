const Anthropic = require('@anthropic-ai/sdk');
const { sendTelegram } = require('../../config/telegram');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Chained reasoning — breaks complex problems into steps
// Each step's output becomes the next step's input
// Used for: lead scoring decisions, client strategy, pricing negotiations, content strategy

const REASONING_CHAINS = {
  lead_qualify: {
    name: 'Lead qualification',
    steps: [
      'Analyse this restaurant lead and identify their top 3 business problems based on available data',
      'Based on those problems, determine which Naisora service fits best and why',
      'Calculate the estimated value this lead could bring to Naisora over 12 months',
      'Write a personalised outreach angle — one specific hook that will get their attention'
    ]
  },
  client_strategy: {
    name: 'Client growth strategy',
    steps: [
      'Analyse this client\'s current situation — what is working, what is not',
      'Identify the 3 biggest growth opportunities for their restaurant online',
      'Create a 90-day action plan prioritising the highest impact actions first',
      'Identify one upsell opportunity that naturally extends from current work'
    ]
  },
  pricing_decision: {
    name: 'Pricing and proposal',
    steps: [
      'Analyse the restaurant\'s size, location, and online presence to gauge their budget capacity',
      'Determine which Naisora package best solves their problem',
      'Calculate the ROI argument — how much extra revenue could our service generate',
      'Write a one-paragraph value proposition for this specific client'
    ]
  },
  content_strategy: {
    name: 'Content strategy for client',
    steps: [
      'Analyse the restaurant\'s target audience and their content consumption habits',
      'Identify the 3 content themes that will perform best for this restaurant',
      'Create a 4-week content calendar with specific topics for each slot',
      'Write 3 ready-to-use post hooks they can use immediately'
    ]
  }
};

async function runChain(chainType, context, verbose = false) {
  const chain = REASONING_CHAINS[chainType];

  if (!chain) {
    throw new Error(`Unknown chain type: ${chainType}. Available: ${Object.keys(REASONING_CHAINS).join(', ')}`);
  }

  console.log(`🧠 Running chained reasoning: ${chain.name}`);

  const results = [];
  let previousOutput = '';

  for (let i = 0; i < chain.steps.length; i++) {
    const step = chain.steps[i];
    console.log(`  Step ${i + 1}/${chain.steps.length}: ${step.slice(0, 50)}...`);

    const prompt = i === 0
      ? `${step}\n\nContext:\n${context}`
      : `${step}\n\nContext:\n${context}\n\nPrevious analysis:\n${previousOutput}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    const output = response.content[0].text;
    results.push({ step: i + 1, instruction: step, output });
    previousOutput = output;

    await new Promise(r => setTimeout(r, 500));
  }

  const finalOutput = results[results.length - 1].output;

  if (verbose) {
    // Send all steps to Telegram
    await sendTelegram(`🧠 *Chained Reasoning — ${chain.name}*\nContext: ${context.slice(0, 100)}...`);
    for (const result of results) {
      await sendTelegram(`*Step ${result.step}:*\n${result.output}`);
      await new Promise(r => setTimeout(r, 800));
    }
  } else {
    // Send only final output
    await sendTelegram(
      `🧠 *${chain.name} — Result*\n\n` +
      `Context: ${context.slice(0, 100)}...\n\n` +
      `${finalOutput}`
    );
  }

  return { chain: chain.name, steps: results, final: finalOutput };
}

async function run(params) {
  const {
    chainType = 'lead_qualify',
    context = '',
    verbose = false
  } = params;

  console.log('🧠 Starting chained reasoning...');

  try {
    const result = await runChain(chainType, context, verbose);
    console.log(`✅ Chained reasoning complete — ${result.steps.length} steps`);
    return result;
  } catch (error) {
    console.error('Chained reasoning error:', error.message);
    await sendTelegram(`❌ *Chained Reasoning Error*\n${error.message}`);
    throw error;
  }
}

module.exports = { run, runChain, REASONING_CHAINS };