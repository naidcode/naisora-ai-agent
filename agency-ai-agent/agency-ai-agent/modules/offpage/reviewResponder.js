// modules/offpage/reviewResponder.js
// Drafts responses to Google reviews

const { route } = require('../../config/llmRouter');

const REVIEW_SYSTEM = `You write Google review responses for restaurants in Bangalore.
Rules:
1. Always thank the reviewer by name if provided
2. Positive reviews: warm, grateful, invite them back
3. Negative reviews: apologetic, professional, offer to make it right
4. Keep under 100 words
5. Sound like the restaurant owner, not a corporate PR team
6. End with an invitation to return or contact`;

async function respondToReview(review, restaurant) {
  const prompt = `Write a Google review response for this restaurant.

Restaurant: ${restaurant.name}
Review rating: ${review.rating}/5 stars
Reviewer name: ${review.author || 'Guest'}
Review text: "${review.text}"

Write a ${review.rating >= 4 ? 'positive grateful' : 'apologetic professional'} response.`;

  return await route('simple_reply', prompt, REVIEW_SYSTEM, 150);
}

module.exports = { respondToReview };