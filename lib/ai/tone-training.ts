/**
 * Tone Training Module
 *
 * Analyzes writing samples to extract voice characteristics
 * and builds system prompts that ensure AI output matches the author's style.
 */

import { sendMessage, type ClaudeModel } from "./claude-client";

/**
 * Tone profile extracted from writing samples
 */
export interface ToneProfile {
  name: string;
  voiceCharacteristics: {
    formality: "very-casual" | "casual" | "neutral" | "professional" | "formal";
    technicalLevel: "beginner" | "intermediate" | "advanced" | "expert";
    personality: string[];
    perspective: "first-person" | "second-person" | "third-person" | "mixed";
    sentenceVariety: "short" | "medium" | "long" | "varied";
  };
  samplePhrases: string[];
  transitionPhrases: string[];
  introPatterns: string[];
  conclusionPatterns: string[];
  avoidPhrases: string[];
  avoidPatterns: string[];
  structuralPreferences: {
    paragraphLength: "very-short" | "short" | "medium" | "long";
    useSubheadings: "frequent" | "moderate" | "sparse";
    useLists: "frequent" | "moderate" | "rare";
    useCodeExamples: boolean;
    includePersonalAnecdotes: boolean;
  };
  systemPromptPrefix: string;
}

/**
 * Analyze writing samples to extract tone profile
 */
export async function analyzeTone(
  writingSamples: string[],
  options: {
    model?: ClaudeModel;
    authorName?: string;
  } = {}
): Promise<ToneProfile> {
  const { model = "sonnet", authorName = "the author" } = options;

  const combinedSamples = writingSamples.join("\n\n---\n\n");

  const analysisPrompt = `Analyze the following writing samples and extract a detailed tone profile.

WRITING SAMPLES:
${combinedSamples}

---

Provide a JSON response with the following structure:
{
  "voiceCharacteristics": {
    "formality": "very-casual" | "casual" | "neutral" | "professional" | "formal",
    "technicalLevel": "beginner" | "intermediate" | "advanced" | "expert",
    "personality": ["trait1", "trait2", ...],
    "perspective": "first-person" | "second-person" | "third-person" | "mixed",
    "sentenceVariety": "short" | "medium" | "long" | "varied"
  },
  "samplePhrases": ["characteristic phrase 1", "characteristic phrase 2", ...],
  "transitionPhrases": ["transition 1", "transition 2", ...],
  "introPatterns": ["intro pattern description 1", ...],
  "conclusionPatterns": ["conclusion pattern description 1", ...],
  "avoidPhrases": ["cliché or uncharacteristic phrase 1", ...],
  "avoidPatterns": ["pattern to avoid 1", ...],
  "structuralPreferences": {
    "paragraphLength": "very-short" | "short" | "medium" | "long",
    "useSubheadings": "frequent" | "moderate" | "sparse",
    "useLists": "frequent" | "moderate" | "rare",
    "useCodeExamples": true | false,
    "includePersonalAnecdotes": true | false
  }
}

Focus on:
1. Specific vocabulary and phrasing patterns
2. How the author structures ideas
3. The author's personality that comes through
4. Common transition techniques
5. Introduction and conclusion styles
6. What makes this voice unique

Return ONLY valid JSON, no additional text.`;

  const systemPrompt = `You are an expert writing analyst specializing in voice and tone analysis. Extract detailed, actionable insights about writing style that can be used to train AI to match the voice exactly.`;

  const response = await sendMessage(analysisPrompt, {
    model,
    systemPrompt,
    temperature: 0.3,
    maxTokens: 4096,
  });

  // Parse the JSON response
  const analysisResult = JSON.parse(response);

  // Build the system prompt prefix for content generation
  const systemPromptPrefix = buildSystemPromptPrefix(analysisResult, authorName);

  return {
    name: `${authorName}'s Voice`,
    ...analysisResult,
    systemPromptPrefix,
  };
}

/**
 * Build a system prompt prefix from analyzed tone profile
 */
function buildSystemPromptPrefix(
  analysis: Omit<ToneProfile, "name" | "systemPromptPrefix">,
  authorName: string
): string {
  const { voiceCharacteristics, samplePhrases, avoidPhrases, structuralPreferences } =
    analysis;

  const personalityDesc = voiceCharacteristics.personality.join(", ");

  return `You are writing as ${authorName}, matching their exact voice and style.

VOICE CHARACTERISTICS:
- Formality: ${voiceCharacteristics.formality}
- Technical Level: ${voiceCharacteristics.technicalLevel}
- Perspective: ${voiceCharacteristics.perspective}
- Personality: ${personalityDesc}
- Sentence Style: ${voiceCharacteristics.sentenceVariety} variety

SAMPLE PHRASES TO EMULATE:
${samplePhrases.map((p) => `- "${p}"`).join("\n")}

PHRASES/PATTERNS TO AVOID:
${avoidPhrases.map((p) => `- "${p}"`).join("\n")}

STRUCTURAL PREFERENCES:
- Paragraph length: ${structuralPreferences.paragraphLength} (2-4 sentences)
- Subheadings: ${structuralPreferences.useSubheadings}
- Lists: ${structuralPreferences.useLists}
${structuralPreferences.useCodeExamples ? "- Include code examples where relevant" : ""}
${structuralPreferences.includePersonalAnecdotes ? "- Include personal anecdotes and experiences" : ""}

CRITICAL: Match the voice exactly. Every sentence should sound like ${authorName} wrote it.`;
}

/**
 * Generate a system prompt for content writing using a tone profile
 */
export function buildContentSystemPrompt(
  toneProfile: ToneProfile,
  articleType: "how-to" | "pillar" | "comparison",
  targetKeyword: string
): string {
  const articleTypeInstructions = {
    "how-to": `
ARTICLE TYPE: How-To Guide
Structure: Problem → Solution → Steps → FAQ
Word Target: 1500-2000 words
Focus: Actionable, step-by-step instructions`,
    pillar: `
ARTICLE TYPE: Pillar Article (Comprehensive Guide)
Structure: Overview → Sections → Deep Dives → Resources
Word Target: 3000-5000 words
Focus: Authoritative, comprehensive coverage`,
    comparison: `
ARTICLE TYPE: Comparison Article
Structure: Overview → Feature Matrix → Pros/Cons → Verdict
Word Target: 2000-2500 words
Focus: Balanced analysis, clear recommendation`,
  };

  return `${toneProfile.systemPromptPrefix}

${articleTypeInstructions[articleType]}

TARGET KEYWORD: "${targetKeyword}"
- Include in title, first 100 words, and 3-5 times throughout
- Use naturally, never force keywords

SEO REQUIREMENTS:
- Meta description: Under 155 characters, includes keyword
- Proper H2/H3 hierarchy for featured snippets
- FAQ section at the end addressing real user questions

CONTENT QUALITY:
- Write engaging, valuable content that helps readers
- Include concrete examples and actionable advice
- No fluff or filler content
- Every section should provide clear value

INTERNAL LINKING:
- Add [INTERNAL: topic] placeholders for related content
- These will be resolved to actual links at publish time`;
}

/**
 * Validate content against tone profile
 */
export async function validateTone(
  content: string,
  toneProfile: ToneProfile,
  options: { model?: ClaudeModel } = {}
): Promise<{
  score: number;
  issues: string[];
  suggestions: string[];
}> {
  const { model = "haiku" } = options;

  const validationPrompt = `Compare this content against the expected tone profile and identify any mismatches.

EXPECTED TONE PROFILE:
${JSON.stringify(toneProfile.voiceCharacteristics, null, 2)}

PHRASES TO MATCH:
${toneProfile.samplePhrases.join(", ")}

PHRASES TO AVOID:
${toneProfile.avoidPhrases.join(", ")}

CONTENT TO VALIDATE:
${content}

---

Return JSON:
{
  "score": 0-100,
  "issues": ["specific issue 1", "specific issue 2"],
  "suggestions": ["how to fix issue 1", "how to fix issue 2"]
}

Be specific about what doesn't match and why.`;

  const response = await sendMessage(validationPrompt, {
    model,
    temperature: 0.2,
    maxTokens: 1024,
  });

  return JSON.parse(response);
}

export default { analyzeTone, buildContentSystemPrompt, validateTone };
