// distribution/repurposer.js
// Naisora AI Growth OS — Content Distribution
// Maximizes ROI of every piece of content by repurposing

const { askClaudeSonnet } = require('../config/claude');

async function repurposeBlog(blogContent) {
  console.log('🔄 [Repurposer] Distributing content across channels...');

  const prompt = `Repurpose this blog post into 3 formats:
    1. A viral LinkedIn post (using the 'hook-value-cta' structure).
    2. An Instagram Reel script (hook, 3 tips, outro).
    3. A Twitter/X thread (5-7 tweets).
    
    Blog Content: ${blogContent.substring(0, 2000)}...
  `;

  try {
    const repurposed = await askClaudeSonnet(prompt);
    return repurposed;
  } catch (err) {
    console.error('Repurposing Failed:', err.message);
    return null;
  }
}

module.exports = { repurposeBlog };
