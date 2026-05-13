import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Load .env directly — handles hidden \r characters on Windows
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !key.trim().startsWith('#')) {
      process.env[key.trim()] = rest.join('=').replace(/\r/g, '').trim();
    }
  });
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Agency Context (Hardcoded as requested)
const AGENCY = {
  name: "Naisora",
  city: "Bangalore, India",
  email: "hey@naisora.com",
  website: "naisora.com",
  author: "Nahid Pasha",
  niche: "Web design for restaurants and cafes"
};

// Blog Topics Array (Hardcoded as requested)
const BLOG_TOPICS = [
  { month: 1, keyword: "restaurant website India", topic: "Why Your Restaurant Needs a Website and Not Just Zomato" },
  { month: 2, keyword: "direct orders restaurant India", topic: "How to Get Direct Orders Without Paying Commission" },
  { month: 3, keyword: "restaurant SEO India", topic: "Restaurant SEO India Rank on Google Without Ads" },
  { month: 4, keyword: "restaurant website cost India", topic: "How Much Does a Restaurant Website Cost in India" },
  { month: 5, keyword: "cafe website design", topic: "Best Website Features for Cafes in 2025" },
  { month: 6, keyword: "Google Business restaurant India", topic: "How to Set Up Google Business Profile for Your Restaurant" },
  { month: 7, keyword: "restaurant digital marketing India", topic: "Restaurant Digital Marketing India Complete Guide" },
  { month: 8, keyword: "more customers restaurant online India", topic: "How to Get More Customers for Your Restaurant Online" },
  { month: 9, keyword: "restaurant web design agency India", topic: "Web Design Agency vs Freelancer for Your Restaurant Website" },
  { month: 10, keyword: "online menu restaurant India", topic: "Online Menu vs Zomato Menu Which One Wins" },
  { month: 11, keyword: "Bangalore restaurant Google Maps", topic: "How Bangalore Restaurants Can Rank on Google Maps" },
  { month: 12, keyword: "restaurant website case study India", topic: "Case Study How a Bangalore Restaurant Got 40 Percent More Direct Orders" }
];

const SYSTEM_PROMPT = `You are an SEO blog writer for Naisora, a web design agency in Bangalore India that builds websites for restaurants and cafes.

Write a complete SEO blog post in MDX format when given a topic.

RULES:
- One H1 only, contains primary keyword
- H2s answer questions, contain secondary keywords  
- H3s under each H2 for subtopics
- FAQ section minimum 5 questions, 40-60 word answers
- Word count 2000 to 2500
- Simple language like talking to a restaurant owner
- Primary keyword density 1% to 1.5%
- NEVER say: SEO, algorithm, schema, backlinks, leverage
- ALWAYS say: rank on Google, get found online, show up when customers search

PAIN POINTS to mention in every blog:
- Zomato/Swiggy take 25-30% commission per order
- Competitors ranking above them on Google
- Empty tables during off-peak hours
- No direct orders, fully dependent on aggregators

MANDATORY SECTIONS every blog:
1. Intro 150 words, pain point first, keyword in first 100 words
2. Why Indian Restaurants Need a Website in 2025
3. What Makes a Good Restaurant Website
4. How Naisora Builds Restaurant Websites
5. How Much Does a Restaurant Website Cost in India (transparent pricing)
6. FAQ section minimum 5 questions
7. CTA section ending with hey@naisora.com

FAQ must include:
- Do I need a website if I am already on Zomato?
- How much does a restaurant website cost in India?
- How long does it take to build a restaurant website?
- Can my website take online orders directly?
- Will my restaurant rank on Google with a website?

CTA ending:
"Get your free website audit — email hey@naisora.com or WhatsApp us for a faster reply."

Author line at very end:
"Written by Nahid Pasha, founder of Naisora — web design agency in Bangalore for restaurants and cafes."

OUTPUT FORMAT — full .mdx file content starting with:
---
title: ""
metaTitle: ""
metaDescription: ""
slug: ""
date: ""
author: "Nahid Pasha"
excerpt: ""
tags: []
primaryKeyword: ""
wordCount: 0
---

Then full blog body in markdown.
No explanation. Just the .mdx content.`;

async function writeBlog(month) {
  const topicObj = BLOG_TOPICS.find(t => t.month === parseInt(month));
  if (!topicObj) {
    console.error(`❌ Month ${month} not found in BLOG_TOPICS.`);
    return;
  }

  console.log(`\n✍️  Naisora AI Agent — Generating blog for month ${month}`);
  console.log(`📌 Topic: ${topicObj.topic}`);
  console.log(`🔑 Keyword: ${topicObj.keyword}`);
  console.log(`🤖 Model: claude-sonnet-4-6\n`);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `Write the blog post for: ${topicObj.topic}. Primary keyword: ${topicObj.keyword}` }
      ],
    });

    const content = response.content[0].text;
    
    // Extract slug from frontmatter or fallback to keyword
    let slug = topicObj.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slugMatch = content.match(/slug:\s*"([^"]+)"/);
    if (slugMatch) slug = slugMatch[1];

    const postsDir = path.join(process.cwd(), 'posts');
    if (!fs.existsSync(postsDir)) {
      fs.mkdirSync(postsDir);
    }

    const filePath = path.join(postsDir, `${slug}.mdx`);
    fs.writeFileSync(filePath, content);

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Blog generated and saved successfully!`);
    console.log(`📄 File: posts/${slug}.mdx`);
    console.log(`📊 Word Count: Approx. ${content.split(/\s+/).length} words`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    console.log(`\n🚀 Deployment Command:`);
    console.log(`git add . && git commit -m "blog: ${slug}" && git push\n`);

  } catch (error) {
    console.error("❌ Error generating blog:", error.message);
  }
}

// CLI Execution
const monthArg = process.argv[2];
if (!monthArg) {
  console.log("\n❌ No month specified.");
  console.log("Usage: node modules/blogWriter.js [month_number]");
  console.log("Example: node modules/blogWriter.js 1\n");
} else {
  writeBlog(monthArg);
}
