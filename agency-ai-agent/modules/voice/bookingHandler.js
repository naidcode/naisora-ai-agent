// modules/voice/bookingHandler.js
// Handles restaurant bookings from voice agent

const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function processBooking(booking) {
  console.log(`📅 Processing booking for ${booking.restaurant}...`);

  // Save to database
  await supabase.from('seo_reports').insert({
    report_type: 'booking',
    report_data: booking,
    summary: `Booking: ${booking.name}, ${booking.guests} guests, ${booking.date} at ${booking.time}`,
  });

  // Alert restaurant owner via Telegram
  await sendTelegramAlert(
    `🍽️ *New Table Booking*\n\n` +
    `Restaurant: ${booking.restaurant}\n` +
    `Customer: ${booking.name}\n` +
    `Phone: ${booking.phone || 'Not provided'}\n` +
    `Date: ${booking.date}\n` +
    `Time: ${booking.time}\n` +
    `Guests: ${booking.guests}\n` +
    `Special requests: ${booking.notes || 'None'}`
  );

  console.log('✅ Booking processed and owner notified');
  return { success: true, bookingId: Date.now() };
}

async function getTodaysBookings(restaurantName) {
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('seo_reports')
    .select('*')
    .eq('report_type', 'booking')
    .gte('created_at', today);

  return (data || []).filter(b =>
    b.report_data?.restaurant === restaurantName &&
    b.report_data?.date === today
  );
}

module.exports = { processBooking, getTodaysBookings };