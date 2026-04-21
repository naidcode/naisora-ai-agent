// modules/content/imageGenerator.js
// Generates image prompts for blog posts and social media
// Uses Groq (free) to write prompts, then Gemini/Stability for images

const { route } = require('../../config/llmRouter');

// 8-component prompt framework
const PROMPT_SYSTEM = `You write image generation prompts for restaurant marketing.
Use this framework: Subject + Style + Mood + Lighting + Colors + Composition + Background + Quality
Keep prompts under 100 words. Be specific and visual.`;

async function generateBlogImagePrompt(blogTitle, restaurant) {
  const prompt = `Write an image generation prompt for this restaurant blog post.

Blog title: ${blogTitle}
Restaurant: ${restaurant.name}
Type: ${restaurant.category || 'restaurant'}
Location: ${restaurant.area}, Bangalore

Generate a food photography prompt that would work as a featured image.
Style: Professional food photography, appetizing, warm lighting.
No text in the image.`;

  return await route('image_prompt', prompt, PROMPT_SYSTEM, 150);
}

async function generateSocialImagePrompt(caption, restaurant) {
  const prompt = `Write an image generation prompt for an Instagram post.

Caption theme: ${caption}
Restaurant: ${restaurant.name}
Type: ${restaurant.category || 'restaurant'}

Style: Instagram-worthy, vibrant, appetizing food photography.`;

  return await route('image_prompt', prompt, PROMPT_SYSTEM, 150);
}

module.exports = { generateBlogImagePrompt, generateSocialImagePrompt };