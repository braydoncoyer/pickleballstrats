/**
 * Generate Titles Script
 *
 * Generates SEO-optimized titles for queued topics without generating content.
 * This is Phase 1 of the two-phase article generation workflow:
 *
 * Phase 1: generate-titles.ts (this script)
 *   - Generates titles for all queued topics
 *   - Status: queued → titled
 *   - Uses Haiku (fast/cheap)
 *
 * Phase 2: generate-articles.ts
 *   - Generates content for titled topics
 *   - Uses the pre-generated title (no regeneration)
 *   - Status: titled → published
 *
 * Usage: npx tsx scripts/generate-titles.ts [count]
 * Example: npx tsx scripts/generate-titles.ts 10
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import {
  ARTICLE_STRUCTURE_TEMPLATES,
  HOOK_TEMPLATES,
} from "../lib/ai/tone-training";

// Initialize clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

// ============================================
// Types
// ============================================

interface QueuedTopic {
  _key: string;
  topic: string;
  articleType: "how-to" | "summary" | "comparison";
  targetKeyword: string;
  priority: number;
  status: "queued" | "titled" | "in-progress" | "published" | "skipped";
  generatedTitle?: string;
  pillarId: string;
  pillarSlug: string;
}

interface ExistingArticle {
  title: string;
  targetKeywords: string[];
}

// ============================================
// Fetch Functions
// ============================================

/**
 * Fetch queued topics (status === "queued") from all content pillars
 */
async function getQueuedTopics(limit: number): Promise<QueuedTopic[]> {
  const query = `*[_type == "contentPillar" && active == true] {
    _id,
    "slug": slug.current,
    topicQueue[] {
      _key,
      topic,
      articleType,
      targetKeyword,
      priority,
      status,
      generatedTitle
    }
  }`;

  const pillars = await sanityClient.fetch(query);

  // Flatten and filter queued topics (no title yet)
  const allTopics: QueuedTopic[] = [];

  for (const pillar of pillars) {
    if (!pillar.topicQueue) continue;

    for (const topic of pillar.topicQueue) {
      if (topic.status === "queued" && !topic.generatedTitle) {
        allTopics.push({
          ...topic,
          pillarId: pillar._id,
          pillarSlug: pillar.slug,
        });
      }
    }
  }

  // Sort by priority (lower number = higher priority)
  allTopics.sort((a, b) => a.priority - b.priority);

  return allTopics.slice(0, limit);
}

/**
 * Fetch all existing article titles for duplicate checking
 */
async function getExistingTitles(): Promise<string[]> {
  const query = `*[_type == "article"]{ title }`;
  const articles = await sanityClient.fetch<ExistingArticle[]>(query);
  return articles.map((a) => a.title);
}

/**
 * Fetch all already-titled topics for duplicate checking
 */
async function getTitledTopics(): Promise<string[]> {
  const query = `*[_type == "contentPillar"] {
    topicQueue[status in ["titled", "in-progress", "published"]] {
      generatedTitle
    }
  }`;

  const pillars = await sanityClient.fetch(query);
  const titles: string[] = [];

  for (const pillar of pillars) {
    if (!pillar.topicQueue) continue;
    for (const topic of pillar.topicQueue) {
      if (topic.generatedTitle) {
        titles.push(topic.generatedTitle);
      }
    }
  }

  return titles;
}

// ============================================
// Title Generation
// ============================================

/**
 * Generate an SEO-optimized title for a topic
 */
async function generateTitle(
  topic: string,
  articleType: string,
  targetKeyword: string
): Promise<string> {
  const template = ARTICLE_STRUCTURE_TEMPLATES[articleType];

  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 200,
    temperature: 0.7,
    messages: [
      {
        role: "user",
        content: `Generate a single SEO-optimized title for this article.

TOPIC: ${topic}
ARTICLE TYPE: ${articleType}
TARGET KEYWORD: ${targetKeyword}

TITLE PATTERNS FOR ${articleType.toUpperCase()}:
${template?.structure.split("\n").slice(0, 5).join("\n") || "Standard title format"}

⛔ CRITICAL RULES - MUST FOLLOW:
1. NO COLONS (:) in the title - this is non-negotiable
2. Include the target keyword naturally
3. Keep under 60 characters if possible
4. Make it compelling and click-worthy

❌ WRONG (contains colon):
- "Pickleball Stacking: The Ultimate Guide"
- "Third Shot Drop: Master This Shot"

✅ CORRECT (no colon):
- "The Complete Guide to Pickleball Stacking Strategy"
- "How to Master the Third Shot Drop in Pickleball"
- "10 Essential Pickleball Drills for 4.0 Players"

Return ONLY the title, nothing else. No quotes, no explanation.`,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in response");
  }

  let title = textContent.text.trim();

  // Remove any quotes that might have been added
  title = title.replace(/^["']|["']$/g, "");

  // Safety check: if title still has a colon, fix it
  if (title.includes(":")) {
    console.log(`   ⚠️  Title contains colon, fixing: "${title}"`);
    title = title.replace(/:/g, " -");
    console.log(`   ✓ Fixed: "${title}"`);
  }

  return title;
}

/**
 * Update topic with generated title in Sanity
 */
async function updateTopicTitle(
  pillarId: string,
  topicKey: string,
  generatedTitle: string
): Promise<void> {
  await sanityClient
    .patch(pillarId)
    .set({
      [`topicQueue[_key=="${topicKey}"].generatedTitle`]: generatedTitle,
      [`topicQueue[_key=="${topicKey}"].titleGeneratedAt`]: new Date().toISOString(),
      [`topicQueue[_key=="${topicKey}"].status`]: "titled",
    })
    .commit();
}

/**
 * Check if a title is too similar to existing titles
 */
function isTitleDuplicate(newTitle: string, existingTitles: string[]): boolean {
  const normalizedNew = newTitle.toLowerCase().trim();

  for (const existing of existingTitles) {
    const normalizedExisting = existing.toLowerCase().trim();

    // Exact match
    if (normalizedNew === normalizedExisting) {
      return true;
    }

    // Very similar (one is substring of other, allowing for minor differences)
    if (
      normalizedNew.length > 20 &&
      normalizedExisting.length > 20 &&
      (normalizedNew.includes(normalizedExisting.substring(0, 30)) ||
        normalizedExisting.includes(normalizedNew.substring(0, 30)))
    ) {
      return true;
    }
  }

  return false;
}

// ============================================
// Main
// ============================================

async function main() {
  const count = parseInt(process.argv[2] || "50", 10);

  console.log("📝 Title Generation Script");
  console.log("═".repeat(60));
  console.log(`   Generating titles for up to ${count} queued topics\n`);

  // Fetch existing titles for duplicate checking
  console.log("🔍 Loading existing titles...");
  const existingArticleTitles = await getExistingTitles();
  const existingTopicTitles = await getTitledTopics();
  const allExistingTitles = [...existingArticleTitles, ...existingTopicTitles];
  console.log(`   Found ${allExistingTitles.length} existing titles\n`);

  // Fetch queued topics
  console.log("📋 Fetching queued topics...");
  const queuedTopics = await getQueuedTopics(count);

  if (queuedTopics.length === 0) {
    console.log("\n⚠️  No queued topics found!");
    console.log("   Add topics to content pillar queues in Sanity Studio.");
    return;
  }

  console.log(`   Found ${queuedTopics.length} topics to title\n`);
  console.log("─".repeat(60));

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const generatedTitles: string[] = [];

  for (let i = 0; i < queuedTopics.length; i++) {
    const topic = queuedTopics[i];

    console.log(`\n[${i + 1}/${queuedTopics.length}] ${topic.topic}`);
    console.log(`    Type: ${topic.articleType} | Keyword: ${topic.targetKeyword}`);

    try {
      // Generate title
      const title = await generateTitle(
        topic.topic,
        topic.articleType,
        topic.targetKeyword
      );

      // Check for duplicates (against existing + newly generated in this batch)
      const allTitlesToCheck = [...allExistingTitles, ...generatedTitles];
      if (isTitleDuplicate(title, allTitlesToCheck)) {
        console.log(`    ⏭️  SKIPPED: Title too similar to existing`);
        console.log(`       "${title}"`);
        skipCount++;
        continue;
      }

      // Update in Sanity
      await updateTopicTitle(topic.pillarId, topic._key, title);
      generatedTitles.push(title);

      console.log(`    ✅ "${title}"`);
      successCount++;
    } catch (error) {
      console.error(`    ❌ Error: ${error}`);
      errorCount++;
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("\n📊 Summary:");
  console.log(`   ✅ Titles generated: ${successCount}`);
  console.log(`   ⏭️  Skipped (duplicates): ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total processed: ${queuedTopics.length}`);

  if (successCount > 0) {
    console.log("\n🎉 Title generation complete!");
    console.log("   Next steps:");
    console.log("   1. Review titles in Sanity Studio");
    console.log("   2. Edit any titles you want to change");
    console.log("   3. Run: npx tsx scripts/generate-articles.ts");
  }
}

main().catch(console.error);
