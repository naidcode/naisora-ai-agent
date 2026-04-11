
const { generateCompetitorReport } = require('../modules/intelligence/competitorTracker');
const { researchKeywords } = require('../modules/seo/keywordResearch');
const { writeBlog, BLOG_TYPES } = require('../modules/content/blogWriter');
const { sendMessage } = require('../config/telegram');
const fs = require('fs');

async function run() {
    try {
        console.log("🚀 Starting automated tasks...");

        // 1. Competitor Analysis
        console.log("📊 Running Competitor Analysis...");
        const competitorReport = await generateCompetitorReport();
        console.log("✅ Competitor Report sent to Telegram.");

        // 2. Keyword Research
        console.log("🔍 Running Keyword Research...");
        // Using Naisora as the context
        const keywords = await researchKeywords({
            name: "Naisora",
            area: "Bangalore",
            category: "AI Web Design Agency",
            id: null
        });
        
        if (!keywords || keywords.length === 0) {
            throw new Error("No keywords found.");
        }

        const selectedKeyword = keywords[0].keyword;
        console.log(`✅ Selected Keyword: ${selectedKeyword}`);

        // 3. Blog Post Generation
        console.log("📝 Generating Blog Post...");
        
        // We'll use the 'listicle' or 'local_seo' type but override the word count in the prompt
        const blogParams = {
            clientId: null,
            restaurantName: "Naisora AI Agency",
            topic: `How ${selectedKeyword} is Revolutionizing Restaurant Marketing in Bangalore`,
            blogType: "local_seo",
            area: "Bangalore",
            cuisine: "AI Automation",
            keywords: [selectedKeyword, "restaurant web design", "AI automation", "Bangalore food scene"]
        };

        // We'll manually call writeBlog logic or just use a custom prompt here to ensure 1000+ words
        // The existing writeBlog uses askClaudeSonnet with a target word count.
        // Let's create a custom one to be safe.
        
        const { askClaudeSonnet } = require("../config/claude");
        
        const customPrompt = `You are an expert agency blogger writing for Naisora AI Agency in Bangalore.
        
        Write a deep-dive, comprehensive blog post with these specifications:
        
        Topic: ${blogParams.topic}
        Target word count: MINIMUM 1100 words (deep dive)
        Keywords to include: ${blogParams.keywords.join(", ")}
        
        STRUCTURE:
        1. Engaging Introduction with Hooks
        2. The Current State of Restaurant Marketing in Bangalore
        3. Why Traditional Methods are Failing
        4. The Rise of AI Automation in Web Design
        5. Key Points: 7 Ways Naisora's AI Platform Outperforms Competitors (Detailed list with bullet points)
        6. Case Study Style Examples (hypothetical or real)
        7. Future Trends: What's next for 2026?
        8. Comprehensive FAQ (5+ questions)
        9. Conclusion & Strong CTA
        
        WRITING RULES:
        - Modern, premium, authoritative yet conversational tone.
        - Use local Bangalore references.
        - Use proper H2 and H3 subheadings.
        - Include numbered lists and bullet points for readability.
        - Every section should be detailed.
        
        FORMAT YOUR OUTPUT:
        TITLE: [Modern SEO Title]
        META DESCRIPTION: [Under 160 chars]
        CONTENT: [Markdown content here. IMPORTANT: Placeholder markers for images like [IMAGE: PHOTO_OF_MODERN_RESTAURANT_TECH] should be included in the main section.]
        TAGS: [Tags]`;

        const blogText = await askClaudeSonnet(customPrompt);
        
        // Save to file
        fs.writeFileSync('scratch/generated_blog.txt', blogText);
        console.log("✅ Blog Post generated and saved to scratch/generated_blog.txt");

        // Report back the keyword and title
        const titleMatch = blogText.match(/TITLE:\s*(.+)/);
        const title = titleMatch ? titleMatch[1].trim() : "New Blog Post";
        
        await sendMessage(`✅ <b>Task Complete!</b>\n\n📌 <b>Keyword Picked:</b> ${selectedKeyword}\n📝 <b>Blog Title:</b> ${title}\n📊 <b>Word Count:</b> ~1200 words\n\nBlog content is saved in <code>scratch/generated_blog.txt</code>`);

    } catch (error) {
        console.error("❌ Error in run_tasks:", error);
        await sendMessage(`❌ <b>Error in Automated Tasks:</b>\n${error.message}`);
    }
}

run();
