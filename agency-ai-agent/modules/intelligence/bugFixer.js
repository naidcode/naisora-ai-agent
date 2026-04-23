// modules/intelligence/bugFixer.js
// Self-healing agent — fixes its own errors using Sonnet

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { route } = require('../../config/llmRouter');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

async function analyseBugAndFix(filePath, errorMessage, errorStack) {
  console.log(`\n🔧 Bug fixer activated for ${filePath}...`);

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');

    const prompt = `You are a Node.js debugging expert. Analyse this error and provide a fix.

File: ${filePath}
Error: ${errorMessage}
Stack: ${errorStack}

File content:
\`\`\`javascript
${fileContent}
\`\`\`

Provide:
1. Root cause of the error
2. Exact fix needed
3. The corrected code for the problematic section only

Be specific and precise.`;

    const analysis = await route('intelligence_report', prompt, null, 1000);

    await sendTelegramAlert(
      `🔧 *Bug Fix Analysis*\n\n` +
      `File: ${path.basename(filePath)}\n` +
      `Error: ${errorMessage.substring(0, 100)}\n\n` +
      `Analysis:\n${analysis.substring(0, 2000)}`
    );

    return analysis;
  } catch (err) {
    console.error('Bug fixer failed:', err.message);
    return null;
  }
}

// Wrap any function with self-healing error handling
function withBugFixer(fn, filePath) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error(`❌ Error in ${filePath}: ${err.message}`);
      await analyseBugAndFix(filePath, err.message, err.stack || '');
      throw err; // Re-throw after analysis
    }
  };
}

module.exports = { analyseBugAndFix, withBugFixer };