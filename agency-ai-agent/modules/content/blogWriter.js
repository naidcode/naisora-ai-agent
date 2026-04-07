const Anthropic = require("@anthropic-ai/sdk");
const { createClient } = require("@supabase/supabase-js");
const { sendMessage } = require("../../config/telegram");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const BLOG_TYPES = {
  local_seo: {
    label: "Local discovery post",
    description:
      'Targets "near me" searches — e.g. "Best biryani in Indiranagar"',
    word_count: 800,
    structure: [
      "H1 with location + dish",
      "Why people love this dish here",
      "What makes this restaurant special",
      "Menu highlights",
      "How to visit / book",
      "FAQ section",
    ],
  },
  food_story: {
    label: "Food story / origin",
    description:
      "Tells the story behind a signature dish — builds brand and trust",
    word_count: 600,
    structure: [
      "Engaging story hook",
      "Origin of the dish",
      "How the restaurant makes it",
      "Customer reactions",
      "Where to find it",
    ],
  },
  event: {
    label: "Event or offer post",
    description: "Promotes a specific event, festival offer, or seasonal menu",
    word_count: 500,
    structure: [
      "Event headline",
      "What is happening",
      "Date, time, location",
      "Special offer details",
      "How to book or attend",
      "CTA",
    ],
  },
  listicle: {
    label: "Listicle",
    description: '"Top 5 dishes to try at X restaurant" — high shareability',
    word_count: 700,
    structure: [
      "Catchy title with number",
      "Short intro",
      "5-7 dishes with descriptions",
      "Why each one is special",
      "Closing CTA",
    ],
  },
};

async function writeBlog(params) {
  const {
    clientId,
    restaurantName,
    topic,
    blogType = "local_seo",
    area = "Bangalore",
    cuisine = "Indian",
    keywords = [],
  } = params;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const typeConfig = BLOG_TYPES[blogType];

  const prompt = `You are an expert food and restaurant blogger writing for ${restaurantName} in ${area}, Bangalore.

Write a complete, publish-ready blog post with these specifications:

Restaurant: ${restaurantName}
Area: ${area}
Cuisine: ${cuisine}
Topic: ${topic}
Blog type: ${typeConfig.label}
Target word count: ${typeConfig.word_count} words
Structure to follow: ${typeConfig.structure.join(" → ")}
${keywords.length > 0 ? `Keywords to naturally include: ${keywords.join(", ")}` : ""}

WRITING RULES:
- Write in a warm, conversational tone — like a food lover recommending to a friend
- Never make it sound like marketing or an advertisement
- Use local Bangalore references naturally (areas, culture, food scene)
- Include at least one FAQ section at the end (3-5 questions)
- Every paragraph should be 2-4 sentences max — easy to read on mobile
- Add a compelling meta description at the end (under 160 characters)

FORMAT YOUR OUTPUT EXACTLY LIKE THIS:

TITLE: [SEO-friendly blog title]

META DESCRIPTION: [Under 160 characters]

CONTENT:
[Full blog post — use proper H2 and H3 subheadings in markdown format]

TAGS: [5-8 relevant tags separated by commas]

Write naturally. Make the restaurant sound genuinely great, not fake.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const blogText = response.content[0].text;

  const titleMatch = blogText.match(/TITLE:\s*(.+)/);
  const metaMatch = blogText.match(/META DESCRIPTION:\s*(.+)/);
  const contentMatch = blogText.match(/CONTENT:\s*([\s\S]+?)(?=TAGS:|$)/);
  const tagsMatch = blogText.match(/TAGS:\s*(.+)/);

  const blog = {
    client_id: clientId,
    restaurant_name: restaurantName,
    title: titleMatch ? titleMatch[1].trim() : topic,
    meta_description: metaMatch ? metaMatch[1].trim() : "",
    content: contentMatch ? contentMatch[1].trim() : blogText,
    tags: tagsMatch
      ? tagsMatch[1]
          .trim()
          .split(",")
          .map((t) => t.trim())
      : [],
    blog_type: blogType,
    word_count: typeConfig.word_count,
    status: "draft",
    created_at: new Date().toISOString(),
  };

  return blog;
}

async function saveBlogToSupabase(blog) {
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      title: blog.title,
      content: blog.content,
      meta_description: blog.meta_description,
      tags: blog.tags,
      client_id: blog.client_id,
      restaurant_name: blog.restaurant_name,
      blog_type: blog.blog_type,
      status: "draft",
      created_at: blog.created_at,
    })
    .select()
    .single();

  if (error) {
    console.error("Blog save error:", error.message);
    return null;
  }

  return data;
}

async function run(params) {
  console.log(`📝 Writing blog for ${params.restaurantName}...`);

  try {
    const blog = await writeBlog(params);
    const saved = await saveBlogToSupabase(blog);

    if (saved) {
      await sendMessage(
        `📝 *Blog Draft Ready*\n\n` +
          `Restaurant: ${blog.restaurant_name}\n` +
          `Title: ${blog.title}\n` +
          `Type: ${BLOG_TYPES[blog.blog_type]?.label}\n` +
          `Words: ~${blog.word_count}\n` +
          `Status: Draft — pending your approval\n\n` +
          `To publish: update status to "approved" in Supabase blog_posts table\n` +
          `Blog ID: ${saved.id}`,
      );

      console.log(`✅ Blog draft saved — ID: ${saved.id}`);
    }

    return blog;
  } catch (error) {
    console.error("Blog writer error:", error.message);
    await sendMessage(`❌ *Blog Writer Error*\n${error.message}`);
    throw error;
  }
}

module.exports = { run, writeBlog, BLOG_TYPES };
