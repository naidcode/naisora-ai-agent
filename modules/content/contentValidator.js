// modules/content/contentValidator.js
// Naisora AI Agent — Content Validator
// Filters and scores content ideas based on relevance and engagement

async function validateContentIdeas(ideas) {
  console.log('⚖️ Validating content ideas...');
  
  const validated = ideas.filter(idea => {
    // Basic logic: must have high engagement and clear relevance
    const isRelevant = idea.source && idea.url;
    const isHighEngagement = idea.engagement_score >= 80;
    
    return isRelevant && isHighEngagement;
  });

  console.log(`✅ Validated ${validated.length} / ${ideas.length} ideas.`);
  return validated;
}

function validateIdea(idea) {
  let score = 0;
  if (idea.source) score += 30;
  if (idea.engagement_score) score += idea.engagement_score * 0.7;
  return Math.min(Math.round(score), 100);
}

module.exports = { validateContentIdeas, validateIdea };
