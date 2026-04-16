
const { testConnection: testClaude } = require('../config/claude');
const { testConnection: testSMTP } = require('../config/smtp');
const { testConnection: testDB } = require('../config/database');

async function runHealthCheck() {
  console.log('🚀 RUNNING SENDER HEALTH CHECK\n');
  
  const dbOk = await testDB();
  if (!dbOk) return;
  
  const smtpOk = await testSMTP();
  if (!smtpOk) console.error('❌ SMTP is broken!');
  
  try {
    await testClaude();
  } catch (err) {
    console.error('❌ Claude API is broken!', err.message);
  }
  
  console.log('\n✅ Health check complete.');
}

runHealthCheck();
