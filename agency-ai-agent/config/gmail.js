// ============================================
// config/gmail.js
// Connects your agent to Gmail
// Handles sending AND reading emails
// ============================================

// Load .env directly — dotenv was adding hidden \r characters to keys
const fs = require('fs');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const cleaned = line.replace(/\r/g, '').trim();
    if (cleaned && !cleaned.startsWith('#') && cleaned.includes('=')) {
      const [key, ...rest] = cleaned.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
}
const { google } = require('googleapis');

// Set up the OAuth2 client with your Gmail credentials
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Set the refresh token so Gmail stays connected
oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

// Create the Gmail API instance
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// ============================================
// SEND AN EMAIL
// to = recipient email address
// subject = email subject line
// body = email body (plain text)
// ============================================
async function sendEmail(to, subject, body) {
  try {
    // Gmail requires base64 encoded email format
    const emailLines = [
      `From: ${process.env.YOUR_NAME} <${process.env.YOUR_EMAIL}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      body
    ];

    const emailContent = emailLines.join('\r\n');
    
    // Encode to base64 (Gmail API requirement)
    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    console.log(`📧 Email sent to ${to} | Message ID: ${response.data.id}`);
    return { success: true, messageId: response.data.id };

  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// READ UNREAD EMAILS FROM INBOX
// Returns list of recent unread emails
// ============================================
async function getUnreadEmails(maxResults = 20) {
  try {
    // Search for unread emails in inbox
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:inbox',
      maxResults: maxResults,
    });

    const messages = response.data.messages || [];
    if (messages.length === 0) return [];

    // Get full content of each email
    const emails = await Promise.all(
      messages.map(async (msg) => {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        const headers = full.data.payload.headers;
        const from = headers.find(h => h.name === 'From')?.value || '';
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';

        // Extract email body text
        let body = '';
        const parts = full.data.payload.parts || [full.data.payload];
        for (const part of parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            break;
          }
        }

        return {
          id: msg.id,
          from,
          subject,
          date,
          body: body.trim(),
          snippet: full.data.snippet,
        };
      })
    );

    return emails;

  } catch (error) {
    console.error('❌ Failed to read inbox:', error.message);
    return [];
  }
}

// ============================================
// MARK EMAIL AS READ
// After agent processes an email, mark it read
// ============================================
async function markAsRead(messageId) {
  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  } catch (error) {
    console.error('❌ Failed to mark email as read:', error.message);
  }
}

// ============================================
// FIRST TIME SETUP: Get your Refresh Token
// Run this ONCE to authorize Gmail access
// It will open a browser for you to sign in
// ============================================
async function getRefreshToken() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
  });

  console.log('\n🔐 GMAIL SETUP — Do this ONCE:');
  console.log('======================================');
  console.log('1. Open this URL in your browser:');
  console.log('\n' + authUrl + '\n');
  console.log('2. Sign in with your Gmail account');
  console.log('3. Copy the "code" from the URL after redirect');
  console.log('4. Paste it below when asked\n');

  // After user pastes the code, exchange it for tokens
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  rl.question('Paste the authorization code here: ', async (code) => {
    rl.close();
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ YOUR REFRESH TOKEN (save this in .env):');
    console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token);
  });
}

// ============================================
// TEST GMAIL CONNECTION
// ============================================
async function testConnection() {
  console.log('📧 Testing Gmail connection...');
  try {
    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log(`✅ Gmail connected! Account: ${profile.data.emailAddress}`);
    return true;
  } catch (error) {
    console.error('❌ Gmail connection failed:', error.message);
    console.log('👉 Run: node -e "require(\'./config/gmail\').getRefreshToken()"');
    return false;
  }
}

module.exports = {
  sendEmail,
  getUnreadEmails,
  markAsRead,
  getRefreshToken,
  testConnection,
};
