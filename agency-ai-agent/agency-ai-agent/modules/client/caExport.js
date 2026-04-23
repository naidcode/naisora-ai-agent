const { createClient } = require('@supabase/supabase-js');
const { sendTelegram } = require('../../config/telegram');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const AGENCY_DETAILS = {
  name: 'Naisora',
  owner: 'Nahid Pasha',
  email: 'hey@naisora.com',
  website: 'naisora.com',
  location: 'Bangalore, Karnataka, India'
};

async function getFinancialData(params) {
  const { startDate, endDate } = params;

  const [invoicesRes, clientsRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, clients(name, email, phone)')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true }),
    supabase
      .from('clients')
      .select('*')
      .eq('status', 'active')
  ]);

  return {
    invoices: invoicesRes.data || [],
    clients: clientsRes.data || []
  };
}

function calculateSummary(invoices) {
  const summary = {
    total_invoiced: 0,
    total_paid: 0,
    total_outstanding: 0,
    one_time: 0,
    recurring: 0,
    by_service: {}
  };

  for (const inv of invoices) {
    const amount = inv.amount || 0;
    summary.total_invoiced += amount;

    if (inv.status === 'paid') {
      summary.total_paid += amount;
    } else {
      summary.total_outstanding += amount;
    }

    if (inv.type === 'recurring') {
      summary.recurring += amount;
    } else {
      summary.one_time += amount;
    }

    const service = inv.service || 'General';
    if (!summary.by_service[service]) {
      summary.by_service[service] = 0;
    }
    summary.by_service[service] += amount;
  }

  return summary;
}

function generateCSV(invoices, summary) {
  const rows = [
    ['NAISORA — Financial Export'],
    ['Owner: Nahid Pasha'],
    ['Email: hey@naisora.com'],
    ['Location: Bangalore, Karnataka, India'],
    [''],
    ['INVOICE DETAILS'],
    ['Invoice #', 'Date', 'Client Name', 'Client Email', 'Service', 'Amount (INR)', 'Type', 'Status', 'GST (18%)', 'Total with GST']
  ];

  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    const amount = inv.amount || 0;
    const gst = Math.round(amount * 0.18);
    const total = amount + gst;
    const date = new Date(inv.created_at).toLocaleDateString('en-IN');

    rows.push([
      `INV-${String(i + 1).padStart(4, '0')}`,
      date,
      inv.clients?.name || inv.client_name || 'N/A',
      inv.clients?.email || 'N/A',
      inv.service || 'Web Services',
      amount,
      inv.type || 'one-time',
      inv.status || 'pending',
      gst,
      total
    ]);
  }

  rows.push(['']);
  rows.push(['SUMMARY']);
  rows.push(['Total Invoiced (excl. GST)', `₹${summary.total_invoiced}`]);
  rows.push(['Total Paid', `₹${summary.total_paid}`]);
  rows.push(['Total Outstanding', `₹${summary.total_outstanding}`]);
  rows.push(['One-time Revenue', `₹${summary.one_time}`]);
  rows.push(['Recurring Revenue', `₹${summary.recurring}`]);
  rows.push(['']);
  rows.push(['BY SERVICE']);

  for (const [service, amount] of Object.entries(summary.by_service)) {
    rows.push([service, `₹${amount}`]);
  }

  return rows.map(row => row.join(',')).join('\n');
}

function generateReport(invoices, summary, period) {
  const lines = [
    `NAISORA — Financial Report`,
    `Period: ${period}`,
    `Generated: ${new Date().toLocaleDateString('en-IN')}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `REVENUE SUMMARY`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Total Invoiced:     ₹${summary.total_invoiced.toLocaleString('en-IN')}`,
    `Total Paid:         ₹${summary.total_paid.toLocaleString('en-IN')}`,
    `Outstanding:        ₹${summary.total_outstanding.toLocaleString('en-IN')}`,
    ``,
    `One-time Revenue:   ₹${summary.one_time.toLocaleString('en-IN')}`,
    `Recurring Revenue:  ₹${summary.recurring.toLocaleString('en-IN')}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `REVENUE BY SERVICE`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    ...Object.entries(summary.by_service).map(([s, a]) => `${s.padEnd(30)} ₹${a.toLocaleString('en-IN')}`),
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `INVOICE LIST`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    ...invoices.map((inv, i) => [
      `INV-${String(i + 1).padStart(4, '0')} | ${new Date(inv.created_at).toLocaleDateString('en-IN')} | ${inv.clients?.name || 'N/A'} | ${inv.service || 'Web Services'} | ₹${inv.amount || 0} | ${inv.status || 'pending'}`
    ].join('')),
    ``,
    `Note: Add 18% GST to all amounts for tax filing.`,
    `Business: Naisora | hey@naisora.com | naisora.com`
  ];

  return lines.join('\n');
}

async function run(params = {}) {
  const now = new Date();
  const startDate = params.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endDate = params.endDate || now.toISOString();
  const format = params.format || 'both';

  const period = `${new Date(startDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;

  console.log(`📊 Generating CA export for period: ${period}`);

  try {
    const { invoices, clients } = await getFinancialData({ startDate, endDate });

    if (invoices.length === 0) {
      await sendTelegram(
        `📊 *CA Export — ${period}*\n\n` +
        `No invoices found for this period.\n` +
        `Active clients: ${clients.length}`
      );
      return;
    }

    const summary = calculateSummary(invoices);

    // Save text report
    const reportText = generateReport(invoices, summary, period);
    const reportPath = path.join('/tmp', `naisora-ca-report-${period.replace(/\s/g, '-')}.txt`);
    fs.writeFileSync(reportPath, reportText);

    // Save CSV
    const csvContent = generateCSV(invoices, summary);
    const csvPath = path.join('/tmp', `naisora-invoices-${period.replace(/\s/g, '-')}.csv`);
    fs.writeFileSync(csvPath, csvContent);

    await sendTelegram(
      `📊 *CA Export Ready — ${period}*\n\n` +
      `Invoices: ${invoices.length}\n` +
      `Total revenue: ₹${summary.total_invoiced.toLocaleString('en-IN')}\n` +
      `Paid: ₹${summary.total_paid.toLocaleString('en-IN')}\n` +
      `Outstanding: ₹${summary.total_outstanding.toLocaleString('en-IN')}\n\n` +
      `Files saved:\n` +
      `• ${path.basename(reportPath)}\n` +
      `• ${path.basename(csvPath)}\n\n` +
      `Share the CSV with your CA for tax filing.`
    );

    console.log(`✅ CA export complete — ${invoices.length} invoices`);
    return { reportPath, csvPath, summary };

  } catch (error) {
    console.error('CA export error:', error.message);
    await sendTelegram(`❌ *CA Export Error*\n${error.message}`);
    throw error;
  }
}

module.exports = { run };