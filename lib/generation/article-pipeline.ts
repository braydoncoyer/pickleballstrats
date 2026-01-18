/**
 * Article Generation Pipeline
 *
 * Orchestrates the multi-stage content generation process:
 * 1. Topic Planning (Haiku) - Select topics from content pillars
 * 2. Safety Check (Haiku) - Validate topic safety
 * 3. Research & Outline (Sonnet) - Create detailed structure
 * 4. Section Generation (Sonnet) - Write article sections
 * 5. SEO Polish (Haiku) - Optimize for search
 * 6. Quality Review (Sonnet) - PASS/FAIL review loop
 * 7. Publish - After PASS from review agent
 */

import {
  sendMessage,
  estimateTokens,
  estimateCost,
  type ClaudeModel,
} from "../ai/claude-client";
import { buildContentSystemPrompt, type ToneProfile } from "../ai/tone-training";
import { fullSafetyCheck, checkArticleContent } from "../ai/content-safety";

// ============================================
// Types
// ============================================

export interface TopicInput {
  topic: string;
  articleType: "how-to" | "pillar" | "comparison";
  targetKeyword: string;
  contentPillarId?: string;
}

export interface GenerationResult {
  success: boolean;
  article?: GeneratedArticle;
  error?: string;
  metrics: GenerationMetrics;
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  description: string;
  body: string; // Markdown content
  articleType: "how-to" | "pillar" | "comparison";
  tags: string[];
  targetKeywords: string[];
  wordCount: number;
  readingTime: number;
  outline: ArticleOutline;
}

export interface ArticleOutline {
  title: string;
  description: string;
  sections: Array<{
    heading: string;
    level: 2 | 3;
    keyPoints: string[];
  }>;
  faqQuestions: string[];
}

export interface GenerationMetrics {
  totalTokensInput: number;
  totalTokensOutput: number;
  estimatedCost: number;
  stages: Array<{
    name: string;
    model: ClaudeModel;
    tokensInput: number;
    tokensOutput: number;
    durationMs: number;
  }>;
  reviewScore?: number;
  rewriteCount: number;
}

export interface ReviewResult {
  status: "PASS" | "FAIL";
  score: number;
  issues: string[];
  rewriteSections: number[];
  praise: string;
}

// ============================================
// Pipeline Configuration
// ============================================

const WORD_TARGETS = {
  "how-to": { min: 1500, max: 2000 },
  pillar: { min: 3000, max: 5000 },
  comparison: { min: 2000, max: 2500 },
};

const MAX_REWRITE_ATTEMPTS = 2;
const PASSING_SCORE = 80;

// ============================================
// Main Pipeline
// ============================================

/**
 * Generate a complete article from topic to polished content
 */
export async function generateArticle(
  input: TopicInput,
  toneProfile: ToneProfile,
  options: {
    onStageComplete?: (stage: string, result: unknown) => void;
  } = {}
): Promise<GenerationResult> {
  const { onStageComplete } = options;
  const metrics: GenerationMetrics = {
    totalTokensInput: 0,
    totalTokensOutput: 0,
    estimatedCost: 0,
    stages: [],
    rewriteCount: 0,
  };

  try {
    // Stage 1: Safety Check
    const safetyResult = await runStage("safety-check", "haiku", async () => {
      return fullSafetyCheck(input.topic);
    }, metrics);

    if (!safetyResult.safe) {
      return {
        success: false,
        error: `Topic blocked: ${safetyResult.reason} (${safetyResult.category})`,
        metrics,
      };
    }
    onStageComplete?.("safety-check", safetyResult);

    // Stage 2: Generate Outline
    const outline = await runStage("outline", "sonnet", async () => {
      return generateOutline(input, toneProfile);
    }, metrics);
    onStageComplete?.("outline", outline);

    // Stage 3: Generate Draft
    let draft = await runStage("draft", "sonnet", async () => {
      return generateDraft(input, toneProfile, outline);
    }, metrics);
    onStageComplete?.("draft", { wordCount: countWords(draft) });

    // Stage 4: Review Loop
    let reviewResult: ReviewResult;
    let rewriteCount = 0;

    do {
      reviewResult = await runStage("review", "sonnet", async () => {
        return reviewArticle(draft, toneProfile, input);
      }, metrics);
      onStageComplete?.("review", reviewResult);

      if (reviewResult.status === "FAIL" && rewriteCount < MAX_REWRITE_ATTEMPTS) {
        rewriteCount++;
        metrics.rewriteCount = rewriteCount;

        draft = await runStage(`rewrite-${rewriteCount}`, "sonnet", async () => {
          return rewriteSections(draft, reviewResult, toneProfile, input);
        }, metrics);
        onStageComplete?.(`rewrite-${rewriteCount}`, { wordCount: countWords(draft) });
      }
    } while (reviewResult.status === "FAIL" && rewriteCount < MAX_REWRITE_ATTEMPTS);

    // Check if still failing after max rewrites
    if (reviewResult.status === "FAIL") {
      return {
        success: false,
        error: `Article failed review after ${MAX_REWRITE_ATTEMPTS} rewrites. Issues: ${reviewResult.issues.join(", ")}`,
        metrics,
      };
    }

    // Stage 5: SEO Polish
    const polished = await runStage("seo-polish", "haiku", async () => {
      return polishForSEO(draft, input);
    }, metrics);
    onStageComplete?.("seo-polish", { complete: true });

    // Stage 6: Content Safety Check
    const contentSafety = await runStage("content-safety", "haiku", async () => {
      return checkArticleContent(polished.body);
    }, metrics);

    if (!contentSafety.safe) {
      return {
        success: false,
        error: `Content safety check failed: ${contentSafety.issues.map(i => i.reason).join(", ")}`,
        metrics,
      };
    }

    metrics.reviewScore = reviewResult.score;

    return {
      success: true,
      article: polished,
      metrics,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      metrics,
    };
  }
}

// ============================================
// Pipeline Stages
// ============================================

/**
 * Generate article outline
 */
async function generateOutline(
  input: TopicInput,
  toneProfile: ToneProfile
): Promise<ArticleOutline> {
  const { topic, articleType, targetKeyword } = input;
  const wordTarget = WORD_TARGETS[articleType];

  const outlinePrompt = `Create a detailed outline for a ${articleType} article.

TOPIC: ${topic}
TARGET KEYWORD: ${targetKeyword}
WORD TARGET: ${wordTarget.min}-${wordTarget.max} words

ARTICLE TYPE REQUIREMENTS:
${articleType === "how-to" ? "Structure: Problem → Solution → Steps → FAQ" : ""}
${articleType === "pillar" ? "Structure: Overview → Sections → Deep Dives → Resources" : ""}
${articleType === "comparison" ? "Structure: Overview → Feature Matrix → Pros/Cons → Verdict" : ""}

Return JSON:
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
- Include 5-8 main sections (H2) with subsections (H3) as needed
- Each section should have 3-5 key points to cover
- FAQ should address real user questions`;

  const response = await sendMessage(outlinePrompt, {
    model: "sonnet",
    systemPrompt: toneProfile.systemPromptPrefix,
    temperature: 0.5,
    maxTokens: 2048,
  });

  return JSON.parse(response);
}

/**
 * Generate full article draft
 */
async function generateDraft(
  input: TopicInput,
  toneProfile: ToneProfile,
  outline: ArticleOutline
): Promise<string> {
  const wordTarget = WORD_TARGETS[input.articleType];
  const systemPrompt = buildContentSystemPrompt(
    toneProfile,
    input.articleType,
    input.targetKeyword
  );

  const draftPrompt = `Write the full article based on this outline.

OUTLINE:
${JSON.stringify(outline, null, 2)}

WORD TARGET: ${wordTarget.min}-${wordTarget.max} words

REQUIREMENTS:
1. Follow the outline structure exactly
2. Write engaging, valuable content
3. Use the target keyword "${input.targetKeyword}" naturally 3-5 times
4. Include [INTERNAL: related topic] placeholders for internal links
5. Add an FAQ section at the end
6. Match the tone profile exactly

OUTPUT FORMAT:
Return clean Markdown with proper heading hierarchy.
Start with the title as H1, then content with H2/H3 structure.

Write the complete article now:`;

  return sendMessage(draftPrompt, {
    model: "sonnet",
    systemPrompt,
    temperature: 0.7,
    maxTokens: 8192,
  });
}

/**
 * Review article for quality
 */
async function reviewArticle(
  content: string,
  toneProfile: ToneProfile,
  input: TopicInput
): Promise<ReviewResult> {
  const reviewPrompt = `You are a senior editor reviewing this article for publication.

ARTICLE:
${content}

TONE PROFILE:
${JSON.stringify(toneProfile.voiceCharacteristics, null, 2)}

TARGET KEYWORD: ${input.targetKeyword}

REVIEW CHECKLIST:
1. Tone consistency - Does it match the profile?
2. Factual accuracy - Any suspicious claims?
3. SEO optimization - Keyword usage, meta quality?
4. Content structure - Proper H2/H3 hierarchy?
5. Readability - Sentence variety, paragraph length?
6. Value - Does every section provide clear value?

Return JSON:
{
  "status": "PASS" | "FAIL",
  "score": 0-100,
  "issues": ["specific issue 1", "specific issue 2"],
  "rewriteSections": [1, 3],
  "praise": "What was done well"
}

PASS if score >= 80, FAIL otherwise.
Be specific about issues and which sections need rewriting.`;

  const response = await sendMessage(reviewPrompt, {
    model: "sonnet",
    temperature: 0.2,
    maxTokens: 1024,
  });

  const result = JSON.parse(response);
  result.status = result.score >= PASSING_SCORE ? "PASS" : "FAIL";
  return result;
}

/**
 * Rewrite specific sections based on review feedback
 */
async function rewriteSections(
  content: string,
  review: ReviewResult,
  toneProfile: ToneProfile,
  input: TopicInput
): Promise<string> {
  const rewritePrompt = `Rewrite this article to fix the identified issues.

CURRENT ARTICLE:
${content}

ISSUES TO FIX:
${review.issues.join("\n")}

SECTIONS TO REWRITE: ${review.rewriteSections.join(", ")}

TONE PROFILE TO MATCH:
${JSON.stringify(toneProfile.voiceCharacteristics, null, 2)}

Requirements:
- Fix all listed issues
- Maintain the overall structure
- Keep what was praised: ${review.praise}
- Ensure tone consistency throughout

Return the complete rewritten article in Markdown.`;

  return sendMessage(rewritePrompt, {
    model: "sonnet",
    systemPrompt: toneProfile.systemPromptPrefix,
    temperature: 0.6,
    maxTokens: 8192,
  });
}

/**
 * Polish article for SEO
 */
async function polishForSEO(
  content: string,
  input: TopicInput
): Promise<GeneratedArticle> {
  const polishPrompt = `Polish this article for SEO and extract metadata.

ARTICLE:
${content}

TARGET KEYWORD: ${input.targetKeyword}

Tasks:
1. Ensure keyword appears in first 100 words
2. Add keyword to headings where natural
3. Improve any weak transitions
4. Verify meta description is under 155 chars

Return JSON:
{
  "title": "Final optimized title",
  "slug": "url-friendly-slug",
  "description": "Meta description under 155 chars",
  "body": "Full article content in Markdown",
  "tags": ["tag1", "tag2", "tag3"],
  "targetKeywords": ["primary", "secondary", "tertiary"]
}`;

  const response = await sendMessage(polishPrompt, {
    model: "haiku",
    temperature: 0.3,
    maxTokens: 8192,
  });

  const result = JSON.parse(response);

  return {
    ...result,
    articleType: input.articleType,
    wordCount: countWords(result.body),
    readingTime: Math.ceil(countWords(result.body) / 200),
    outline: {} as ArticleOutline, // Not needed after generation
  };
}

// ============================================
// Helpers
// ============================================

async function runStage<T>(
  name: string,
  model: ClaudeModel,
  fn: () => Promise<T>,
  metrics: GenerationMetrics
): Promise<T> {
  const start = Date.now();
  const result = await fn();
  const durationMs = Date.now() - start;

  // Rough token estimation (would be more accurate with actual usage tracking)
  const tokensInput = 1000; // Placeholder
  const tokensOutput = 500; // Placeholder

  metrics.stages.push({
    name,
    model,
    tokensInput,
    tokensOutput,
    durationMs,
  });

  metrics.totalTokensInput += tokensInput;
  metrics.totalTokensOutput += tokensOutput;
  metrics.estimatedCost += estimateCost(tokensInput, tokensOutput, model);

  return result;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export default generateArticle;
