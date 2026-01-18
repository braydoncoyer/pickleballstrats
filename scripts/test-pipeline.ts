/**
 * Test AI Pipeline
 *
 * Quick test to verify the AI content generation pipeline works.
 * Generates an outline for a single article.
 *
 * Usage: npx tsx scripts/test-pipeline.ts
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error("❌ ANTHROPIC_API_KEY not found in environment");
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey });

async function testPipeline() {
  console.log("🧪 Testing AI Pipeline...\n");

  const testTopic = {
    topic: "Complete Guide to Stacking in Pickleball Doubles",
    articleType: "how-to",
    targetKeyword: "pickleball stacking strategy",
  };

  console.log(`📝 Generating outline for: "${testTopic.topic}"`);
  console.log(`   Keyword: ${testTopic.targetKeyword}`);
  console.log(`   Type: ${testTopic.articleType}\n`);

  try {
    const startTime = Date.now();

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 2048,
      temperature: 0.5,
      system: `You are an expert pickleball content strategist. Create detailed article outlines optimized for SEO and reader value. Focus on actionable advice for competitive players (3.5-5.0 skill level).`,
      messages: [
        {
          role: "user",
          content: `Create a detailed outline for a ${testTopic.articleType} article.

TOPIC: ${testTopic.topic}
TARGET KEYWORD: ${testTopic.targetKeyword}
WORD TARGET: 1500-2000 words

Return JSON only (no markdown code blocks):
{
  "title": "SEO-optimized title including keyword",
  "description": "Meta description under 155 characters",
  "sections": [
    {
      "heading": "Section heading",
      "level": 2,
      "keyPoints": ["point 1", "point 2", "point 3"]
    }
  ],
  "faqQuestions": ["Question 1?", "Question 2?", "Question 3?"]
}

Requirements:
- Title must include the target keyword naturally
- Description must be compelling and under 155 characters
- Include 5-7 main sections (H2) with key points
- FAQ should address real user questions about stacking`,
        },
      ],
    });

    const duration = Date.now() - startTime;

    // Extract response text
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in response");
    }

    // Parse JSON (handle potential markdown code blocks)
    let jsonStr = textContent.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const outline = JSON.parse(jsonStr);

    console.log("✅ Outline generated successfully!\n");
    console.log("📊 Results:");
    console.log(`   Title: ${outline.title}`);
    console.log(`   Description: ${outline.description}`);
    console.log(`   Sections: ${outline.sections.length}`);
    console.log(`   FAQ Questions: ${outline.faqQuestions.length}`);
    console.log(`\n⏱️  Duration: ${duration}ms`);
    console.log(`💰 Estimated cost: ~$0.002 (Haiku)`);

    console.log("\n📋 Section Headings:");
    outline.sections.forEach((section: { heading: string; level: number }, i: number) => {
      console.log(`   ${i + 1}. ${section.heading} (H${section.level})`);
    });

    console.log("\n❓ FAQ Questions:");
    outline.faqQuestions.forEach((q: string, i: number) => {
      console.log(`   ${i + 1}. ${q}`);
    });

    console.log("\n✅ Pipeline test PASSED!");
    console.log("   The AI content generation system is working correctly.");

    // Calculate token usage
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    console.log(`\n📈 Token Usage:`);
    console.log(`   Input: ${inputTokens} tokens`);
    console.log(`   Output: ${outputTokens} tokens`);

  } catch (error) {
    console.error("\n❌ Pipeline test FAILED!");
    console.error("Error:", error);
    process.exit(1);
  }
}

testPipeline();
