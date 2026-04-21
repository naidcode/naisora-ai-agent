// modules/client/invoiceGenerator.js
// Generates invoices and tracks payments via Razorpay

require('dotenv').config();
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─── Generate invoice number ──────────────────────────────────────────────────
function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 900 + 100);
  return `NSR-${year}${month}-${random}`;
}

// ─── Create invoice ───────────────────────────────────────────────────────────
async function createInvoice(clientId, amount, description, dueDate) {
  const invoiceNumber = generateInvoiceNumber();

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      client_id: clientId,
      invoice_number: invoiceNumber,
      amount,
      description,
      status: 'pending',
      issued_at: new Date().toISOString(),
      due_date: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    console.error('Invoice creation failed:', error.message);
    return null;
  }

  console.log(`✅ Invoice created: ${invoiceNumber} — ₹${amount}`);

  // Alert to Telegram
  await sendTelegramAlert(
    `🧾 *Invoice Created*\n\n` +
    `Invoice: ${invoiceNumber}\n` +
    `Amount: ₹${amount}\n` +
    `Description: ${description}\n` +
    `Due: ${dueDate || '7 days'}\n\n` +
    `Send Razorpay payment link to client.`
  );

  return invoice;
}

// ─── Send payment reminder ────────────────────────────────────────────────────
async function sendPaymentReminder(invoice, client) {
  const message =
    `Hi ${client.name?.split(' ')[0] || 'there'}, ` +
    `this is a reminder that invoice ${invoice.invoice_number} ` +
    `for ₹${invoice.amount} (${invoice.description}) is due. ` +
    `Please make the payment at your earliest convenience. ` +
    `Razorpay link: [PAYMENT_LINK] — Nahid, Naisora`;

  await sendTelegramAlert(
    `💰 *Payment Reminder Needed*\n\n` +
    `Client: ${client.business_name}\n` +
    `Invoice: ${invoice.invoice_number}\n` +
    `Amount: ₹${invoice.amount}\n` +
    `Due: ${invoice.due_date}\n\n` +
    `Send this message:\n"${message}"`
  );
}

// ─── Check overdue invoices ───────────────────────────────────────────────────
async function checkOverdueInvoices() {
  const today = new Date().toISOString().split('T')[0];

  const { data: overdue } = await supabase
    .from('invoices')
    .select('*, clients(business_name, phone)')
    .in('status', ['pending', 'sent'])
    .lt('due_date', today);

  if (!overdue || overdue.length === 0) {
    console.log('No overdue invoices');
    return;
  }

  await sendTelegramAlert(
    `⚠️ *Overdue Invoices — ${overdue.length} unpaid*\n\n` +
    overdue.map(i =>
      `• ${i.clients?.business_name} — ₹${i.amount} (due ${i.due_date})`
    ).join('\n')
  );
}

module.exports = { createInvoice, sendPaymentReminder, checkOverdueInvoices, generateInvoiceNumber };