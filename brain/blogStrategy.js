// brain/blogStrategy.js
// ═══════════════════════════════════════════════════════════════════════════════
// Naisora AI Growth OS — MASTER SEO SYSTEM STRATEGY
// ═══════════════════════════════════════════════════════════════════════════════
//
// CORE RULE: Every blog must solve a real business problem, connect to our
// service (website + visibility), and push the reader toward action.
//
// This file is the SINGLE SOURCE OF TRUTH for all content generation.
// It follows the MASTER SEO SYSTEM PROMPT established by Nahid Pasha.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── AGENCY CONTEXT ─────────────────────────────────────────────────────────
const AGENCY_CONTEXT = {
  name: 'Naisora',
  website: 'naisora.com',
  email: 'hey@naisora.com',
  city: 'Bangalore, India',
  author: 'Nahid Pasha',
  niche: 'Web design and digital marketing for restaurants and cafes in India',
  colors: {
    bg: ['#0a0a0a', '#141414'],
    accent: '#22c55e',
    text: '#ffffff',
  },
};

// ─── TARGET AUDIENCE ─────────────────────────────────────────────────────────
const TARGET_AUDIENCE = {
  primary: [
    'Restaurant owners in Bangalore',
    'Cafe owners in Bangalore',
    'Cloud kitchen operators',
    'Local food business owners',
  ],
  painPoints: [
    'Zomato / Swiggy take 25–30% commission on every order',
    'Competitors ranking above them on Google',
    'Empty tables during off-peak hours',
    'No direct orders — fully dependent on aggregators',
    'Customers cannot find them when searching Google',
    'No control over their own customer data',
  ],
};

// ─── CONTENT RULES ───────────────────────────────────────────────────────────
const CONTENT_RULES = {
  // What EVERY blog must do (AEO, GEO, E-E-A-T)
  mandatory: [
    'Solve a REAL business problem restaurant owners face',
    'AEO: First sentence under every H2 must directly answer the topic',
    'AEO: Use definition format: "[Thing] is [definition]."',
    'AEO: FAQ section mandatory — minimum 5 questions',
    'AEO: FAQ answers: 40–60 words, starts with direct answer',
    'GEO: Write authoritative statements — no hedging ("might", "could")',
    'GEO: Include stats with source (e.g., Google India, IAMAI, Statista)',
    'GEO: Mention named entities clearly: "Naisora", "Bangalore", "Nahid Pasha"',
    'E-E-A-T: Show real-world Bangalore restaurant context',
    'E-E-A-T: Add "About the Author" section (Nahid Pasha)',
    'Include transparent pricing ranges (Naisora\'s trust advantage)',
    'Connect the solution back to having a website + direct orders',
    'Include at least 2 local keywords (Bangalore, specific neighborhoods)',
    'End with a clear CTA — email hey@naisora.com or WhatsApp',
  ],

  // What to NEVER do
  forbidden: [
    'SEO', 'algorithm', 'schema', 'meta tags', 'crawl', 'backlinks', 
    'leverage', 'synergy', 'cutting-edge', 'robust', 'scalable', 
    'seamlessly', 'utilize', 'paradigm',
    'Generic marketing theory or abstract concepts',
    'Academic or corporate tone — must feel like advice from a friend',
  ],

  wordCount: {
    min: 2000,
    max: 2500,
  },

  meta: {
    title: { min: 50, max: 60 },
    description: { min: 150, max: 160 },
  },
};

// ─── MANDATORY BLOG STRUCTURE ────────────────────────────────────────────────
const BLOG_STRUCTURE = `
---
title: "[H1 text — primary keyword + power word]"
metaTitle: "[50–60 chars — keyword first]"
metaDescription: "[150–160 chars — keyword + benefit + CTA]"
slug: "[primary-keyword-hyphenated]"
date: "[YYYY-MM-DD]"
author: "Nahid Pasha"
excerpt: "[2 sentence summary]"
tags: ["restaurant website", "web design India", "cafe website", "Bangalore"]
primaryKeyword: "[primary keyword]"
wordCount: [number]
---

# [H1 with Primary Keyword]

## [Intro — 150 words, pain-driven, include primary keyword early]

## [H2 Section 1: Why This Problem Matters to Indian Restaurants]
   - [Direct answer sentence immediately under H2]
   - [AEO: definition format if applicable]
   - [GEO: authoritative statements and stats]

## [H2 Section 2: The Solution (Direct Orders & Visibility)]
   - [Direct answer sentence immediately under H2]

## [H2 Section 3: Naisora's Process & Pricing]
   - [Transparent pricing breakdown]

## [H2 Section 4: Real Results & Local Examples]
   - [Mention Bangalore neighborhoods]

## Frequently Asked Questions
   - [Minimum 5 questions]
   - [40-60 word answers starting with direct answer]

## Ready to Get More Customers Without Paying Commission?
   - [CTA Section with hey@naisora.com]

---
*Written by Nahid Pasha, founder of Naisora — a web design agency in Bangalore specializing in websites and digital marketing for restaurants and cafes.*
`;

// ─── SEO KEYWORD STRATEGY ────────────────────────────────────────────────────
const SEO_STRATEGY = {
  primaryKeywords: [
    'restaurant website India',
    'cafe website design Bangalore',
    'restaurant website cost India',
    'digital marketing for restaurants India',
    'direct orders restaurant India',
    'restaurant SEO India',
  ],
  localKeywords: [
    'Indiranagar', 'Koramangala', 'HSR Layout', 'Whitefield',
    'JP Nagar', 'Jayanagar', 'Marathahalli', 'Electronic City',
    'MG Road', 'Church Street', 'Lavelle Road', 'Sarjapur Road',
  ],
};

// ─── 12-MONTH BLOG CALENDAR ──────────────────────────────────────────────────
const BLOG_CALENDAR = [
  { month: 1, keyword: 'restaurant website India', topic: 'Why Your Restaurant Needs a Website and Not Just Zomato' },
  { month: 2, keyword: 'direct orders restaurant India', topic: 'How to Get Direct Orders Without Paying Commission' },
  { month: 3, keyword: 'restaurant SEO India', topic: 'How to Rank Your Restaurant on Google Without Running Ads' },
  { month: 4, keyword: 'restaurant website cost India', topic: 'How Much Does a Restaurant Website Cost in India (Honest Pricing)' },
  { month: 5, keyword: 'cafe website design', topic: 'Best Website Features for Cafes in 2025' },
  { month: 6, keyword: 'Google Business restaurant India', topic: 'How to Set Up Google Business Profile for Your Restaurant' },
  { month: 7, keyword: 'restaurant digital marketing India', topic: 'Restaurant Digital Marketing India — Complete Guide' },
  { month: 8, keyword: 'more customers restaurant online', topic: 'How to Get More Customers for Your Restaurant Online' },
  { month: 9, keyword: 'restaurant web design agency India', topic: 'Web Design Agency vs Freelancer — Which is Better for Restaurants' },
  { month: 10, keyword: 'online menu restaurant India', topic: 'Online Menu vs Zomato Menu — Which One Wins' },
  { month: 11, keyword: 'Bangalore restaurant Google Maps', topic: 'How Bangalore Restaurants Can Rank on Google Maps' },
  { month: 12, keyword: 'restaurant website case study India', topic: 'Case Study: How a Bangalore Restaurant Got 40% More Direct Orders' },
];

// ─── HELPER: Get System Prompt ──────────────────────────────────────────────
function getBlogSystemPrompt() {
  return \`
You are the world's best SEO expert and the SEO brain of Naisora (Bangalore, India).
Follow the MASTER SEO SYSTEM PROMPT for all outputs.

## IDENTITY & CONTEXT
Agency: \${AGENCY_CONTEXT.name}
Website: \${AGENCY_CONTEXT.website}
Email: \${AGENCY_CONTEXT.email}
Founder: \${AGENCY_CONTEXT.author}
Niche: \${AGENCY_CONTEXT.niche}

## CORE PHILOSOPHY
1. AEO (Answer Engine Optimization): Copy-pasteable direct answers under H2s and in FAQs.
2. GEO (Generative Engine Optimization): Authoritative statements, stats, and named entity mentions.
3. E-E-A-T: Local Bangalore context, author expertise, and pricing transparency.
4. Jargon-Free: Never use technical terms like SEO, algorithm, or backlinks. Use "rank on Google" instead.

## WRITING RULES
- Target Word Count: \${CONTENT_RULES.wordCount.min}–\${CONTENT_RULES.wordCount.max} words.
- Reading level: 8th Grade.
- Meta Title: \${CONTENT_RULES.meta.title.min}–\${CONTENT_RULES.meta.title.max} chars.
- Meta Description: \${CONTENT_RULES.meta.description.min}–\${CONTENT_RULES.meta.description.max} chars.
- Forbidden Words: \${CONTENT_RULES.forbidden.join(', ')}.

## MANDATORY SCHEMA
Generate JSON-LD for:
1. Article Schema
2. FAQPage Schema
3. LocalBusiness Schema (Naisora)

## STRUCTURE
\${BLOG_STRUCTURE}
\`;
}

// ─── HELPER: Pick a random neighborhood ──────────────────────────────────────
function pickLocalKeywords(count = 3) {
  const shuffled = [...SEO_STRATEGY.localKeywords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = {
  AGENCY_CONTEXT,
  TARGET_AUDIENCE,
  CONTENT_RULES,
  BLOG_STRUCTURE,
  SEO_STRATEGY,
  BLOG_CALENDAR,
  getBlogSystemPrompt,
  pickLocalKeywords,
};
