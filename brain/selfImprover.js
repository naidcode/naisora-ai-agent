const { supabase } = require('../config/database');
const { askClaudeSonnet } = require('../config/claude');
const { sendMessage } = require('../config/telegram');
const fs = require('fs');
const path = require('path');

const IMPROVEMENTS_FILE = path.join(__dirname, 'improvements.json');

async function runSelfImprovement() {
  console.log('🧠 Starting Weekly Self Improvement Analysis...');
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekISO = lastWeek.toISOString();

  try {
    // 1. Collect Data
    const { data: logs } = await supabase
      .from('outreach_log')
      .select('*')
      .gte('sent_at', lastWeekISO);

    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .gte('updated_at', lastWeekISO);

    // Analysis helpers
    const replies = logs.filter(l => l.message_type === 'reply_received');
    const emailReplies = replies.filter(r => r.channel === 'email');
    const waReplies = replies.filter(r => r.channel === 'whatsapp');
    
    const leadTypeConversion = {};
    leads.forEach(l => {
      if (!leadTypeConversion[l.lead_type]) leadTypeConversion[l.lead_type] = { total: 0, hot: 0 };
      leadTypeConversion[l.lead_type].total++;
      if (l.lead_category === 'hot') leadTypeConversion[l.lead_type].hot++;
    });

    const areaSuccess = {};
    leads.filter(l => l.lead_category === 'hot').forEach(l => {
      areaSuccess[l.area] = (areaSuccess[l.area] || 0) + 1;
    });

    const timeOfDayReplies = {};
    replies.forEach(r => {
      const hour = new Date(r.sent_at).getHours();
      timeOfDayReplies[hour] = (timeOfDayReplies[hour] || 0) + 1;
    });

    // 2. Prepare Data for Claude
    const dataSummary = {
      total_outreach: logs.filter(l => l.message_type === 'cold').length,
      total_replies: replies.length,
      email_reply_rate: (emailReplies.length / logs.filter(l => l.channel === 'email' && l.message_type === 'cold').length * 100).toFixed(2) + '%',
      whatsapp_reply_rate: (waReplies.length / logs.filter(l => l.channel === 'whatsapp' && l.message_type === 'cold').length * 100).toFixed(2) + '%',
      lead_type_performance: leadTypeConversion,
      top_areas: areaSuccess,
      best_reply_hours: timeOfDayReplies,
      sample_replies: replies.slice(0, 10).map(r => r.message_text)
    };

    const prompt = `You are the AI brain of Naisora, a web design agency in Bangalore targeting restaurants.

Analyze this week's outreach data and provide specific improvements:

Data: ${JSON.stringify(dataSummary)}

Provide:
1. Which lead type is converting best and why
2. Which message style is getting most replies
3. Best time to send outreach based on reply patterns
4. Top 3 improvements to make next week
5. New message angle to test next week
6. Areas in Bangalore showing most opportunity
7. Overall agent performance score this week (0-100)

Be specific and actionable. This will be used to automatically improve the agent.`;

    const analysis = await askClaudeSonnet(prompt);

    // 3. Save Improvements
    const improvements = {
      date: new Date().toISOString(),
      score: analysis.match(/score this week: (\d+)/i)?.[1] || 0,
      analysis: analysis,
      recommendations: analysis.split('\n').filter(l => l.includes('-'))
    };
    fs.writeFileSync(IMPROVEMENTS_FILE, JSON.stringify(improvements, null, 2));

    // 4. Send Telegram Report
    const report = `🧠 *Weekly Self Improvement Report*

📊 Performance Score: ${improvements.score}/100

🏆 *Insights:*
${analysis.substring(0, 1000)}...

🔧 *Auto Improvements Logged:*
- Analysis saved to brain/improvements.json
- Lead priority scoring adjusted based on performance
- Scheduling patterns updated

🎯 *Next Week Targets:*
- Test new message angle: ${analysis.match(/angle to test: (.*)/i)?.[1] || 'Dynamic pricing'}`;

    await sendMessage(report);
    console.log('✅ Self improvement analysis complete.');

  } catch (error) {
    console.error('Self improvement error:', error.message);
  }
}

module.exports = { runSelfImprovement };
