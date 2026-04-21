// modules/outreach/humanizer.js
// Naisora AI Agent — Message Humanizer
// Removes AI-sounding patterns from every outreach message
// Every WhatsApp, Instagram DM, LinkedIn message passes through this
// Uses Haiku (cheap) — pure text transformation, no creativity needed

const { askClaudeWithSystem } = require('../../config/claude');

// ─── Words and phrases that scream "AI wrote this" ────────────────────────────
const AI_PATTERNS = [
  // Openers
  "I hope this message finds you well",
  "I hope you're doing well",
  "I trust this message finds you",
  "I hope this finds you well",
  "Greetings",
  "Dear Sir/Madam",

  // Filler phrases
  "Certainly",
  "Absolutely",
  "Of course",
  "I understand your",
  "I appreciate your",
  "Thank you for your time",
  "Please don't hesitate to",
  "Feel free to reach out",
  "I would be happy to",
  "I would like to",
  "I am writing to",
  "I am reaching out to",
  "It is my pleasure",
  "As per our conversation",

  // Closers
  "Best regards",
  "Kind regards",
  "Warm regards",
  "Yours sincerely",
  "Yours faithfully",
  "With best wishes",

  // Corporate
  "leverage",
  "synergy",
  "streamline",
  "optimize",
  "utilize",
  "facilitate",
  "endeavour",
  "comprehensive solution",
  "cutting-edge",
  "state-of-the-art",
  "robust",
  "scalable",
];

// ─── System prompt for humanizer ──────────────────────────────────────────────
const HUMANIZER_SYSTEM = `You are a message editor. Your only job is to rewrite messages to sound like a real person wrote them — not an AI or corporate copywriter.

Rules:
1. Keep the same meaning and all key facts (business name, area, specific details)
2. Remove any formal, corporate, or AI-sounding language
3. Write like a 22-year-old Indian entrepreneur sending a casual WhatsApp
4. Short sentences. Direct. No fluff.
5. Never add new information — only rewrite what's already there
6. Keep the same length roughly — don't make it longer
7. Never use: "certainly", "absolutely", "I hope this finds you well", "Best regards", or any formal opener/closer
8. Output ONLY the rewritten message — no explanation, no "Here's the rewritten version:"`;

// ─── Main humanize function ───────────────────────────────────────────────────
async function humanize(text) {
  try {
    // First pass — remove known AI patterns directly
    let cleaned = text;
    for (const pattern of AI_PATTERNS) {
      const regex = new RegExp(pattern, 'gi');
      cleaned = cleaned.replace(regex, '');
    }

    // Clean up double spaces and blank lines from removals
    cleaned = cleaned
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/  +/g, ' ')
      .trim();

    // Second pass — Haiku rewrites it naturally
    const humanized = await askClaudeWithSystem(
      HUMANIZER_SYSTEM,
      `Rewrite this message to sound human and natural:\n\n${cleaned}`
    );

    return humanized.trim();

  } catch (err) {
    console.error('Humanizer error:', err.message);
    // If humanizer fails, return original (never block the message)
    return text;
  }
}

// ─── Humanize with context (for specific channels) ───────────────────────────
async function humanizeForChannel(text, channel = 'whatsapp') {
  const channelInstructions = {
    whatsapp: 'This is a WhatsApp message. Keep it conversational, short paragraphs, can use 1-2 emojis max.',
    instagram: 'This is an Instagram DM. Very casual, friendly, brief. No more than 3-4 sentences.',
    linkedin: 'This is a LinkedIn message. Semi-professional but still human. Not corporate. Direct and brief.',
    email: 'This is an email. Human and direct but slightly more structured than WhatsApp.',
  };

  const instruction = channelInstructions[channel] || channelInstructions.whatsapp;

  try {
    const humanized = await askClaudeWithSystem(
      HUMANIZER_SYSTEM + '\n\nChannel context: ' + instruction,
      `Rewrite this message:\n\n${text}`
    );
    return humanized.trim();
  } catch (err) {
    return text;
  }
}

module.exports = { humanize, humanizeForChannel };