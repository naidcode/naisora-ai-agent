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

module.exports = { validateContentIdeas };
