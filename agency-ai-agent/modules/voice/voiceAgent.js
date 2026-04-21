// modules/voice/voiceAgent.js
// Naisora AI Agent — Voice Booking Agent
// Uses ElevenLabs + Vapi for restaurant table booking via phone
// Placeholder — full implementation in Week 8 when first client onboards

require('dotenv').config();
const { route } = require('../../config/llmRouter');

// ─── Generate voice agent script for a restaurant ────────────────────────────
async function generateVoiceScript(restaurant) {
  const prompt = `Write a phone call script for an AI voice agent that handles table bookings for ${restaurant.name} in ${restaurant.area}, Bangalore.

The voice agent should:
1. Greet callers warmly as ${restaurant.name}
2. Ask for: name, date, time, number of guests
3. Confirm availability (always say yes for now)
4. Confirm the booking details
5. Thank and end call professionally

Write the complete script with agent lines and expected customer responses.
Keep it natural and conversational — this will be spoken by an AI voice.`;

  return await route('client_report', prompt, null, 800);
}

// ─── Handle incoming booking (webhook from Vapi) ──────────────────────────────
async function handleBookingWebhook(bookingData) {
  // Called when Vapi sends a booking confirmation
  console.log('📞 New voice booking received:', bookingData);

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // Save booking to database
  await supabase.from('seo_reports').insert({
    report_type: 'voice_booking',
    report_data: bookingData,
    summary: `Voice booking: ${bookingData.name} — ${bookingData.date}`,
  });

  const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
  await sendTelegramAlert(
    `📞 *New Voice Booking*\n\n` +
    `Restaurant: ${bookingData.restaurant}\n` +
    `Name: ${bookingData.name}\n` +
    `Date: ${bookingData.date}\n` +
    `Time: ${bookingData.time}\n` +
    `Guests: ${bookingData.guests}`
  );
}

module.exports = { generateVoiceScript, handleBookingWebhook };