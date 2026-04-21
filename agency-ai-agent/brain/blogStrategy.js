// brain/blogStrategy.js
// ═══════════════════════════════════════════════════════════════════════════════
// Naisora AI Growth OS — PERMANENT BLOG CONTENT STRATEGY
// ═══════════════════════════════════════════════════════════════════════════════
//
// CORE RULE: Every blog must solve a real business problem, connect to our
// service (website + visibility), and push the reader toward action.
//
// This file is the SINGLE SOURCE OF TRUTH for all content generation.
// It is loaded by: blogWriter.js, contentEngine.js, contentOptimizer.js,
//                  blogScheduler.js
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TARGET AUDIENCE ─────────────────────────────────────────────────────────
const TARGET_AUDIENCE = {
  primary: [
    'Restaurant owners in Bangalore',
    'Cafe owners in Bangalore',
    'Cloud kitchen operators',
    'Local food business owners',
  ],
  painPoints: [
    'No website — losing customers who search online',
    'Outdated website — making a premium restaurant look unprofessional',
    'Not getting direct customers — over-dependent on Zomato/Swiggy commissions',
    'Not showing on Google — invisible to nearby diners searching "near me"',
    'Paying 30% commission to aggregators instead of getting direct orders',
    'No online presence beyond a Zomato listing they don\'t control',
    'Competitors with websites stealing their customers',
  ],
  searchBehavior: [
    'Searches Google before trying any restaurant',
    'Compares restaurants by their online presence',
    'Looks for menus, photos, ambience, reviews before visiting',
    'Uses "near me" searches to discover new places',
  ],
};

// ─── CONTENT RULES ───────────────────────────────────────────────────────────
const CONTENT_RULES = {
  // What EVERY blog must do
  mandatory: [
    'Solve a REAL business problem restaurant owners face',
    'Connect the solution back to having a website + Google visibility',
    'Include at least 2 local keywords (Bangalore, specific neighborhoods)',
    'End with a clear CTA — free audit, consultation, or portfolio link',
    'Use simple, jargon-free language that a non-tech restaurant owner understands',
    'Include an FAQ section (3-5 questions) for Featured Snippet potential',
  ],

  // What to NEVER do
  forbidden: [
    'Generic marketing theory or abstract concepts',
    'Advanced AI/tech jargon (hyper-personalization, machine learning, etc.)',
    'Content that doesn\'t connect back to a real restaurant pain point',
    'Academic or corporate tone — must feel like advice from a friend',
    'Posts without a CTA — every post must drive action',
    'Topics that don\'t help attract restaurant/cafe owner clients',
  ],

  // Content mix ratio
  ratio: {
    clientGenerating: 80, // 80% → directly solves problems, attracts leads
    authorityBuilding: 20, // 20% → trend pieces that build trust and credibility
  },
};

// ─── MANDATORY BLOG STRUCTURE ────────────────────────────────────────────────
// Every blog MUST follow this 7-part structure
const BLOG_STRUCTURE = `
## MANDATORY 7-PART BLOG STRUCTURE

### 1. HOOK (Pain-Based Introduction)
- Open with a sharp, pain-driven statement that restaurant owners immediately relate to.
- Example: "If your restaurant doesn't have a website in 2026, you are losing customers every single day — and you probably don't even know it."
- NO generic introductions. NO "In today's digital world..." openings.

### 2. PROBLEM EXPLANATION
- Clearly explain WHAT is happening and WHY it's a problem.
- Use specific, relatable scenarios from a restaurant owner's daily life.
- Example: "When someone hears about your restaurant from a friend, the first thing they do is Google it. If nothing shows up — or worse, a broken Facebook page appears — they move on."

### 3. REAL-WORLD IMPACT
- Show the tangible cost of NOT solving this problem.
- Include: lost visibility, missed customers, money going to platforms, competitor advantage.
- Use data or specific examples: "89% of Bangalore diners research a restaurant online before visiting."

### 4. SIMPLE SOLUTION
- Introduce the answer: A professional website + local Google visibility.
- Keep it clear and non-technical.
- Frame it as: "The fix is simpler than you think."

### 5. PRACTICAL STEPS (3-5 Actionable Points)
- Give 3-5 specific, immediately actionable steps the reader can take.
- Each step should be concrete, not vague.
- Example: "1. Claim your Google Business Profile. 2. Get a fast, mobile-friendly website with your menu. 3. Add a click-to-call button."

### 6. SOFT SERVICE CONNECTION
- Naturally connect the solution to what Naisora does.
- NOT a hard sell — a helpful mention.
- Example: "This is exactly what we help restaurants in Bangalore fix — building a modern, fast website that actually brings in customers from Google."

### 7. CTA (MANDATORY — Never Skip)
- Always end with ONE clear call-to-action.
- Options:
  - "Get a free website audit for your restaurant → [link]"
  - "See how your restaurant could look online → [link]"
  - "Talk to us about your restaurant's website → [link]"
  - "Ready to stop losing customers to competitors? Let's talk → [link]"
`;

// ─── SEO KEYWORD STRATEGY ────────────────────────────────────────────────────
const SEO_STRATEGY = {
  // Primary keywords to target across all content
  primaryKeywords: [
    'restaurant website Bangalore',
    'restaurant web design Bangalore',
    'restaurant SEO Bangalore',
    'cafe website design Bangalore',
    'restaurant not getting customers',
    'restaurant Google visibility',
    'restaurant website cost Bangalore',
    'restaurant digital marketing Bangalore',
  ],

  // Local neighborhoods to mention (rotate across posts)
  localKeywords: [
    'Indiranagar', 'Koramangala', 'HSR Layout', 'Whitefield',
    'JP Nagar', 'Jayanagar', 'Marathahalli', 'Electronic City',
    'MG Road', 'Church Street', 'Lavelle Road', 'Sarjapur Road',
    'Basavanagudi', 'Rajajinagar', 'Malleshwaram', 'BTM Layout',
    'Yelahanka', 'Hebbal', 'Banashankari', 'Bellandur',
  ],

  // Long-tail keywords to weave in naturally
  longTailKeywords: [
    'why my restaurant is not getting customers',
    'do restaurants need a website in 2026',
    'restaurant website vs Zomato page',
    'how to get more customers for my restaurant',
    'restaurant not showing on Google',
    'best restaurant website design India',
    'how much does a restaurant website cost',
    'restaurant Google Maps ranking',
    'website for small restaurant',
    'direct orders without Zomato commission',
  ],
};

// ─── CLIENT-GENERATING TOPIC BANK ────────────────────────────────────────────
// These are pre-approved, high-converting blog topics (80% of content)
const CLIENT_TOPICS = [
  // Direct pain-point topics
  'Why Every Restaurant in Bangalore Needs a Website in 2026',
  'Restaurant Not Getting Customers? Here\'s the Real Reason',
  'Zomato vs Your Own Website: What Restaurant Owners Must Know',
  'How Restaurants Lose Customers Without Google Visibility',
  'Restaurant Website Cost in Bangalore — Complete 2026 Guide',
  'No Website, No Customers: The Silent Problem Killing Bangalore Restaurants',
  '5 Signs Your Restaurant Is Losing Money Because of a Bad Website',
  'Why Your Restaurant Doesn\'t Show Up on Google — And How to Fix It',
  'Stop Paying 30% Commission: How a Website Gets You Direct Orders',
  'What Happens When Customers Google Your Restaurant and Find Nothing',

  // Comparison / decision topics
  'Restaurant Website vs Instagram Page: Which Actually Gets Customers?',
  'Free Website Builders vs Professional Restaurant Web Design — The Truth',
  'Why a Facebook Page Is Not Enough for Your Restaurant in 2026',
  'Google Business Profile vs Website: Do You Need Both?',

  // Location-specific topics
  'Best Restaurant Website Examples in Bangalore — What Works',
  'How Restaurants in Koramangala Are Getting More Direct Customers',
  'Why Indiranagar Restaurants With Websites Get 3x More Walk-Ins',
  'Restaurant Marketing in Whitefield: What\'s Actually Working in 2026',

  // Cost / ROI topics
  'How Much Does a Restaurant Website Cost in India? (Honest Breakdown)',
  'Is a Website Worth It for a Small Restaurant? (Real Numbers)',
  'Restaurant Website ROI: How a ₹15,000 Website Can Bring ₹2 Lakh in Orders',

  // How-to / practical topics
  'How to Get Your Restaurant on the First Page of Google',
  'What to Include on Your Restaurant Website (Complete Checklist)',
  'How to Get More Direct Orders Without Paying Zomato Commission',
  'Simple Steps to Make Your Restaurant Visible on Google Maps',
];

// ─── AUTHORITY TOPIC BANK ────────────────────────────────────────────────────
// Trust-building / trend topics (20% of content)
const AUTHORITY_TOPICS = [
  'The Future of Restaurant Marketing in Bangalore (2026 Trends)',
  'How Top Bangalore Restaurants Are Using Technology to Grow',
  'What the Bangalore Food Scene Can Learn from International Restaurant Brands',
  'Digital Ordering Trends: What Bangalore Diners Actually Want',
  'Restaurant Industry Report: Bangalore 2026',
];

// ─── WRITING TONE & STYLE ────────────────────────────────────────────────────
const WRITING_STYLE = {
  tone: 'Friendly, direct, and practical — like advice from a successful restaurant owner friend',
  readingLevel: 'Grade 8 — simple sentences, no jargon',
  perspective: 'Second person ("you", "your restaurant")',
  localFlavor: 'Reference Bangalore neighborhoods, food culture, local dining habits',
  avoid: [
    'Corporate buzzwords',
    'Complex tech terminology',
    'Passive voice',
    '"In today\'s digital world" or similar cliché openings',
    'Vague advice without specific examples',
  ],
};

// ─── CTA TEMPLATES ───────────────────────────────────────────────────────────
const CTA_TEMPLATES = [
  {
    type: 'free_audit',
    text: '**Want to see how your restaurant looks online right now?** Get a free website audit — we\'ll show you exactly what\'s working and what\'s costing you customers.',
    link: 'https://naisora.com/contact',
  },
  {
    type: 'portfolio',
    text: '**Curious what a premium restaurant website looks like?** See real examples of websites we\'ve built for Bangalore restaurants.',
    link: 'https://naisora.com/services',
  },
  {
    type: 'consultation',
    text: '**Ready to stop losing customers to competitors with better websites?** Let\'s talk about your restaurant — no pressure, no jargon, just honest advice.',
    link: 'https://naisora.com/contact',
  },
  {
    type: 'direct',
    text: '**Your restaurant deserves to be found.** We help Bangalore restaurants get a stunning website and real Google visibility. Let\'s make it happen.',
    link: 'https://naisora.com/contact',
  },
];

// ─── BUILD THE SYSTEM PROMPT ─────────────────────────────────────────────────
// This is injected into every blog generation call
function getBlogSystemPrompt() {
  return `
You are a senior SEO strategist, content marketer, and conversion-focused copywriter for Naisora — a Bangalore-based web design agency that builds premium websites for restaurants and cafes.

## YOUR MISSION
Write blog posts that ATTRACT restaurant and cafe owners as clients. Every post must solve a real problem, rank on Google, and convert readers into leads.

## TARGET READER
- Restaurant owners, cafe owners, and food business operators in Bangalore
- They are NOT tech-savvy. They understand food, customers, and money — not code or SEO jargon.
- They are busy, skeptical, and tired of being sold to.

## PAIN POINTS TO ADDRESS (pick the most relevant)
${TARGET_AUDIENCE.painPoints.map(p => `- ${p}`).join('\n')}

${BLOG_STRUCTURE}

## SEO REQUIREMENTS
- Naturally include the target keyword 3-5 times in the content
- Use at least 2 Bangalore neighborhood names (Indiranagar, Koramangala, Whitefield, HSR Layout, etc.)
- Include related long-tail keywords naturally
- Add an FAQ section with 3-5 questions for Featured Snippet potential
- Meta description must be under 160 characters; include the primary keyword

## WRITING RULES
- Tone: ${WRITING_STYLE.tone}
- Reading level: ${WRITING_STYLE.readingLevel}
- Perspective: ${WRITING_STYLE.perspective}
- Word count: 1,200–1,800 words
- NEVER use these: ${WRITING_STYLE.avoid.join(', ')}

## CRITICAL RULES
${CONTENT_RULES.mandatory.map(r => `✅ ${r}`).join('\n')}

## NEVER DO THIS
${CONTENT_RULES.forbidden.map(r => `❌ ${r}`).join('\n')}

## CTA (MANDATORY)
Every post MUST end with a clear, compelling call-to-action that drives the reader to contact Naisora for a free website audit or consultation. The CTA should feel like natural, helpful advice — not a sales pitch.
`;
}

// ─── HELPER: Pick a topic based on strategy ──────────────────────────────────
function pickTopic(index = 0, type = 'client') {
  const pool = type === 'authority' ? AUTHORITY_TOPICS : CLIENT_TOPICS;
  return pool[index % pool.length];
}

// ─── HELPER: Pick a random CTA ──────────────────────────────────────────────
function pickCTA() {
  return CTA_TEMPLATES[Math.floor(Math.random() * CTA_TEMPLATES.length)];
}

// ─── HELPER: Pick local keywords for a post ──────────────────────────────────
function pickLocalKeywords(count = 3) {
  const shuffled = [...SEO_STRATEGY.localKeywords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ─── HELPER: Determine if next post should be client or authority ─────────
function getContentType(postNumber) {
  // Every 5th post is an authority piece (20%), rest are client-generating (80%)
  return postNumber % 5 === 0 ? 'authority' : 'client';
}

module.exports = {
  TARGET_AUDIENCE,
  CONTENT_RULES,
  BLOG_STRUCTURE,
  SEO_STRATEGY,
  CLIENT_TOPICS,
  AUTHORITY_TOPICS,
  WRITING_STYLE,
  CTA_TEMPLATES,
  getBlogSystemPrompt,
  pickTopic,
  pickCTA,
  pickLocalKeywords,
  getContentType,
};
