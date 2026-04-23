// modules/offpage/citationSubmitter.js
// Submits restaurant to free local directories

require('dotenv').config();
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

// Free Indian local directories for restaurants
const DIRECTORIES = [
  { name: 'JustDial', url: 'https://www.justdial.com/add-free-listing', manual: true },
  { name: 'Sulekha', url: 'https://www.sulekha.com/free-listing', manual: true },
  { name: 'IndiaMART', url: 'https://seller.indiamart.com/register/', manual: true },
  { name: 'TradeIndia', url: 'https://www.tradeindia.com/free-listing/', manual: true },
  { name: 'Yellow Pages India', url: 'https://www.yellowpages.in/free-listing', manual: true },
  { name: 'Google Business Profile', url: 'https://business.google.com', manual: false, automated: true },
  { name: 'Bing Places', url: 'https://www.bingplaces.com', manual: true },
];

async function getCitationList(restaurant) {
  console.log(`\n📋 Citation list for ${restaurant.name}:`);
  console.log('━'.repeat(50));

  const message = `📋 *Citation Submissions — ${restaurant.name}*\n\n` +
    `Submit to these directories:\n\n` +
    DIRECTORIES.map((d, i) => `${i + 1}. ${d.name}\n   ${d.url}`).join('\n\n') +
    `\n\nBusiness info to use:\n` +
    `Name: ${restaurant.name}\n` +
    `Address: ${restaurant.address || restaurant.area + ', Bangalore'}\n` +
    `Phone: ${restaurant.phone}\n` +
    `Category: ${restaurant.category || 'Restaurant'}\n` +
    `Website: ${restaurant.website || 'Not yet'}\n\n` +
    `⚠️ Keep NAP (Name, Address, Phone) EXACTLY the same on every directory.`;

  await sendTelegramAlert(message);
  return DIRECTORIES;
}

module.exports = { getCitationList, DIRECTORIES };