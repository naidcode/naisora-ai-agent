const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !key.trim().startsWith('#')) {
      process.env[key.trim()] = rest.join('=').replace(/\r/g, '').trim();
    }
  });
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  console.log('📝 Queuing test message...');
  const { error } = await supabase.from('whatsapp_queue').insert([{
    phone: '7975219560',
    message: '✅ Naisora Agent WhatsApp is working! Your AI agent is fully operational 🚀 — Nahid, Naisora',
    status: 'pending'
  }]);

  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Success! Message queued.');
  }
}

run();
