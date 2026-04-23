// data/masterDB.js
// Naisora AI Growth OS — Unified Data Engine
// Central hub for all business data: Leads, Blogs, Outreach, Revenue, and Performance

const { supabase } = require('../config/database');

const masterDB = {
  // Methods to fetch all relevant data for the brain to process
  async getFullState() {
    try {
      const [
        { data: leads },
        { data: clients },
        { data: invoices },
        { data: emailLogs },
        { data: blogPosts },
        { data: seoReports }
      ] = await Promise.all([
        supabase.from('leads').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('email_log').select('*'),
        supabase.from('blog_posts').select('*'),
        supabase.from('seo_reports').select('*')
      ]);

      return {
        leads: leads || [],
        clients: clients || [],
        invoices: invoices || [],
        outreach: emailLogs || [],
        blogs: blogPosts || [],
        seo: seoReports || [],
        revenue: this.calculateRevenue(invoices || [])
      };
    } catch (error) {
      console.error('MasterDB Error:', error.message);
      return null;
    }
  },

  calculateRevenue(invoices) {
    return invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
  },

  // Real-time tracking methods
  async trackRevenue(clientId, amount, description) {
    const { data, error } = await supabase.from('invoices').insert({
      client_id: clientId,
      amount,
      description,
      status: 'paid',
      paid_at: new Date().toISOString()
    });
    return { data, error };
  }
};

module.exports = masterDB;
