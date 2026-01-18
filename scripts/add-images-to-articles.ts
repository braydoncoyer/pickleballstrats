/**
 * Add Images to Existing Articles
 *
 * Analyzes existing articles and intelligently adds inline images
 * where they would complement the content.
 *
 * Usage: npx tsx scripts/add-images-to-articles.ts [--dry-run] [--limit=N]
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --limit=N    Process only N articles (default: all)
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import { findImageForArticle, isImageSourceAvailable } from "../lib/images/image-curator";

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

// Types
interface PortableTextBlock {
  _type: string;
  _key: string;
  style?: string;
  children?: Array<{ _type: string; text: string }>;
  url?: string;
  alt?: string;
  source?: string;
}

interface SanityArticle {
  _id: string;
  title: string;
  slug: { current: string };
  body: PortableTextBlock[];
  articleType: string;
}

interface ImageSuggestion {
  insertAfterIndex: number;
  sectionHeading: string;
  imageDescription: string;
  reason: string;
}

/**
 * Generate a unique key for Sanity blocks
 */
function generateBlockKey(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Convert Portable Text body to readable text for analysis
 */
function portableTextToPlainText(body: PortableTextBlock[]): string {
  const lines: string[] = [];

  body.forEach((block, index) => {
    if (block._type === "block") {
      const text = block.children?.map((c) => c.text).join("") || "";
      if (block.style === "h2") {
        lines.push(`\n[SECTION ${index}] ## ${text}`);
      } else if (block.style === "h3") {
        lines.push(`[SECTION ${index}] ### ${text}`);
      } else if (text.trim()) {
        lines.push(`[${index}] ${text}`);
      }
    } else if (block._type === "externalImage") {
      lines.push(`[${index}] [IMAGE ALREADY EXISTS]`);
    }
  });

  return lines.join("\n");
}

/**
 * Check if article already has inline images
 */
function countInlineImages(body: PortableTextBlock[]): number {
  return body.filter((block) => block._type === "externalImage" || block._type === "image").length;
}

/**
 * Use Claude to analyze the article and suggest image placements
 */
async function analyzeArticleForImages(
  title: string,
  bodyText: string,
  existingImageCount: number
): Promise<ImageSuggestion[]> {
  // Determine how many images to suggest based on existing count
  const maxNewImages = existingImageCount === 0 ? 3 : Math.max(1, 2 - existingImageCount);

  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1024,
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: `Analyze this pickleball article and suggest where images would be most valuable.

ARTICLE TITLE: ${title}

ARTICLE CONTENT (with block indices):
${bodyText}

EXISTING INLINE IMAGES: ${existingImageCount}

TASK: Suggest ${maxNewImages > 1 ? `1-${maxNewImages}` : "1"} image placements that would genuinely complement the content.

GUIDELINES:
- Images should visualize techniques, positions, or concepts being explained
- Place images AFTER the section heading they relate to (not before)
- DON'T add images just for the sake of it - only where they add value
- Prefer sections that describe physical actions, court positions, or equipment
- Skip sections that are purely conceptual or list-based (FAQ, bullet points)
- At minimum, suggest ONE image placement

Return JSON only (no markdown code blocks):
{
  "suggestions": [
    {
      "insertAfterIndex": <block index to insert after>,
      "sectionHeading": "The H2/H3 this relates to",
      "imageDescription": "Brief description for image search (e.g., 'pickleball player demonstrating ready position at kitchen line')",
      "reason": "Why an image helps here"
    }
  ]
}

If the article truly doesn't benefit from images (rare), return: {"suggestions": []}`,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    return [];
  }

  let jsonStr = textContent.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  try {
    const result = JSON.parse(jsonStr);
    return result.suggestions || [];
  } catch {
    console.log("   ⚠️  Failed to parse AI response");
    return [];
  }
}

/**
 * Generate SEO-friendly alt text for an image
 */
async function generateAltText(description: string, articleTitle: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 100,
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: `Generate a concise, SEO-friendly alt text (under 125 characters) for a pickleball image.

ARTICLE: ${articleTitle}
IMAGE SHOWS: ${description}

The alt text should:
- Describe what's shown in a pickleball context
- Include relevant keywords naturally
- Be descriptive and accessible
- NOT start with "Image of" or "Picture of"

Return ONLY the alt text, nothing else.`,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    return description;
  }

  return textContent.text.trim().substring(0, 125);
}

/**
 * Detect image source from URL
 */
function detectImageSource(url: string): "unsplash" | "dalle" | "imagen" | undefined {
  if (url.includes("unsplash.com")) return "unsplash";
  if (url.includes("oaidalleapiprodscus") || url.includes("openai")) return "dalle";
  if (url.includes("googleapis.com") || url.includes("gemini")) return "imagen";
  return undefined;
}

/**
 * Insert images into the article body
 */
async function insertImagesIntoBody(
  body: PortableTextBlock[],
  suggestions: ImageSuggestion[],
  articleTitle: string
): Promise<{ updatedBody: PortableTextBlock[]; imagesAdded: number }> {
  // Sort suggestions by index descending so we insert from bottom to top
  // (this prevents index shifting issues)
  const sortedSuggestions = [...suggestions].sort(
    (a, b) => b.insertAfterIndex - a.insertAfterIndex
  );

  const updatedBody = [...body];
  let imagesAdded = 0;

  for (const suggestion of sortedSuggestions) {
    try {
      // Find image
      const result = await findImageForArticle({
        topic: `pickleball ${suggestion.imageDescription}`,
        keywords: ["pickleball"],
      });

      if (!result.success || !result.image) {
        console.log(`   ⚠️  No image found for: ${suggestion.sectionHeading}`);
        continue;
      }

      // Generate alt text
      const altText = await generateAltText(suggestion.imageDescription, articleTitle);

      // Create the image block
      const imageBlock: PortableTextBlock = {
        _type: "externalImage",
        _key: generateBlockKey(),
        url: result.image.url,
        alt: altText,
        source: detectImageSource(result.image.url),
      };

      // Insert after the specified index
      const insertAt = Math.min(suggestion.insertAfterIndex + 1, updatedBody.length);
      updatedBody.splice(insertAt, 0, imageBlock);
      imagesAdded++;

      console.log(`   ✓ Added image after "${suggestion.sectionHeading}" (${result.image.source})`);
    } catch (error) {
      console.log(`   ⚠️  Failed to add image: ${error}`);
    }
  }

  return { updatedBody, imagesAdded };
}

/**
 * Update article in Sanity
 */
async function updateArticleBody(
  articleId: string,
  newBody: PortableTextBlock[]
): Promise<void> {
  await sanityClient.patch(articleId).set({ body: newBody }).commit();
}

/**
 * Process a single article
 */
async function processArticle(
  article: SanityArticle,
  dryRun: boolean
): Promise<{ success: boolean; imagesAdded: number }> {
  console.log(`\n📄 Processing: ${article.title}`);

  // Count existing inline images
  const existingImageCount = countInlineImages(article.body);
  console.log(`   Existing inline images: ${existingImageCount}`);

  // Skip if already has 3+ images
  if (existingImageCount >= 3) {
    console.log(`   ⏭️  Skipping - already has sufficient images`);
    return { success: true, imagesAdded: 0 };
  }

  // Convert to plain text for analysis
  const bodyText = portableTextToPlainText(article.body);

  // Get AI suggestions for image placements
  console.log(`   🤖 Analyzing content for image opportunities...`);
  const suggestions = await analyzeArticleForImages(
    article.title,
    bodyText,
    existingImageCount
  );

  if (suggestions.length === 0) {
    console.log(`   ⚠️  No suitable image placements found`);
    return { success: true, imagesAdded: 0 };
  }

  console.log(`   📸 Found ${suggestions.length} image opportunities:`);
  suggestions.forEach((s, i) => {
    console.log(`      ${i + 1}. ${s.sectionHeading} - ${s.reason}`);
  });

  if (dryRun) {
    console.log(`   🔍 DRY RUN - Would add ${suggestions.length} images`);
    return { success: true, imagesAdded: suggestions.length };
  }

  // Insert images
  console.log(`   🖼️  Fetching and inserting images...`);
  const { updatedBody, imagesAdded } = await insertImagesIntoBody(
    article.body,
    suggestions,
    article.title
  );

  if (imagesAdded === 0) {
    console.log(`   ⚠️  No images could be added`);
    return { success: true, imagesAdded: 0 };
  }

  // Update in Sanity
  console.log(`   💾 Updating article in Sanity...`);
  await updateArticleBody(article._id, updatedBody);

  console.log(`   ✅ Added ${imagesAdded} images`);
  return { success: true, imagesAdded };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;

  console.log("🖼️  Add Images to Existing Articles");
  console.log("═".repeat(50));

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  // Check image sources
  if (!isImageSourceAvailable()) {
    console.log("❌ No image sources available. Check your API keys.");
    return;
  }

  // Fetch articles from Sanity
  console.log("📋 Fetching articles from Sanity...");

  let query = `*[_type == "article"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    body,
    articleType
  }`;

  if (limit) {
    query = query.replace("}", `}[0...${limit}]`);
  }

  const articles: SanityArticle[] = await sanityClient.fetch(query);

  console.log(`   Found ${articles.length} articles\n`);

  if (articles.length === 0) {
    console.log("⚠️  No articles found");
    return;
  }

  // Process each article
  let totalImagesAdded = 0;
  let articlesProcessed = 0;
  let articlesWithNewImages = 0;

  for (const article of articles) {
    try {
      const result = await processArticle(article, dryRun);
      articlesProcessed++;

      if (result.imagesAdded > 0) {
        totalImagesAdded += result.imagesAdded;
        articlesWithNewImages++;
      }
    } catch (error) {
      console.log(`   ❌ Error processing article: ${error}`);
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary
  console.log("\n" + "═".repeat(50));
  console.log("📊 Summary:");
  console.log(`   Articles processed: ${articlesProcessed}`);
  console.log(`   Articles with new images: ${articlesWithNewImages}`);
  console.log(`   Total images added: ${totalImagesAdded}`);

  if (dryRun) {
    console.log("\n🔍 This was a dry run. Run without --dry-run to apply changes.");
  } else if (totalImagesAdded > 0) {
    console.log("\n✅ Done! Run 'npx tsx scripts/sync-sanity-to-files.ts' to sync changes.");
  }
}

main().catch(console.error);
