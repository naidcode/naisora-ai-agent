// modules/reporting/financialTracker.js
// Tracks Naisora agency revenue and expenses

require('dotenv').config();
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function getMonthlyRevenue() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Get paid invoices this month
  const { data: paidInvoices } = await supabase
    .from('invoices')
    .select('amount, description')
    .eq('status', 'paid')
    .gte('paid_at', monthStart.toISOString());

  // Get active clients (recurring revenue)
  const { data: activeClients } = await supabase
    .from('clients')
    .select('business_name, monthly_fee')
    .eq('status', 'active');

  const oneTimeRevenue = paidInvoices?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
  const recurringRevenue = activeClients?.reduce((sum, c) => sum + (c.monthly_fee || 0), 0) || 0;
  const totalRevenue = oneTimeRevenue + recurringRevenue;

  const summary = {
    oneTime: oneTimeRevenue,
    recurring: recurringRevenue,
    total: totalRevenue,
    activeClients: activeClients?.length || 0,
    month: new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
  };

  return summary;
}

async function weeklyFinancialSummary() {
  const revenue = await getMonthlyRevenue();

  await sendTelegramAlert(
    `💰 *Financial Summary — ${revenue.month}*\n\n` +
    `Active clients: ${revenue.activeClients}\n` +
    `Recurring revenue: ₹${revenue.recurring}/month\n` +
    `One-time payments: ₹${revenue.oneTime}\n` +
    `Total this month: ₹${revenue.total}\n\n` +
    `Target: ₹35,000/month (10 clients × ₹3,500)`
  );

  return revenue;
}

module.exports = { getMonthlyRevenue, weeklyFinancialSummary };