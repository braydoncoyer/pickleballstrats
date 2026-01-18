/**
 * Generate Articles Script
 *
 * Generates articles using the AI pipeline and saves them to Sanity CMS.
 * Includes internal linking and image generation.
 *
 * Usage: npx tsx scripts/generate-articles.ts [count]
 * Example: npx tsx scripts/generate-articles.ts 3
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import type { ToneProfile } from "../lib/ai/tone-training";
import { addInternalLinks, getExistingArticles, removePlaceholders } from "../lib/generation/internal-linker";
import { findImageForArticle, isImageSourceAvailable, type BlogImage } from "../lib/images/image-curator";

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

// Default tone profile for pickleball content
const defaultToneProfile: ToneProfile = {
  name: "Pickleball Strategy Expert",
  voiceCharacteristics: {
    formality: "casual",
    technicalLevel: "intermediate",
    personality: ["knowledgeable", "encouraging", "practical", "passionate about pickleball"],
    perspective: "second-person",
    sentenceVariety: "varied",
  },
  samplePhrases: [
    "Let's break this down",
    "Here's what separates 3.5 players from 4.0+",
    "The key is",
    "This is where most players go wrong",
    "Once you master this",
    "Think of it like",
    "Pro tip:",
  ],
  transitionPhrases: [
    "Now that you understand",
    "Building on that foundation",
    "Here's where it gets interesting",
    "Let's dive deeper into",
    "With that in mind",
  ],
  introPatterns: [
    "Start with a relatable problem or scenario",
    "Hook with a surprising statistic or insight",
    "Address the reader directly about their goals",
  ],
  conclusionPatterns: [
    "Summarize key actionable takeaways",
    "Encourage practice and improvement",
    "Remind reader of the transformation possible",
  ],
  avoidPhrases: [
    "In conclusion",
    "As we all know",
    "It goes without saying",
    "At the end of the day",
    "Game changer",
    "Take your game to the next level",
  ],
  avoidPatterns: [
    "Starting paragraphs with 'So,'",
    "Excessive exclamation points",
    "Overly complex sentences",
    "Vague promises without specifics",
    "COLONS IN TITLES - Never use 'Title: Subtitle' format",
  ],
  structuralPreferences: {
    paragraphLength: "short",
    useSubheadings: "frequent",
    useLists: "moderate",
    useCodeExamples: false,
    includePersonalAnecdotes: true,
  },
  systemPromptPrefix: `You are an expert pickleball coach and content writer creating educational content for competitive players (3.5-5.0 skill level).

VOICE CHARACTERISTICS:
- Formality: casual but knowledgeable
- Technical Level: intermediate (assume reader knows basics)
- Perspective: second-person (address reader as "you")
- Personality: encouraging, practical, passionate about pickleball

SAMPLE PHRASES TO USE:
- "Let's break this down"
- "Here's what separates 3.5 players from 4.0+"
- "This is where most players go wrong"
- "Once you master this"
- "Pro tip:"

PHRASES TO AVOID:
- "In conclusion"
- "Game changer"
- "Take your game to the next level"
- Generic fluff without actionable advice

TITLE RULES (CRITICAL - MUST FOLLOW):
- NEVER use colons in titles
- ❌ WRONG: "10 Essential Drills: Elevate Your Game"
- ❌ WRONG: "Pickleball Strategy: The Ultimate Guide"
- ✅ RIGHT: "10 Essential Pickleball Drills for 4.0 Players"
- ✅ RIGHT: "The Complete Guide to Pickleball Stacking Strategy"
- ✅ RIGHT: "How to Master the Third Shot Drop"

STRUCTURAL PREFERENCES:
- Short paragraphs (2-3 sentences)
- Frequent subheadings for scannability
- Use bullet lists for steps and key points
- Include "Common Mistakes" sections
- End with FAQ section

CRITICAL: Write content that competitive pickleball players will find genuinely valuable. Every section should include specific, actionable advice.`,
};

// ============================================
// Topic Queue Management
// ============================================

interface QueuedTopic {
  _key: string;
  topic: string;
  articleType: "how-to" | "summary" | "comparison";
  targetKeyword: string;
  priority: number;
  status: "queued" | "in-progress" | "published" | "skipped";
  pillarId: string;
  pillarSlug: string;
}

// Word count targets by article type
const WORD_TARGETS: Record<string, { min: number; max: number; sections: string }> = {
  "how-to": { min: 800, max: 1200, sections: "4-5" },
  "summary": { min: 2000, max: 3000, sections: "6-8" },
  "comparison": { min: 1500, max: 2000, sections: "5-7" },
  "pillar": { min: 3000, max: 5000, sections: "8-10" },
};

/**
 * Fetch queued topics from all content pillars, ordered by priority
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
      status
    }
  }`;

  const pillars = await sanityClient.fetch(query);

  // Flatten and filter queued topics
  const allTopics: QueuedTopic[] = [];

  for (const pillar of pillars) {
    if (!pillar.topicQueue) continue;

    for (const topic of pillar.topicQueue) {
      if (topic.status === "queued") {
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
 * Update topic status in Sanity
 */
async function updateTopicStatus(
  pillarId: string,
  topicKey: string,
  newStatus: "queued" | "in-progress" | "published" | "skipped"
): Promise<void> {
  await sanityClient
    .patch(pillarId)
    .set({
      [`topicQueue[_key=="${topicKey}"].status`]: newStatus,
    })
    .commit();
}

/**
 * Check if an article with this keyword already exists
 */
async function checkExistingArticle(targetKeyword: string): Promise<boolean> {
  const query = `count(*[_type == "article" && $keyword in targetKeywords]) > 0`;
  return sanityClient.fetch(query, { keyword: targetKeyword });
}

interface ArticleImage {
  url: string;
  alt: string;
  source: "unsplash" | "dalle";
  attribution?: string;
}

interface GeneratedArticle {
  title: string;
  slug: string;
  description: string;
  body: string;
  articleType: "how-to" | "summary" | "pillar" | "comparison";
  tags: string[];
  targetKeywords: string[];
  wordCount: number;
  featuredImage?: ArticleImage;
  internalLinks: { anchorText: string; targetSlug: string; targetTitle: string }[];
  inlineImagesCount: number;
}

async function generateOutline(
  topic: string,
  articleType: string,
  targetKeyword: string
): Promise<{ title: string; description: string; sections: Array<{ heading: string; level: number; keyPoints: string[] }>; faqQuestions: string[] }> {
  console.log("   📋 Generating outline...");

  const wordTarget = WORD_TARGETS[articleType] || WORD_TARGETS["how-to"];
  const isSummary = articleType === "summary";

  // Build article-type-specific instructions
  let typeInstructions = "";
  if (isSummary) {
    typeInstructions = `
SUMMARY ARTICLE REQUIREMENTS:
- This is a roundup/summary article that covers multiple related techniques or concepts
- Structure should aggregate and compare different approaches
- Include sections for each major sub-topic within the theme
- Provide overview comparisons and when to use each approach
- Link to individual how-to articles for deeper dives`;
  } else if (articleType === "how-to") {
    typeInstructions = `
HOW-TO ARTICLE REQUIREMENTS:
- This is a focused, actionable tutorial on a specific technique
- Keep it concise and practical - no fluff
- Get to the point quickly
- Include step-by-step instructions where applicable
- Focus on one specific skill or concept`;
  }

  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 2048,
    temperature: 0.5,
    system: defaultToneProfile.systemPromptPrefix,
    messages: [
      {
        role: "user",
        content: `Create a detailed outline for a ${articleType} article.

TOPIC: ${topic}
TARGET KEYWORD: ${targetKeyword}
WORD TARGET: ${wordTarget.min}-${wordTarget.max} words
${typeInstructions}

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

TITLE REQUIREMENTS (CRITICAL):
- NEVER use colons in the title - no "Title: Subtitle" format
- ❌ WRONG: "Pickleball Stacking: The Ultimate Guide"
- ✅ RIGHT: "The Complete Guide to Pickleball Stacking Strategy"
- Title must include the target keyword naturally
- Keep under 60 characters if possible

OTHER REQUIREMENTS:
- Description must be compelling and under 155 characters (no colons)
- Include ${wordTarget.sections} main sections (H2)
- Each section should have 2-4 key points
- FAQ should address 3-5 real user questions`,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in outline response");
  }

  let jsonStr = textContent.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  return JSON.parse(jsonStr);
}

async function generateDraft(
  outline: { title: string; description: string; sections: Array<{ heading: string; level: number; keyPoints: string[] }>; faqQuestions: string[] },
  articleType: string,
  targetKeyword: string
): Promise<string> {
  console.log("   ✍️  Generating full article...");

  const wordTarget = WORD_TARGETS[articleType] || WORD_TARGETS["how-to"];
  const isSummary = articleType === "summary";
  const isHowTo = articleType === "how-to";

  // Build article-type-specific requirements
  let typeRequirements = "";
  if (isSummary) {
    typeRequirements = `
SUMMARY ARTICLE SPECIFIC REQUIREMENTS:
- This is a comprehensive roundup covering multiple related techniques
- Include comparisons between different approaches
- Add [INTERNAL: specific technique] placeholders to link to individual how-to articles
- Provide "when to use" guidance for each technique covered
- Include a comparison table or summary of key differences`;
  } else if (isHowTo) {
    typeRequirements = `
HOW-TO ARTICLE SPECIFIC REQUIREMENTS:
- Keep it focused and concise - this is a quick, actionable guide
- Get to the practical steps quickly (no long intros)
- Every paragraph should provide value
- Avoid filler content - if a section feels padded, cut it
- Aim for the lower end of the word count if the topic is simple`;
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    temperature: 0.7,
    system: defaultToneProfile.systemPromptPrefix,
    messages: [
      {
        role: "user",
        content: `Write the full article based on this outline.

OUTLINE:
${JSON.stringify(outline, null, 2)}

WORD TARGET: ${wordTarget.min}-${wordTarget.max} words
TARGET KEYWORD: ${targetKeyword}
ARTICLE TYPE: ${articleType}
${typeRequirements}

REQUIREMENTS:
1. Follow the outline structure exactly
2. Write engaging, valuable content for competitive pickleball players
3. Use the target keyword "${targetKeyword}" naturally 3-5 times
4. Include [INTERNAL: related topic] placeholders for internal links
5. Add the FAQ section at the end with answers
6. Include a "Common Mistakes" or "What to Avoid" section
7. Use short paragraphs (2-3 sentences max)
8. Include specific, actionable advice in every section
9. IMPORTANT: Stay within the ${wordTarget.min}-${wordTarget.max} word target

IMAGE PLACEHOLDERS:
Include 2-4 image placeholders throughout the article using this format:
[IMAGE: brief description of what the image should show]

Place images:
- After the introduction (showing the main concept)
- After key technique sections (demonstrating the technique)
- Before or after important tips (visual reinforcement)

Example: [IMAGE: pickleball player demonstrating proper grip for third shot drop]

OUTPUT FORMAT:
Return clean Markdown with proper heading hierarchy.
Start with the title as H1, then content with H2/H3 structure.

Write the complete article now:`,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in draft response");
  }

  return textContent.text;
}

/**
 * Process internal links in the content
 */
async function processInternalLinks(
  content: string,
  currentSlug: string,
  pillarSlug?: string
): Promise<{ linkedContent: string; linksAdded: { anchorText: string; targetSlug: string; targetTitle: string }[] }> {
  console.log("   🔗 Processing internal links...");

  // Check if there are any existing articles to link to
  const existingArticles = await getExistingArticles();

  if (existingArticles.length === 0) {
    // No articles to link to yet - just remove placeholders
    console.log("   ⚠️  No existing articles found for linking");
    return {
      linkedContent: removePlaceholders(content),
      linksAdded: [],
    };
  }

  try {
    const linkResult = await addInternalLinks(content, currentSlug, pillarSlug);

    if (linkResult.unresolvedPlaceholders.length > 0) {
      console.log(`   ⚠️  Unresolved placeholders: ${linkResult.unresolvedPlaceholders.length}`);
    }

    return {
      linkedContent: linkResult.linkedContent,
      linksAdded: linkResult.linksAdded,
    };
  } catch (error) {
    console.error("   ⚠️  Internal linking failed, removing placeholders:", error);
    return {
      linkedContent: removePlaceholders(content),
      linksAdded: [],
    };
  }
}

/**
 * Generate or find an appropriate image for the article
 */
async function getArticleImage(
  title: string,
  topic: string,
  keywords: string[]
): Promise<ArticleImage | undefined> {
  console.log("   🖼️  Finding article image...");

  if (!isImageSourceAvailable()) {
    console.log("   ⚠️  No image sources available");
    return undefined;
  }

  try {
    const result = await findImageForArticle({
      topic: `pickleball ${topic}`,
      keywords: ["pickleball", ...keywords.slice(0, 2)],
    });

    if (!result.success || !result.image) {
      console.log("   ⚠️  Failed to find image:", result.error);
      return undefined;
    }

    const image = result.image;

    // Generate SEO-friendly alt text using Claude
    const altText = await generateAltText(title, topic);

    if (image.source === "unsplash") {
      return {
        url: image.url,
        alt: altText,
        source: "unsplash",
        attribution: result.attribution,
      };
    } else {
      return {
        url: image.url,
        alt: altText,
        source: "dalle",
      };
    }
  } catch (error) {
    console.error("   ⚠️  Image generation failed:", error);
    return undefined;
  }
}

/**
 * Generate SEO-friendly alt text for an image
 */
async function generateAltText(title: string, topic: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 100,
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: `Generate a concise, SEO-friendly alt text (under 125 characters) for a pickleball article image.

ARTICLE TITLE: ${title}
TOPIC: ${topic}

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
    return `Pickleball player demonstrating ${topic} technique`;
  }

  return textContent.text.trim().substring(0, 125);
}

/**
 * Find and resolve image placeholders in the content
 * Replaces [IMAGE: description] with actual markdown image syntax
 */
async function resolveImagePlaceholders(
  content: string,
  articleTopic: string
): Promise<{ content: string; imagesAdded: number }> {
  console.log("   🖼️  Resolving image placeholders...");

  // Find all image placeholders: [IMAGE: description]
  const placeholderRegex = /\[IMAGE:\s*([^\]]+)\]/gi;
  const matches = [...content.matchAll(placeholderRegex)];

  if (matches.length === 0) {
    console.log("   ⚠️  No image placeholders found");
    return { content, imagesAdded: 0 };
  }

  console.log(`   📸 Found ${matches.length} image placeholders`);

  let processedContent = content;
  let imagesAdded = 0;
  const maxImages = 4; // Limit to avoid quota issues

  for (let i = 0; i < Math.min(matches.length, maxImages); i++) {
    const match = matches[i];
    const description = match[1].trim();
    const placeholder = match[0];

    try {
      // Try to find an image for this description
      const result = await findImageForArticle({
        topic: `pickleball ${description}`,
        keywords: ["pickleball", articleTopic.split(" ")[0]],
      });

      if (result.success && result.image) {
        // Generate alt text for the image
        const altText = await generateAltText(description, articleTopic);

        // Create markdown image syntax
        const markdownImage = `![${altText}](${result.image.url})`;

        // Replace the placeholder with the actual image
        processedContent = processedContent.replace(placeholder, markdownImage);
        imagesAdded++;

        console.log(`   ✓ Image ${i + 1}: ${result.image.source} (${altText.substring(0, 30)}...)`);
      } else {
        // Remove the placeholder if no image found
        processedContent = processedContent.replace(placeholder, "");
        console.log(`   ⚠️  No image found for: ${description.substring(0, 40)}...`);
      }
    } catch (error) {
      // Remove placeholder on error
      processedContent = processedContent.replace(placeholder, "");
      console.log(`   ⚠️  Image fetch failed: ${error}`);
    }
  }

  // Remove any remaining placeholders beyond the limit
  processedContent = processedContent.replace(placeholderRegex, "");

  return { content: processedContent, imagesAdded };
}

async function polishAndExtract(
  draft: string,
  targetKeyword: string,
  articleType: "how-to" | "summary" | "pillar" | "comparison"
): Promise<GeneratedArticle> {
  console.log("   ✨ Extracting metadata...");

  // Extract title from draft (first H1)
  const titleMatch = draft.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "Untitled Article";

  // Generate slug from title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);

  // Get metadata from Claude
  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1024,
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: `Extract metadata from this article title and content.

TITLE: ${title}
TARGET KEYWORD: ${targetKeyword}
FIRST 500 CHARS: ${draft.substring(0, 500)}

Return JSON only:
{
  "description": "Meta description under 155 chars, compelling and includes keyword",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "targetKeywords": ["${targetKeyword}", "secondary keyword 1", "secondary keyword 2"]
}`,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in metadata response");
  }

  let jsonStr = textContent.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  const metadata = JSON.parse(jsonStr);
  const wordCount = draft.split(/\s+/).filter(Boolean).length;

  return {
    title,
    slug,
    description: metadata.description,
    body: draft,
    tags: metadata.tags,
    targetKeywords: metadata.targetKeywords,
    articleType,
    wordCount,
    internalLinks: [], // Will be populated by processInternalLinks
    inlineImagesCount: 0, // Will be populated by resolveImagePlaceholders
  };
}

/**
 * Generate a unique key for Sanity blocks
 */
function generateBlockKey(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Parse markdown image syntax: ![alt](url)
 * Returns null if not an image line
 */
function parseImageLine(line: string): { alt: string; url: string } | null {
  // Match standalone image on a line: ![alt text](url)
  const imageRegex = /^!\[([^\]]*)\]\(([^)]+)\)$/;
  const match = line.trim().match(imageRegex);
  if (match) {
    return {
      alt: match[1] || "",
      url: match[2],
    };
  }
  return null;
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

function markdownToPortableText(markdown: string): unknown[] {
  const blocks: unknown[] = [];
  const lines = markdown.split("\n");
  let currentParagraph = "";

  // Helper to flush current paragraph to blocks
  const flushParagraph = () => {
    if (currentParagraph.trim()) {
      blocks.push({
        _type: "block",
        _key: generateBlockKey(),
        style: "normal",
        children: [{ _type: "span", text: currentParagraph.trim() }],
      });
      currentParagraph = "";
    }
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for image first
    const imageData = parseImageLine(trimmedLine);
    if (imageData) {
      flushParagraph();
      blocks.push({
        _type: "externalImage",
        _key: generateBlockKey(),
        url: imageData.url,
        alt: imageData.alt,
        source: detectImageSource(imageData.url),
      });
      continue;
    }

    if (trimmedLine.startsWith("# ")) {
      // H1 - skip as title is separate
      continue;
    } else if (trimmedLine.startsWith("## ")) {
      flushParagraph();
      blocks.push({
        _type: "block",
        _key: generateBlockKey(),
        style: "h2",
        children: [{ _type: "span", text: trimmedLine.replace("## ", "") }],
      });
    } else if (trimmedLine.startsWith("### ")) {
      flushParagraph();
      blocks.push({
        _type: "block",
        _key: generateBlockKey(),
        style: "h3",
        children: [{ _type: "span", text: trimmedLine.replace("### ", "") }],
      });
    } else if (trimmedLine.startsWith("#### ")) {
      flushParagraph();
      blocks.push({
        _type: "block",
        _key: generateBlockKey(),
        style: "h4",
        children: [{ _type: "span", text: trimmedLine.replace("#### ", "") }],
      });
    } else if (trimmedLine.startsWith("> ")) {
      flushParagraph();
      blocks.push({
        _type: "block",
        _key: generateBlockKey(),
        style: "blockquote",
        children: [{ _type: "span", text: trimmedLine.replace("> ", "") }],
      });
    } else if (trimmedLine === "") {
      flushParagraph();
    } else {
      currentParagraph += " " + trimmedLine;
    }
  }

  // Flush remaining paragraph
  flushParagraph();

  return blocks;
}

async function saveToSanity(
  article: GeneratedArticle,
  pillarSlug: string
): Promise<string> {
  console.log("   💾 Saving to Sanity...");

  // Find the content pillar
  const pillar = await sanityClient.fetch(
    `*[_type == "contentPillar" && slug.current == $slug][0]{ _id }`,
    { slug: pillarSlug }
  );

  const portableTextBody = markdownToPortableText(article.body);

  // Build featured image object if available
  let featuredImage = undefined;
  if (article.featuredImage) {
    // For external URLs, we store them as a custom object
    // Note: In production, you might want to upload to Sanity's CDN
    featuredImage = {
      _type: "image",
      alt: article.featuredImage.alt,
      source: article.featuredImage.source,
      // Store external URL - in production, upload to Sanity
      asset: {
        _type: "reference",
        _ref: `external-${Date.now()}`, // Placeholder - see note below
      },
      // Store the actual URL for now (we'll handle this specially in frontend)
      externalUrl: article.featuredImage.url,
      attribution: article.featuredImage.attribution || null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const document: any = {
    _type: "article",
    title: article.title,
    slug: { _type: "slug", current: article.slug },
    description: article.description,
    body: portableTextBody,
    articleType: article.articleType,
    tags: article.tags,
    targetKeywords: article.targetKeywords,
    publishedAt: new Date().toISOString(),
    draft: true,
    wordCount: article.wordCount,
    readingTime: Math.ceil(article.wordCount / 200),
    ...(pillar && {
      contentPillar: { _type: "reference", _ref: pillar._id },
    }),
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      model: "claude-sonnet",
      reviewStatus: "pending",
      estimatedCost: 0.18, // Updated cost with image
      internalLinksAdded: article.internalLinks.length,
      hasImage: !!article.featuredImage,
      imageSource: article.featuredImage?.source || null,
      inlineImagesCount: article.inlineImagesCount,
    },
  };

  // For images, we'll store metadata separately until proper upload is implemented
  if (article.featuredImage) {
    document.imageMetadata = {
      url: article.featuredImage.url,
      alt: article.featuredImage.alt,
      source: article.featuredImage.source,
      attribution: article.featuredImage.attribution || null,
    };
  }

  const result = await sanityClient.create(document);
  return result._id;
}

async function generateArticle(
  topic: string,
  articleType: "how-to" | "summary" | "pillar" | "comparison",
  targetKeyword: string,
  pillarSlug: string,
  index: number
): Promise<void> {
  console.log(`\n📝 Article ${index + 1}: "${topic}"`);
  console.log(`   Keyword: ${targetKeyword}`);
  console.log(`   Type: ${articleType}`);

  const startTime = Date.now();

  try {
    // Step 1: Generate outline
    const outline = await generateOutline(topic, articleType, targetKeyword);
    console.log(`   ✓ Outline: ${outline.sections.length} sections`);

    // Step 2: Generate draft
    let draft = await generateDraft(outline, articleType, targetKeyword);
    console.log(`   ✓ Draft: ${draft.split(/\s+/).length} words`);

    // Step 3: Resolve inline image placeholders
    const { content: contentWithImages, imagesAdded } = await resolveImagePlaceholders(draft, topic);
    draft = contentWithImages;
    console.log(`   ✓ Inline images: ${imagesAdded} added`);

    // Step 4: Polish and extract metadata
    const article = await polishAndExtract(draft, targetKeyword, articleType);
    article.inlineImagesCount = imagesAdded;
    console.log(`   ✓ Polished: ${article.wordCount} words`);

    // Step 5: Process internal links
    const { linkedContent, linksAdded } = await processInternalLinks(
      article.body,
      article.slug,
      pillarSlug
    );
    article.body = linkedContent;
    article.internalLinks = linksAdded;
    console.log(`   ✓ Internal links: ${linksAdded.length} added`);

    // Step 6: Generate/find featured image
    const featuredImage = await getArticleImage(
      article.title,
      topic,
      article.targetKeywords
    );
    if (featuredImage) {
      article.featuredImage = featuredImage;
      console.log(`   ✓ Featured image: ${featuredImage.source} (${featuredImage.alt.substring(0, 40)}...)`);
    } else {
      console.log(`   ⚠️ No featured image available`);
    }

    // Step 7: Save to Sanity
    const sanityId = await saveToSanity(article, pillarSlug);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n   ✅ SUCCESS!`);
    console.log(`   📄 Title: ${article.title}`);
    console.log(`   🔗 Slug: ${article.slug}`);
    console.log(`   📊 Words: ${article.wordCount}`);
    console.log(`   🔗 Internal Links: ${article.internalLinks.length}`);
    console.log(`   🖼️  Featured Image: ${article.featuredImage ? article.featuredImage.source : "none"}`);
    console.log(`   📸 Inline Images: ${article.inlineImagesCount}`);
    console.log(`   🏷️  Tags: ${article.tags.join(", ")}`);
    console.log(`   ⏱️  Time: ${duration}s`);
    console.log(`   🆔 Sanity ID: ${sanityId}`);

  } catch (error) {
    // Re-throw to let main() handle status update
    throw error;
  }
}

async function main() {
  const count = parseInt(process.argv[2] || "3", 10);

  console.log("🚀 Starting Article Generation");
  console.log(`   Requested: ${count} articles\n`);

  // Fetch queued topics from Sanity
  console.log("📋 Fetching queued topics from Sanity...");
  const queuedTopics = await getQueuedTopics(count);

  if (queuedTopics.length === 0) {
    console.log("\n⚠️  No queued topics found!");
    console.log("   Add topics to content pillar queues in Sanity Studio.");
    return;
  }

  console.log(`   Found ${queuedTopics.length} queued topics\n`);
  console.log("═".repeat(60));

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < queuedTopics.length; i++) {
    const topic = queuedTopics[i];

    // Check if article with this keyword already exists
    const exists = await checkExistingArticle(topic.targetKeyword);
    if (exists) {
      console.log(`\n⏭️  Skipping "${topic.topic}"`);
      console.log(`   Keyword "${topic.targetKeyword}" already has an article`);
      await updateTopicStatus(topic.pillarId, topic._key, "skipped");
      skippedCount++;
      console.log("─".repeat(60));
      continue;
    }

    // Mark as in-progress
    await updateTopicStatus(topic.pillarId, topic._key, "in-progress");

    try {
      await generateArticle(
        topic.topic,
        topic.articleType,
        topic.targetKeyword,
        topic.pillarSlug,
        i
      );

      // Mark as published on success
      await updateTopicStatus(topic.pillarId, topic._key, "published");
      successCount++;
    } catch (error) {
      console.error(`\n   ❌ FAILED: ${error}`);
      // Reset to queued on failure so it can be retried
      await updateTopicStatus(topic.pillarId, topic._key, "queued");
      failCount++;
    }

    console.log("\n" + "─".repeat(60));
  }

  console.log("\n" + "═".repeat(60));
  console.log("\n📊 Generation Summary:");
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ⏭️  Skipped (duplicate keyword): ${skippedCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📝 Total processed: ${queuedTopics.length}`);

  // Show remaining queued topics
  const remaining = await getQueuedTopics(100);
  console.log(`\n📋 Remaining in queue: ${remaining.length} topics`);

  console.log("\n🎉 Article generation complete!");
  console.log("   View drafts in Sanity Studio or at your blog URL");
}

main().catch(console.error);
