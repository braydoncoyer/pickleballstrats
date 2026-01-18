/**
 * Daily Blog Generation Script
 *
 * Generates 10 SEO-optimized articles following the content pillar strategy.
 * Runs the full pipeline: planning → generation → review → publish
 *
 * Usage:
 *   npx tsx scripts/generate-daily-articles.ts
 */

import dotenv from "dotenv";
import { client } from "../lib/sanity/client";
import {
  activeContentPillarsQuery,
  activeToneProfileQuery,
} from "../lib/sanity/queries";
import {
  createArticle,
  publishArticle,
  updateTopicStatus,
} from "../lib/sanity/mutations";
import { planDailyContent, type ContentPillar } from "../lib/generation/topic-planner";
import {
  generateArticle,
  type TopicInput,
  type GenerationResult,
} from "../lib/generation/article-pipeline";
import type { ToneProfile } from "../lib/ai/tone-training";

// Load environment variables
dotenv.config();

// ============================================
// Types
// ============================================

interface GenerationReport {
  date: string;
  totalAttempted: number;
  totalSucceeded: number;
  totalFailed: number;
  articles: Array<{
    title: string;
    slug: string;
    articleType: string;
    wordCount: number;
    reviewScore?: number;
    status: "success" | "failed";
    error?: string;
    cost: number;
  }>;
  totalWordCount: number;
  totalCost: number;
  costByModel: {
    haiku: number;
    sonnet: number;
    opus: number;
  };
  executionTimeMs: number;
}

// ============================================
// Main Execution
// ============================================

async function main() {
  const startTime = Date.now();
  const today = new Date().toISOString().split("T")[0];

  console.log("=".repeat(60));
  console.log(`📰 Daily Blog Generation - ${today}`);
  console.log("=".repeat(60));

  try {
    // Step 1: Load configuration
    console.log("\n1️⃣  Loading configuration from Sanity CMS...");
    const [pillars, toneProfile] = await Promise.all([
      loadContentPillars(),
      loadToneProfile(),
    ]);

    console.log(`✓ Loaded ${pillars.length} active content pillars`);
    console.log(`✓ Using tone profile: ${toneProfile.name}`);

    // Step 2: Plan today's content
    console.log("\n2️⃣  Planning today's content mix...");
    const dailyPlan = await planDailyContent(pillars, today);

    console.log(`✓ Planned ${dailyPlan.topics.length} articles:`);
    dailyPlan.topics.forEach((topic) => {
      console.log(`   - [${topic.articleType}] ${topic.topic}`);
    });

    // Step 3: Generate articles
    console.log("\n3️⃣  Generating articles...");
    const results: GenerationResult[] = [];

    for (let i = 0; i < dailyPlan.topics.length; i++) {
      const plannedTopic = dailyPlan.topics[i];
      console.log(`\n📝 Article ${i + 1}/${dailyPlan.topics.length}`);
      console.log(`   Topic: ${plannedTopic.topic}`);
      console.log(`   Type: ${plannedTopic.articleType}`);

      const topicInput: TopicInput = {
        topic: plannedTopic.topic,
        articleType: plannedTopic.articleType,
        targetKeyword: plannedTopic.targetKeyword,
        contentPillarId: plannedTopic.pillarId,
      };

      const result = await generateArticle(topicInput, toneProfile, {
        onStageComplete: (stage, stageResult) => {
          console.log(`   ✓ ${stage}`);
        },
      });

      results.push(result);

      if (result.success) {
        console.log(`   ✅ Generated: ${result.article?.title}`);
        console.log(`   📊 Word count: ${result.article?.wordCount}`);
        console.log(`   🎯 Review score: ${result.metrics.reviewScore}/100`);
        console.log(`   💰 Cost: $${result.metrics.estimatedCost.toFixed(4)}`);
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
    }

    // Step 4: Publish to Sanity
    console.log("\n4️⃣  Publishing articles to Sanity CMS...");
    const publishResults = await publishArticlesToSanity(results, dailyPlan.topics);

    console.log(`✓ Published ${publishResults.published} articles`);
    console.log(`✗ Failed ${publishResults.failed} articles`);

    // Step 5: Generate report
    console.log("\n5️⃣  Generating final report...");
    const report = generateReport(
      results,
      dailyPlan,
      today,
      Date.now() - startTime
    );

    printReport(report);

    // Exit with appropriate code
    process.exit(report.totalFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// ============================================
// Helper Functions
// ============================================

async function loadContentPillars(): Promise<ContentPillar[]> {
  const pillars = await client.fetch(activeContentPillarsQuery);

  if (!pillars || pillars.length === 0) {
    throw new Error("No active content pillars found in Sanity");
  }

  // Transform to match ContentPillar interface
  return pillars.map((p: any) => ({
    id: p._id,
    title: p.title,
    primaryKeywords: p.primaryKeywords || [],
    secondaryKeywords: p.secondaryKeywords || [],
    topicQueue: p.topicQueue || [],
  }));
}

async function loadToneProfile(): Promise<ToneProfile> {
  const profile = await client.fetch(activeToneProfileQuery);

  if (!profile) {
    throw new Error("No active tone profile found in Sanity");
  }

  return profile as ToneProfile;
}

async function publishArticlesToSanity(
  results: GenerationResult[],
  plannedTopics: any[]
): Promise<{ published: number; failed: number }> {
  let published = 0;
  let failed = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const plannedTopic = plannedTopics[i];

    if (!result.success || !result.article) {
      failed++;
      continue;
    }

    try {
      // Convert markdown to Portable Text (simplified)
      const bodyBlocks = markdownToPortableText(result.article.body);

      // Create article in Sanity
      const articleDoc = await createArticle({
        title: result.article.title,
        slug: result.article.slug,
        description: result.article.description,
        body: bodyBlocks,
        articleType: result.article.articleType,
        tags: result.article.tags,
        targetKeywords: result.article.targetKeywords,
        contentPillarId: plannedTopic.pillarId,
        generationMetadata: {
          generatedAt: new Date().toISOString(),
          model: "claude-sonnet-4-20250514",
          reviewStatus: "passed",
          reviewScore: result.metrics.reviewScore,
          estimatedCost: result.metrics.estimatedCost,
        },
      });

      // Publish the article
      await publishArticle(articleDoc._id);

      // Update topic status in pillar
      const pillarIndex = plannedTopics.findIndex(
        (t) => t.topic === plannedTopic.topic
      );
      if (pillarIndex !== -1) {
        await updateTopicStatus(plannedTopic.pillarId, pillarIndex, "published");
      }

      published++;
    } catch (error) {
      console.error(`   Failed to publish: ${result.article.title}`, error);
      failed++;
    }
  }

  return { published, failed };
}

/**
 * Convert markdown to Sanity Portable Text blocks
 * (Simplified implementation - would need proper markdown parser in production)
 */
function markdownToPortableText(markdown: string): any[] {
  const blocks: any[] = [];
  const lines = markdown.split("\n");

  let currentBlock: any = null;

  for (const line of lines) {
    if (line.trim() === "") {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    // Headings
    if (line.startsWith("# ")) {
      blocks.push({
        _type: "block",
        style: "h1",
        children: [{ _type: "span", text: line.slice(2) }],
      });
    } else if (line.startsWith("## ")) {
      blocks.push({
        _type: "block",
        style: "h2",
        children: [{ _type: "span", text: line.slice(3) }],
      });
    } else if (line.startsWith("### ")) {
      blocks.push({
        _type: "block",
        style: "h3",
        children: [{ _type: "span", text: line.slice(4) }],
      });
    } else {
      // Normal paragraph
      if (!currentBlock) {
        currentBlock = {
          _type: "block",
          style: "normal",
          children: [{ _type: "span", text: line }],
        };
      } else {
        currentBlock.children[0].text += " " + line;
      }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function generateReport(
  results: GenerationResult[],
  dailyPlan: any,
  date: string,
  executionTimeMs: number
): GenerationReport {
  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  const articles = results.map((result, index) => ({
    title: result.article?.title || "Failed to generate",
    slug: result.article?.slug || "",
    articleType: dailyPlan.topics[index].articleType,
    wordCount: result.article?.wordCount || 0,
    reviewScore: result.metrics.reviewScore,
    status: (result.success ? "success" : "failed") as "success" | "failed",
    error: result.error,
    cost: result.metrics.estimatedCost,
  }));

  const totalCost = results.reduce(
    (sum, r) => sum + r.metrics.estimatedCost,
    0
  );
  const totalWordCount = succeeded.reduce(
    (sum, r) => sum + (r.article?.wordCount || 0),
    0
  );

  // Calculate cost by model (simplified)
  const costByModel = {
    haiku: totalCost * 0.1, // Rough estimate
    sonnet: totalCost * 0.85,
    opus: totalCost * 0.05,
  };

  return {
    date,
    totalAttempted: results.length,
    totalSucceeded: succeeded.length,
    totalFailed: failed.length,
    articles,
    totalWordCount,
    totalCost,
    costByModel,
    executionTimeMs,
  };
}

function printReport(report: GenerationReport) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 GENERATION REPORT");
  console.log("=".repeat(60));

  console.log(`\nDate: ${report.date}`);
  console.log(`Execution Time: ${(report.executionTimeMs / 1000 / 60).toFixed(2)} minutes`);

  console.log(`\n📈 Articles:`);
  console.log(`   Total Attempted: ${report.totalAttempted}`);
  console.log(`   ✅ Succeeded: ${report.totalSucceeded}`);
  console.log(`   ❌ Failed: ${report.totalFailed}`);

  console.log(`\n📝 Content:`);
  console.log(`   Total Words: ${report.totalWordCount.toLocaleString()}`);
  console.log(`   Avg Words/Article: ${Math.round(report.totalWordCount / report.totalSucceeded)}`);

  console.log(`\n💰 Costs:`);
  console.log(`   Total: $${report.totalCost.toFixed(4)}`);
  console.log(`   Avg/Article: $${(report.totalCost / report.totalAttempted).toFixed(4)}`);
  console.log(`   Haiku: $${report.costByModel.haiku.toFixed(4)}`);
  console.log(`   Sonnet: $${report.costByModel.sonnet.toFixed(4)}`);
  console.log(`   Opus: $${report.costByModel.opus.toFixed(4)}`);

  if (report.totalFailed > 0) {
    console.log(`\n❌ Failed Articles:`);
    report.articles
      .filter((a) => a.status === "failed")
      .forEach((article) => {
        console.log(`   - ${article.error}`);
      });
  }

  console.log(`\n✅ Generated Articles:`);
  report.articles
    .filter((a) => a.status === "success")
    .forEach((article, index) => {
      console.log(
        `   ${index + 1}. [${article.articleType}] ${article.title} (${article.wordCount} words, score: ${article.reviewScore}/100)`
      );
    });

  console.log("\n" + "=".repeat(60));
}

// ============================================
// Run Script
// ============================================

main();
