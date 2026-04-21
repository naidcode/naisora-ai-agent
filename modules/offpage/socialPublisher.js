// modules/offpage/socialPublisher.js
// Publishes GBP posts and tracks social activity

const { writeGBPPost } = require('../content/socialWriter');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

async function scheduleGBPPosts(restaurant) {
  const topics = [
    `${restaurant.name}'s special dish this week`,
    `Why customers love dining at ${restaurant.name}`,
    `Visit us in ${restaurant.area} — best ${restaurant.category} in Bangalore`,
  ];

  const posts = [];
  for (const topic of topics) {
    const post = await writeGBPPost(restaurant, topic);
    posts.push(post);
  }

  await sendTelegramAlert(
    `📱 *GBP Posts Ready — ${restaurant.name}*\n\n` +
    posts.map((p, i) => `Post ${i + 1}:\n${p}`).join('\n\n') +
    '\n\n👆 Post these to Google Business Profile manually.'
  );

  return posts;
}

module.exports = { scheduleGBPPosts };