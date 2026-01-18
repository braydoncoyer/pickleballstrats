/**
 * Replace Existing Images with AI-Generated Images
 *
 * Goes through all articles and replaces Unsplash images with
 * AI-generated images using Nano Banana (gemini-2.5-flash-image).
 *
 * Usage: npx tsx scripts/replace-images-with-ai.ts [--dry-run] [--limit=N]
 */

import "dotenv/config";
import { createClient } from "@sanity/client";
import { GoogleGenAI } from "@google/genai";

// Initialize clients
const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

const geminiApiKey = process.env.GEMINI_API_KEY;

// Types
interface PortableTextBlock {
  _type: string;
  _key: string;
  style?: string;
  children?: Array<{ _type: string; text: string }>;
  url?: string;
  alt?: string;
  source?: string;
  caption?: string;
}

interface SanityArticle {
  _id: string;
  title: string;
  slug: { current: string };
  body: PortableTextBlock[];
}

/**
 * Generate an image with Nano Banana
 */
async function generateImageWithNanoBanana(
  prompt: string
): Promise<{ base64: string; mimeType: string }> {
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  // Enhanced prompt for pickleball-specific images
  const enhancedPrompt = `Create a professional, realistic photograph for a pickleball article: ${prompt}

Requirements:
- Realistic photography style, NOT cartoon or illustration
- Show actual pickleball players, paddles, balls, or courts
- Dynamic action shots or instructional poses
- Professional sports photography lighting
- No text, watermarks, or overlays
- Wide 16:9 aspect ratio
- Vibrant but natural colors`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: enhancedPrompt,
    config: {
      responseModalities: ["image", "text"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;

  if (!parts || parts.length === 0) {
    throw new Error("Gemini did not return any content");
  }

  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith("image/")) {
      const base64 = part.inlineData.data;
      const mimeType = part.inlineData.mimeType;

      if (!base64) {
        throw new Error("Gemini returned empty image data");
      }

      return { base64, mimeType };
    }
  }

  throw new Error("Gemini did not return an image");
}

/**
 * Upload base64 image to Sanity CDN
 */
async function uploadImageToSanity(
  base64: string,
  mimeType: string,
  filename: string
): Promise<string> {
  // Convert base64 to buffer
  const buffer = Buffer.from(base64, "base64");

  // Upload to Sanity
  const asset = await sanityClient.assets.upload("image", buffer, {
    filename,
    contentType: mimeType,
  });

  // Return the URL
  return asset.url;
}

/**
 * Generate a unique key for Sanity blocks
 */
function generateBlockKey(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Find all externalImage blocks in an article
 */
function findExternalImages(
  body: PortableTextBlock[]
): Array<{ index: number; block: PortableTextBlock }> {
  const images: Array<{ index: number; block: PortableTextBlock }> = [];

  body.forEach((block, index) => {
    if (block._type === "externalImage" && block.url) {
      images.push({ index, block });
    }
  });

  return images;
}

/**
 * Get context around an image for better prompt generation
 */
function getImageContext(
  body: PortableTextBlock[],
  imageIndex: number
): { sectionHeading: string; surroundingText: string } {
  let sectionHeading = "";
  let surroundingText = "";

  // Look backwards for the nearest heading
  for (let i = imageIndex - 1; i >= 0; i--) {
    const block = body[i];
    if (block._type === "block" && (block.style === "h2" || block.style === "h3")) {
      sectionHeading = block.children?.map((c) => c.text).join("") || "";
      break;
    }
  }

  // Get text from surrounding paragraphs
  const textBlocks: string[] = [];
  for (let i = Math.max(0, imageIndex - 2); i < Math.min(body.length, imageIndex + 2); i++) {
    const block = body[i];
    if (block._type === "block" && block.style === "normal") {
      const text = block.children?.map((c) => c.text).join("") || "";
      if (text) textBlocks.push(text);
    }
  }
  surroundingText = textBlocks.join(" ").substring(0, 300);

  return { sectionHeading, surroundingText };
}

/**
 * Create a prompt for image generation based on context
 */
function createImagePrompt(
  articleTitle: string,
  sectionHeading: string,
  altText: string,
  surroundingText: string
): string {
  // Use alt text as primary description, with context
  let prompt = altText || sectionHeading;

  // Add context about what the section is about
  if (sectionHeading && !prompt.toLowerCase().includes(sectionHeading.toLowerCase())) {
    prompt = `${sectionHeading}: ${prompt}`;
  }

  // Make sure it mentions pickleball if not already
  if (!prompt.toLowerCase().includes("pickleball")) {
    prompt = `Pickleball - ${prompt}`;
  }

  return prompt;
}

/**
 * Process a single article
 */
async function processArticle(
  article: SanityArticle,
  dryRun: boolean
): Promise<{ success: boolean; imagesReplaced: number }> {
  console.log(`\n📄 Processing: ${article.title}`);

  const externalImages = findExternalImages(article.body);

  if (externalImages.length === 0) {
    console.log(`   ⏭️  No external images found`);
    return { success: true, imagesReplaced: 0 };
  }

  console.log(`   Found ${externalImages.length} images to replace`);

  if (dryRun) {
    externalImages.forEach(({ block }, i) => {
      console.log(`   ${i + 1}. Would replace: ${block.alt?.substring(0, 50)}...`);
    });
    return { success: true, imagesReplaced: externalImages.length };
  }

  const updatedBody = [...article.body];
  let imagesReplaced = 0;

  for (let i = 0; i < externalImages.length; i++) {
    const { index, block } = externalImages[i];

    try {
      // Get context for better prompt
      const context = getImageContext(article.body, index);

      // Create prompt
      const prompt = createImagePrompt(
        article.title,
        context.sectionHeading,
        block.alt || "",
        context.surroundingText
      );

      console.log(`   🎨 Generating image ${i + 1}/${externalImages.length}: "${prompt.substring(0, 60)}..."`);

      // Generate image with Nano Banana
      const { base64, mimeType } = await generateImageWithNanoBanana(prompt);

      // Upload to Sanity CDN
      const extension = mimeType.split("/")[1] || "png";
      const filename = `${article.slug.current}-image-${i + 1}.${extension}`;

      console.log(`   📤 Uploading to Sanity CDN...`);
      const imageUrl = await uploadImageToSanity(base64, mimeType, filename);

      // Update the block in the body
      updatedBody[index] = {
        ...block,
        _key: block._key || generateBlockKey(),
        url: imageUrl,
        source: "imagen",
      };

      imagesReplaced++;
      console.log(`   ✓ Image ${i + 1} replaced successfully`);

      // Small delay to avoid rate limiting
      if (i < externalImages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.log(`   ⚠️  Failed to replace image ${i + 1}: ${error}`);
    }
  }

  if (imagesReplaced > 0) {
    // Update the article in Sanity
    console.log(`   💾 Updating article in Sanity...`);
    await sanityClient.patch(article._id).set({ body: updatedBody }).commit();
    console.log(`   ✅ Replaced ${imagesReplaced} images`);
  }

  return { success: true, imagesReplaced };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;

  console.log("🍌 Replace Images with AI-Generated (Nano Banana)");
  console.log("═".repeat(50));

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  // Check Gemini API key
  if (!geminiApiKey) {
    console.log("❌ GEMINI_API_KEY not configured in .env");
    return;
  }

  console.log("✓ Gemini API key configured");

  // Fetch articles from Sanity
  console.log("\n📋 Fetching articles from Sanity...");

  let query = `*[_type == "article"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    body
  }`;

  if (limit) {
    query = query.replace("}", `}[0...${limit}]`);
  }

  const articles: SanityArticle[] = await sanityClient.fetch(query);

  console.log(`   Found ${articles.length} articles`);

  // Count total images to replace
  let totalImages = 0;
  for (const article of articles) {
    totalImages += findExternalImages(article.body).length;
  }

  console.log(`   Total images to replace: ${totalImages}`);
  console.log(`   Estimated cost: ~$${(totalImages * 0.039).toFixed(2)}`);

  if (totalImages === 0) {
    console.log("\n⚠️  No images found to replace");
    return;
  }

  // Process each article
  let totalReplaced = 0;
  let articlesProcessed = 0;

  for (const article of articles) {
    try {
      const result = await processArticle(article, dryRun);
      articlesProcessed++;
      totalReplaced += result.imagesReplaced;
    } catch (error) {
      console.log(`   ❌ Error processing article: ${error}`);
    }
  }

  // Summary
  console.log("\n" + "═".repeat(50));
  console.log("📊 Summary:");
  console.log(`   Articles processed: ${articlesProcessed}`);
  console.log(`   Images replaced: ${totalReplaced}`);
  console.log(`   Estimated cost: ~$${(totalReplaced * 0.039).toFixed(2)}`);

  if (dryRun) {
    console.log("\n🔍 This was a dry run. Run without --dry-run to apply changes.");
  } else if (totalReplaced > 0) {
    console.log("\n✅ Done! Run 'npx tsx scripts/sync-sanity-to-files.ts' to sync changes.");
  }
}

main().catch(console.error);
