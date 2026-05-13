const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const PORT = process.env.DASHBOARD_PORT || 3001;
const API_KEY = process.env.DASHBOARD_API_KEY || 'naisora_secret_2024';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// Initialize Express & Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json());

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Security Middleware: HTTP API Key Check
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    console.warn(`[${new Date().toISOString()}] Unauthorized HTTP attempt from ${req.ip}`);
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

app.use(authMiddleware);

// Security Middleware: Socket.io API Key Check
io.use((socket, next) => {
  const apiKey = socket.handshake.query.apiKey;
  if (apiKey === API_KEY) {
    next();
  } else {
    console.warn(`[${new Date().toISOString()}] Unauthorized Socket connection attempt`);
    next(new Error("Unauthorized"));
  }
});

// Helper: Get PM2 Status
const getPM2Status = () => {
  return new Promise((resolve, reject) => {
    exec('pm2 jlist', (error, stdout, stderr) => {
      if (error) {
        return reject("PM2 not accessible");
      }
      try {
        const list = JSON.parse(stdout);
        const data = list.map(proc => ({
          name: proc.name,
          status: proc.pm2_env.status,
          cpu: proc.monit.cpu,
          memory: proc.monit.memory,
          restarts: proc.pm2_env.restart_time,
          uptime: proc.pm2_env.pm_uptime ? Math.floor((Date.now() - proc.pm2_env.pm_uptime) / 1000) : 0
        }));
        resolve(data);
      } catch (e) {
        reject("Error parsing PM2 output");
      }
    });
  });
};

// Helper: Get Leads Stats
const getLeadsStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const [
      { count: total },
      { count: newLeads },
      { count: contacted },
      { count: converted },
      { count: todayLeads }
    ] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'contacted'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'converted'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString())
    ]);

    return {
      total: total || 0,
      new: newLeads || 0,
      contacted: contacted || 0,
      converted: converted || 0,
      today: todayLeads || 0
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database Error in getLeadsStats:`, error.message);
    return { total: 0, new: 0, contacted: 0, converted: 0, today: 0 };
  }
};

// 1. GET /api/health
app.get('/api/health', (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
});

// 2. GET /api/pm2/status
app.get('/api/pm2/status', async (req, res) => {
  try {
    const data = await getPM2Status();
    res.json(data);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] PM2 Error:`, error);
    res.status(500).json({ error: "PM2 not accessible" });
  }
});

// 3. GET /api/leads
app.get('/api/leads', async (req, res) => {
  try {
    const { limit = 50, status } = req.query;
    let query = supabase.from('leads').select('*').limit(parseInt(limit)).order('created_at', { ascending: false });
    
    if (status) query = query.eq('status', status);
    
    const { data, error } = await query;
    if (error) throw error;
    
    const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true });
    res.json({ total: count, data });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Leads Query Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 4. GET /api/leads/stats
app.get('/api/leads/stats', async (req, res) => {
  try {
    const stats = await getLeadsStats();
    res.json(stats);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Leads Stats Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 5. GET /api/logs
app.get('/api/logs', async (req, res) => {
  try {
    // Try Supabase "logs" table first
    const { data: dbLogs, error: dbError } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (!dbError && dbLogs && dbLogs.length > 0) {
      return res.json({ logs: dbLogs });
    }

    // Fallback to local agent.log file
    const logPath = path.join(__dirname, 'agent.log');
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.split('\n')
        .filter(line => line.trim().length > 0)
        .reverse()
        .slice(0, 100);
      return res.json({ logs: lines });
    }

    res.json({ logs: [] });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Logs Fetch Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 6. GET /api/clients
app.get('/api/clients', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json({ total: data ? data.length : 0, data: data || [] });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Clients Fetch Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 7. POST /api/agent/trigger/:moduleName
app.post('/api/agent/trigger/:moduleName', (req, res) => {
  try {
    const { moduleName } = req.params;
    
    // Updated mapping for modules in subfolders
    const allowedModules = {
      "googleMapsScraper": "scraper/googleMapsScraper.js",
      "leadProcessor": "scraper/leadProcessor.js",
      "emailScraper": "scraper/emailScraper.js",
      "leadDeduplicator": "scraper/leadDeduplicator.js",
      "whatsappSender": "outreach/whatsappSender.js",
"followUpEngine": "outreach/followUpEngine.js",
"seoAudit": "seo/seoAudit.js",
"pagespeedAudit": "seo/pagespeedAudit.js",
"blogWriter": "content/blogWriter.js",
"socialWriter": "content/socialWriter.js"
    };

    if (!allowedModules[moduleName]) {
      return res.status(400).json({ error: "Module not allowed" });
    }

    const scriptPath = path.join(__dirname, 'modules', allowedModules[moduleName]);
    
    // Stop and return 404 if file does not exist
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ error: `Module file not found: ${allowedModules[moduleName]}` });
    }

    // Spawn node process
    const child = spawn('node', [scriptPath], { 
      detached: true, 
      stdio: 'ignore',
      cwd: __dirname 
    });
    child.unref();

    // Emit socket event
    io.emit("module_triggered", { module: moduleName, time: Date.now() });

    res.json({ status: "triggered", module: moduleName });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Trigger Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 8. GET /api/stats/summary
app.get('/api/stats/summary', async (req, res) => {
  try {
    const stats = await getLeadsStats();
    
    const [{ count: totalClients }, { count: emailsSent }] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'contacted')
    ]);

    const { data: lastLead } = await supabase
      .from('leads')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({
      totalLeads: stats.total,
      newLeadsToday: stats.today,
      totalClients: totalClients || 0,
      emailsSentTotal: emailsSent || 0,
      lastAgentRun: lastLead ? lastLead.created_at : Date.now()
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Summary Stats Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Socket.io Real-time Emissions (Every 30 seconds)
setInterval(async () => {
  try {
    // PM2 update
    const pm2Data = await getPM2Status().catch(() => null);
    if (pm2Data) io.emit("pm2_update", pm2Data);
    
    // Leads update
    const leadsStats = await getLeadsStats();
    io.emit("leads_update", leadsStats);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Interval Update Error:`, err.message);
  }
}, 30000);

// Startup sequence
server.listen(PORT, () => {
  console.log(`\n🚀 DASHBOARD SERVER STARTED`);
  console.log(`✅ Naisora Dashboard API running on port ${PORT}`);
  console.log(`✅ Supabase connected (${SUPABASE_URL})`);
  console.log(`✅ Socket.io ready`);
  console.log(`🔒 API Key Protection: ENABLED\n`);
});
// GET notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    const unread = data.filter(n => !n.is_read).length;
    res.json({ total: data.length, unread, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH mark all read
app.patch('/api/notifications/read', async (req, res) => {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});