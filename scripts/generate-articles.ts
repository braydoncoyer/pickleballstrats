/**
 * Generate Articles Script (Phase 2)
 *
 * Generates article CONTENT for topics that already have titles.
 * This is Phase 2 of the two-phase article generation workflow:
 *
 * Phase 1: generate-titles.ts
 *   - Generates titles for queued topics
 *   - Status: queued → titled
 *   - Uses Haiku (fast/cheap)
 *
 * Phase 2: generate-articles.ts (this script)
 *   - Generates content for titled topics
 *   - Uses the pre-generated title (no regeneration)
 *   - Status: titled → published
 *   - Uses Sonnet for high-quality content
 *
 * Usage: npx tsx scripts/generate-articles.ts [count]
 * Example: npx tsx scripts/generate-articles.ts 3
 *
 * Prerequisites: Run generate-titles.ts first to create titles for queued topics.
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import type { ToneProfile } from "../lib/ai/tone-training";
import {
  ARTICLE_STRUCTURE_TEMPLATES,
  HOOK_TEMPLATES,
  buildHumanizationInstructions,
} from "../lib/ai/tone-training";
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

// Default tone profile for pickleball content with humanization rules
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
    // Original phrases
    "Let's break this down",
    "Here's what separates 3.5 players from 4.0+",
    "The key is",
    "This is where most players go wrong",
    "Once you master this",
    "Think of it like",
    "Pro tip:",
    // New humanization phrases from voice analysis
    "at its core",
    "Whether you're [X] or [Y]",
    "we call this",
    "one of the hardest parts",
    "here's the thing",
    "I learned a lot",
    "probably one of the hardest parts",
  ],
  transitionPhrases: [
    "Now that you understand",
    "Building on that foundation",
    "Here's where it gets interesting",
    "With that in mind",
  ],
  introPatterns: [
    "Problem-first hook: Start with a relatable scenario the reader faces",
    "Hook with a surprising, specific statistic (67%, not 70%)",
    "Address the reader directly about their goals",
  ],
  conclusionPatterns: [
    "Summarize key actionable takeaways in bullets",
    "Encourage practice with specific time commitment",
    "End with personal insight: 'In my experience...'",
  ],
  avoidPhrases: [
    // Original avoid phrases
    "In conclusion",
    "As we all know",
    "It goes without saying",
    "At the end of the day",
    "Game changer",
    "Take your game to the next level",
    // New AI-phrase blacklist
    "In this article, we will explore",
    "Let's delve into",
    "It's worth noting that",
    "As mentioned earlier",
    "comprehensive guide",
    "robust solution",
    "leverage",
    "utilize",
    "facilitate",
    "cutting-edge",
    "game-changing",
    "ever-evolving",
    "synergy",
    "empower",
    "dive deep",
    "unpack",
    "landscape",
    "paradigm",
    "holistic",
    "streamline",
    "optimize",
    "innovative",
    "seamless",
    "groundbreaking",
  ],
  avoidPatterns: [
    "Starting paragraphs with 'So,'",
    "Excessive exclamation points",
    "Overly complex sentences",
    "Vague promises without specifics",
    "COLONS IN TITLES - Never use 'Title: Subtitle' format",
    "Round numbers (use 67% not 70%, 3.7 not 4)",
    "Generic advice without specific actions",
    "Long paragraphs (keep to 2-3 sentences)",
  ],
  structuralPreferences: {
    paragraphLength: "short",
    useSubheadings: "frequent",
    useLists: "moderate",
    useCodeExamples: false,
    includePersonalAnecdotes: true,
  },
  humanizationRules: {
    shortPunchySentences: true,
    useWeForSharedConcepts: true,
    acknowledgeStruggles: true,
    specificNumbers: true,
    personalInsightRequired: true,
    sentencesBeforePunch: 2,
    intentionalFragments: [
      "Worth the practice.",
      "Every time.",
      "No exceptions.",
      "Simple as that.",
      "That's it.",
      "Game over.",
      "Trust me on this.",
    ],
  },
  systemPromptPrefix: `You are an expert pickleball coach and content writer creating educational content for competitive players (3.5-5.0 skill level).

VOICE CHARACTERISTICS:
- Formality: casual but knowledgeable
- Technical Level: intermediate (assume reader knows basics)
- Perspective: second-person (address reader as "you")
- Personality: encouraging, practical, passionate about pickleball
- Sentence rhythm: Mix short punchy ("I learned a lot.") with longer explanatory

SAMPLE PHRASES TO USE:
- "Let's break this down"
- "Here's what separates 3.5 players from 4.0+"
- "This is where most players go wrong"
- "at its core"
- "here's the thing"
- "we call this"
- "one of the hardest parts"
- "Whether you're a 3.5 looking to level up or a 4.0 refining your game"

PHRASES TO NEVER USE (AI tells):
- "In this article, we will explore" - just start with the hook
- "Let's delve into" - use "Let's look at" or just explain
- "It's worth noting that" - just state the fact
- "comprehensive guide" - use "guide" or "complete guide"
- "robust solution" - use "solid approach"
- "leverage" - use "use"
- "utilize" - use "use"
- "cutting-edge" - use "latest" or "new"
- "game-changing" - describe the specific impact
- "ever-evolving" - say what changed specifically
- "synergy" - describe the actual benefit
- "empower" - use "help" or "enable"

TITLE RULES (⛔ CRITICAL - ZERO TOLERANCE ⛔):
- ABSOLUTELY NO COLONS (:) IN TITLES - THIS WILL CAUSE THE ARTICLE TO BE REJECTED
- Never use "Title: Subtitle" format for any reason
- ❌ WRONG: "10 Essential Drills: Elevate Your Game" (HAS COLON - REJECTED)
- ❌ WRONG: "Power vs Control: How to Choose" (HAS COLON - REJECTED)
- ✅ RIGHT: "10 Essential Pickleball Drills for 4.0 Players"
- ✅ RIGHT: "How to Choose Between Power and Control Paddles"

HUMANIZATION RULES (CRITICAL - THIS MAKES CONTENT SOUND HUMAN):
1. Include 1-2 short punchy sentences per section (under 8 words)
   - Example flow: "Medium sentence here. Another medium one. Short punch."
2. Use "we" when explaining concepts the reader will apply
3. Acknowledge common struggles: "This is tricky at first" or "one of the harder skills"
4. Use SPECIFIC numbers: 67% not 70%, 3.7 not 4, 2.3 seconds not 2 seconds
5. Include at least one personal insight per article: "In my experience..." or "What I've found..."
6. Use intentional fragments for emphasis: "Worth the practice." "Every time."

STRUCTURAL PREFERENCES:
- Short paragraphs (2-3 sentences max, then line break)
- Frequent subheadings for scannability
- Use bullet lists for steps and key points
- Include "Common Mistakes" sections
- End with FAQ section

SPECIFIC DETAIL REQUIREMENTS:
- ❌ "Move quickly to the ball"
- ✅ "Take 2-3 shuffle steps, keeping your paddle at chest height"
- ❌ "Practice regularly"
- ✅ "Spend 15 minutes before each session on this drill"
- ❌ "Get in position early"
- ✅ "Split step 0.5 seconds before your opponent contacts the ball"

CRITICAL: Write content that competitive pickleball players will find genuinely valuable. Every section should include specific, actionable advice. Sound like a real person, not an AI.`,
};

// ============================================
// Topic Queue Management
// ============================================

interface QueuedTopic {
  _key: string;
  topic: string;
  articleType: "how-to" | "summary" | "comparison";
  targetKeyword: string;
  generatedTitle: string; // Pre-generated title from generate-titles.ts
  priority: number;
  status: "queued" | "titled" | "in-progress" | "published" | "skipped";
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
 * Fetch titled topics from all content pillars, ordered by priority
 * Only returns topics that have been through the title generation phase (status === "titled")
 */
async function getTitledTopics(limit: number): Promise<QueuedTopic[]> {
  const query = `*[_type == "contentPillar" && active == true] {
    _id,
    "slug": slug.current,
    topicQueue[] {
      _key,
      topic,
      articleType,
      targetKeyword,
      generatedTitle,
      priority,
      status
    }
  }`;

  const pillars = await sanityClient.fetch(query);

  // Flatten and filter titled topics (ready for content generation)
  const allTopics: QueuedTopic[] = [];

  for (const pillar of pillars) {
    if (!pillar.topicQueue) continue;

    for (const topic of pillar.topicQueue) {
      // Only process topics that have been titled (Phase 1 complete)
      if (topic.status === "titled" && topic.generatedTitle) {
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
  newStatus: "queued" | "titled" | "in-progress" | "published" | "skipped"
): Promise<void> {
  await sanityClient
    .patch(pillarId)
    .set({
      [`topicQueue[_key=="${topicKey}"].status`]: newStatus,
    })
    .commit();
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
  targetKeyword: string,
  generatedTitle: string // Pre-generated title from Phase 1
): Promise<{ title: string; description: string; hookType: string; sections: Array<{ heading: string; level: number; keyPoints: string[]; isFeaturedSnippetTarget?: boolean }>; faqQuestions: string[] }> {
  console.log("   📋 Generating outline...");

  const wordTarget = WORD_TARGETS[articleType] || WORD_TARGETS["how-to"];
  const structureTemplate = ARTICLE_STRUCTURE_TEMPLATES[articleType];
  const hookTemplate = HOOK_TEMPLATES[structureTemplate?.hookType || "problem-first"];

  // Build article-type-specific instructions using templates
  let typeInstructions = "";
  if (structureTemplate) {
    typeInstructions = `
ARTICLE STRUCTURE TO FOLLOW:
${structureTemplate.structure}

HOOK TYPE: ${structureTemplate.hookType}
Hook Template:
${hookTemplate.template}

Example Hook:
${hookTemplate.example}

${structureTemplate.featuredSnippetTarget ? `FEATURED SNIPPET TARGET: ${structureTemplate.featuredSnippetTarget}` : ""}`;
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

TITLE (ALREADY FINALIZED - USE EXACTLY AS PROVIDED):
"${generatedTitle}"

TOPIC: ${topic}
TARGET KEYWORD: ${targetKeyword}
WORD TARGET: ${wordTarget.min}-${wordTarget.max} words
${typeInstructions}

Return JSON only (no markdown code blocks):
{
  "description": "Meta description under 155 characters",
  "hookType": "${structureTemplate?.hookType || 'problem-first'}",
  "sections": [
    {
      "heading": "Section heading",
      "level": 2,
      "keyPoints": ["point 1", "point 2", "point 3"],
      "isFeaturedSnippetTarget": false
    }
  ],
  "faqQuestions": ["Question 1?", "Question 2?", "Question 3?"]
}

REQUIREMENTS:
- Description must be compelling and under 155 characters (no colons)
- Include ${wordTarget.sections} main sections (H2)
- Each section should have 2-4 key points
- FAQ should address 3-5 real user questions
- Mark one section as isFeaturedSnippetTarget: true (the definition section)`,
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

  const outline = JSON.parse(jsonStr);

  // Use the pre-generated title (don't let AI override it)
  return {
    title: generatedTitle,
    description: outline.description,
    hookType: outline.hookType,
    sections: outline.sections,
    faqQuestions: outline.faqQuestions,
  };
}

async function generateDraft(
  outline: { title: string; description: string; hookType?: string; sections: Array<{ heading: string; level: number; keyPoints: string[]; isFeaturedSnippetTarget?: boolean }>; faqQuestions: string[] },
  articleType: string,
  targetKeyword: string
): Promise<string> {
  console.log("   ✍️  Generating full article...");

  const wordTarget = WORD_TARGETS[articleType] || WORD_TARGETS["how-to"];
  const structureTemplate = ARTICLE_STRUCTURE_TEMPLATES[articleType];
  const hookTemplate = HOOK_TEMPLATES[outline.hookType || structureTemplate?.hookType || "problem-first"];
  const humanizationInstructions = buildHumanizationInstructions(defaultToneProfile.humanizationRules);

  // Build article-type-specific requirements
  let typeRequirements = "";
  if (articleType === "summary") {
    typeRequirements = `
SUMMARY ARTICLE SPECIFIC REQUIREMENTS:
- This is a comprehensive roundup covering multiple related techniques
- Include a Quick Comparison Table early in the article
- Add [INTERNAL: specific technique] placeholders to link to individual how-to articles
- Provide "when to use" guidance for each technique covered
- End with "How to Structure Your Practice" and "What to Focus on First" sections`;
  } else if (articleType === "how-to") {
    typeRequirements = `
HOW-TO ARTICLE SPECIFIC REQUIREMENTS:
- Start with a problem-first hook (no generic intros)
- Include a "What Is [Technique]?" section (40-60 words) for featured snippets
- Include "When to Use [Technique]" with 3-4 specific scenarios
- Step-by-step execution with specific body positions/movements
- End with Pro Tips section including "In my experience..." personal insight`;
  } else if (articleType === "comparison") {
    typeRequirements = `
COMPARISON ARTICLE SPECIFIC REQUIREMENTS:
- Don't bury the lead - give quick verdict in intro
- Include Quick Comparison table early
- "What Is [Option A/B]?" sections (40-60 words each) for featured snippets
- Separate Pros/Cons sections for each option
- "Which Should You Choose?" with decision framework
- Clear verdict at the end with reasoning`;
  } else if (articleType === "pillar") {
    typeRequirements = `
PILLAR ARTICLE SPECIFIC REQUIREMENTS:
- Comprehensive guide covering the topic thoroughly
- Include Table of Contents (will be auto-generated)
- Multiple [INTERNAL: topic] placeholders to cluster articles
- "Putting It All Together" section near the end
- "Advanced Concepts" section for 4.5+ players
- "Resources & Next Steps" with practice schedule`;
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

INTRODUCTION HOOK (USE THIS PATTERN):
Type: ${hookTemplate.type}
Template: ${hookTemplate.template}
Example: ${hookTemplate.example}

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

${humanizationInstructions}

SENTENCE VARIETY (CRITICAL FOR HUMAN VOICE):
- After 2 medium sentences, add 1 short punch (under 8 words)
- Example: "Medium sentence here. Another medium one. Short punch."
- Use fragments intentionally: "Worth the practice." "Every time."
- Include at least one "In my experience..." or "What I've found..."

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

/**
 * Sanitize title to remove colons and fix common AI patterns
 */
function sanitizeTitle(rawTitle: string): string {
  let title = rawTitle;

  // If title contains a colon, try to fix it
  if (title.includes(':')) {
    console.log(`   ⚠️  Title contains colon, fixing: "${title}"`);

    // Common patterns to fix:
    // "Topic: Subtitle" -> "Topic - Subtitle" or just use the better part
    const colonIndex = title.indexOf(':');
    const beforeColon = title.substring(0, colonIndex).trim();
    const afterColon = title.substring(colonIndex + 1).trim();

    // If after colon is a subtitle like "A Complete Guide", "How to...", etc.
    // just use the before part and rephrase
    if (afterColon.toLowerCase().includes('guide') ||
        afterColon.toLowerCase().includes('how to') ||
        afterColon.toLowerCase().includes('tips') ||
        afterColon.toLowerCase().includes('strategies') ||
        afterColon.toLowerCase().includes('ultimate') ||
        afterColon.toLowerCase().includes('complete') ||
        afterColon.toLowerCase().includes('essential')) {
      // Combine them naturally
      title = `${beforeColon} - ${afterColon}`;
    } else {
      // Just replace colon with dash
      title = title.replace(/:/g, ' -');
    }

    // Clean up any double dashes or spaces
    title = title.replace(/\s+-\s+-/g, ' -').replace(/\s+/g, ' ').trim();

    console.log(`   ✓ Fixed title: "${title}"`);
  }

  return title;
}

async function polishAndExtract(
  draft: string,
  targetKeyword: string,
  articleType: "how-to" | "summary" | "pillar" | "comparison",
  generatedTitle: string // Pre-generated title from Phase 1
): Promise<GeneratedArticle> {
  console.log("   ✨ Extracting metadata...");

  // Use the pre-generated title (already sanitized in generate-titles.ts)
  const title = generatedTitle;

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
  generatedTitle: string, // Pre-generated title from Phase 1
  pillarSlug: string,
  index: number
): Promise<void> {
  console.log(`\n📝 Article ${index + 1}: "${generatedTitle}"`);
  console.log(`   Topic: ${topic}`);
  console.log(`   Keyword: ${targetKeyword}`);
  console.log(`   Type: ${articleType}`);

  const startTime = Date.now();

  try {
    // Step 1: Generate outline (using pre-generated title)
    const outline = await generateOutline(topic, articleType, targetKeyword, generatedTitle);
    console.log(`   ✓ Outline: ${outline.sections.length} sections`);

    // Step 2: Generate draft
    let draft = await generateDraft(outline, articleType, targetKeyword);
    console.log(`   ✓ Draft: ${draft.split(/\s+/).length} words`);

    // Step 3: Resolve inline image placeholders
    const { content: contentWithImages, imagesAdded } = await resolveImagePlaceholders(draft, topic);
    draft = contentWithImages;
    console.log(`   ✓ Inline images: ${imagesAdded} added`);

    // Step 4: Polish and extract metadata (using pre-generated title)
    const article = await polishAndExtract(draft, targetKeyword, articleType, generatedTitle);
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

  console.log("🚀 Starting Article Generation (Phase 2)");
  console.log("═".repeat(60));
  console.log(`   Requested: ${count} articles`);
  console.log(`   Processing topics with status: "titled"\n`);

  // Fetch titled topics from Sanity (Phase 1 complete)
  console.log("📋 Fetching titled topics from Sanity...");
  const titledTopics = await getTitledTopics(count);

  if (titledTopics.length === 0) {
    console.log("\n⚠️  No titled topics found!");
    console.log("   Run Phase 1 first: npx tsx scripts/generate-titles.ts");
    console.log("   Or add topics to content pillar queues in Sanity Studio.");
    return;
  }

  console.log(`   Found ${titledTopics.length} titled topics ready for content\n`);
  console.log("─".repeat(60));

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < titledTopics.length; i++) {
    const topic = titledTopics[i];

    // Mark as in-progress
    await updateTopicStatus(topic.pillarId, topic._key, "in-progress");

    try {
      await generateArticle(
        topic.topic,
        topic.articleType,
        topic.targetKeyword,
        topic.generatedTitle, // Use the pre-generated title from Phase 1
        topic.pillarSlug,
        i
      );

      // Mark as published on success
      await updateTopicStatus(topic.pillarId, topic._key, "published");
      successCount++;
    } catch (error) {
      console.error(`\n   ❌ FAILED: ${error}`);
      // Reset to titled on failure so it can be retried
      await updateTopicStatus(topic.pillarId, topic._key, "titled");
      failCount++;
    }

    console.log("\n" + "─".repeat(60));
  }

  console.log("\n" + "═".repeat(60));
  console.log("\n📊 Generation Summary:");
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📝 Total processed: ${titledTopics.length}`);

  // Show remaining titled topics
  const remaining = await getTitledTopics(100);
  console.log(`\n📋 Remaining titled topics: ${remaining.length}`);

  console.log("\n🎉 Article generation complete!");
  console.log("   View drafts in Sanity Studio or at your blog URL");
}

main().catch(console.error);
