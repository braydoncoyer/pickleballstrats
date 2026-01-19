/**
 * Tone Training Module
 *
 * Analyzes writing samples to extract voice characteristics
 * and builds system prompts that ensure AI output matches the author's style.
 */

import { sendMessage, type ClaudeModel } from "./claude-client";

/**
 * Humanization rules for making content sound authentically human
 */
export interface HumanizationRules {
  /** Include 1-2 short punchy sentences per section */
  shortPunchySentences: boolean;
  /** Use "we" when explaining concepts reader will apply */
  useWeForSharedConcepts: boolean;
  /** Acknowledge common struggles explicitly */
  acknowledgeStruggles: boolean;
  /** Use specific numbers (67% not 70%, 3.7 not 4) */
  specificNumbers: boolean;
  /** Include at least one personal insight per article */
  personalInsightRequired: boolean;
  /** Max sentences before requiring a short punch */
  sentencesBeforePunch: number;
  /** Fragments to use intentionally */
  intentionalFragments: string[];
}

/**
 * Article structure template for type-specific generation
 */
export interface ArticleStructureTemplate {
  type: "how-to" | "summary" | "comparison" | "pillar";
  wordRange: { min: number; max: number };
  sectionCount: string;
  structure: string;
  hookType: "problem-first" | "statistic" | "scenario";
  featuredSnippetTarget?: string;
}

/**
 * Introduction hook template
 */
export interface HookTemplate {
  type: "problem-first" | "statistic" | "scenario";
  template: string;
  example: string;
}

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
  humanizationRules?: HumanizationRules;
  systemPromptPrefix: string;
}

// ============================================
// Article Structure Templates
// ============================================

export const ARTICLE_STRUCTURE_TEMPLATES: Record<string, ArticleStructureTemplate> = {
  "how-to": {
    type: "how-to",
    wordRange: { min: 800, max: 1200 },
    sectionCount: "4-5",
    hookType: "problem-first",
    featuredSnippetTarget: "What Is [Technique]? section (40-60 words)",
    structure: `
# [Action Verb] + [Specific Technique] + [Context/Level]
Example: "How to Execute the Erne Shot in Competitive Doubles"

## Introduction (2-3 paragraphs)
- Problem-first hook: "You're at the kitchen line, your opponent dinks wide, and you..."
- Quick definition of the technique
- What this article covers (no "In this article we will...")

## What Is [Technique]? (40-60 words - Featured Snippet Target)
- Clear "is" definition: "[Technique] is..."
- One sentence on why it matters

## When to Use [Technique]
- 3-4 specific scenarios with court positions
- "Use this when..." format

## Step-by-Step Execution
### Step 1: [Action]
### Step 2: [Action]
### Step 3: [Action]
(Each step: 50-80 words, specific body positions/movements)

## Common Mistakes to Avoid
- 3-4 mistakes with WHY they're wrong
- "Instead of X, do Y" format

## Pro Tips
- 2-3 advanced variations or situational adjustments
- Personal insight: "In my experience..." or "What I've found..."

## FAQ (3-4 questions)
- Real questions, direct answers (40-60 words each)

## Quick Summary
- 3-5 bullet points, action-oriented
`,
  },
  summary: {
    type: "summary",
    wordRange: { min: 2000, max: 3000 },
    sectionCount: "6-8",
    hookType: "statistic",
    structure: `
# [Number] + [Category] + [Audience/Purpose]
Example: "10 Essential Pickleball Drills for 4.0 Players"

## Introduction
- Scenario hook or statistic
- What separates good from great at this level
- Overview of what's covered

## Quick Comparison Table
| Item | Focus Area | Time | Difficulty |
(Scannable overview before deep dive)

## [Item 1]: [Name]
### Why It Works
### How to Do It
### Variation for Advanced Players

(Repeat for each item)

## How to Structure Your Practice
- Weekly schedule suggestion
- Which items to combine

## Common Questions
- FAQ section

## What to Focus on First
- Prioritized recommendations based on skill gaps
`,
  },
  comparison: {
    type: "comparison",
    wordRange: { min: 1500, max: 2000 },
    sectionCount: "5-7",
    hookType: "scenario",
    featuredSnippetTarget: "What Is [Option A/B]? sections (40-60 words each)",
    structure: `
# [Option A] vs [Option B]: [Decision Context]
Example: "Stacking vs Traditional Positioning in Doubles"

## Introduction
- When this decision matters
- Quick verdict (don't bury the lead)

## Quick Comparison
| Factor | Option A | Option B |
(Side-by-side scannable table)

## What Is [Option A]?
- 40-60 word definition (featured snippet)

## What Is [Option B]?
- 40-60 word definition (featured snippet)

## [Option A]: Pros and Cons
### Advantages
### Disadvantages
### Best For

## [Option B]: Pros and Cons
### Advantages
### Disadvantages
### Best For

## Head-to-Head: Key Differences
- 3-5 specific comparison points

## Which Should You Choose?
- Decision framework based on play style/skill level
- "If you're [type], choose [option]"

## FAQ

## The Verdict
- Clear recommendation with reasoning
`,
  },
  pillar: {
    type: "pillar",
    wordRange: { min: 3000, max: 5000 },
    sectionCount: "8-10",
    hookType: "scenario",
    structure: `
# The Complete Guide to [Topic]
Example: "The Complete Guide to Pickleball Doubles Strategy"

## Introduction
- Why this topic matters for competitive play
- What level this targets
- How to use this guide

## Table of Contents
(Auto-generated, linked)

## [Major Section 1]
### [Subsection]
### [Subsection]
[INTERNAL: related how-to article]

## [Major Section 2]
(Repeat pattern)

## Putting It All Together
- Integration of concepts
- Practice progression

## Advanced Concepts
- Next-level techniques for 4.5+ players

## FAQ

## Resources & Next Steps
- Links to cluster articles
- Recommended practice schedule
`,
  },
};

// ============================================
// Introduction Hook Templates
// ============================================

export const HOOK_TEMPLATES: Record<string, HookTemplate> = {
  "problem-first": {
    type: "problem-first",
    template: `You're [specific scenario]. [Common frustration or mistake].
[Short punchy consequence].

Here's the thing: [reframe or solution preview].`,
    example: `You're at the kitchen line, your opponent dinks to your backhand,
and you pop it up. Again. It's costing you games.

Here's the thing: the backhand dink isn't about wrist strength—it's about paddle face angle.`,
  },
  statistic: {
    type: "statistic",
    template: `[Specific statistic]. [What most players do wrong].
[What this article delivers].`,
    example: `67% of points at the 4.0 level are won at the kitchen line. Yet most players spend 90% of their practice time on power shots.

This guide covers the drills that actually move your rating.`,
  },
  scenario: {
    type: "scenario",
    template: `Picture this: [vivid game scenario].
[The choice/problem]. [Why it matters].`,
    example: `Picture this: It's 9-9, you're serving, and your opponents are stacking.
Do you serve to the weaker player or disrupt their formation?

This decision could be the difference between winning and losing the game.`,
  },
};

// ============================================
// Default Humanization Rules
// ============================================

export const DEFAULT_HUMANIZATION_RULES: HumanizationRules = {
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
  ],
};

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
  articleType: "how-to" | "pillar" | "comparison" | "summary",
  targetKeyword: string
): string {
  const template = ARTICLE_STRUCTURE_TEMPLATES[articleType];
  const hookTemplate = HOOK_TEMPLATES[template?.hookType || "problem-first"];
  const humanRules = toneProfile.humanizationRules || DEFAULT_HUMANIZATION_RULES;

  const articleTypeInstructions = {
    "how-to": `
ARTICLE TYPE: How-To Guide
Structure: Problem → Solution → Steps → FAQ
Word Target: 800-1200 words
Focus: Actionable, step-by-step instructions
Featured Snippet Target: "What Is [X]?" section (40-60 words)`,
    summary: `
ARTICLE TYPE: Summary/Roundup Article
Structure: Overview → Quick Comparison Table → Deep Dives → Practice Schedule
Word Target: 2000-3000 words
Focus: Comprehensive roundup with actionable takeaways`,
    pillar: `
ARTICLE TYPE: Pillar Article (Comprehensive Guide)
Structure: Overview → Sections → Deep Dives → Resources
Word Target: 3000-5000 words
Focus: Authoritative, comprehensive coverage`,
    comparison: `
ARTICLE TYPE: Comparison Article
Structure: Overview → Quick Comparison Table → Pros/Cons → Verdict
Word Target: 1500-2000 words
Focus: Balanced analysis, clear recommendation upfront`,
  };

  return `${toneProfile.systemPromptPrefix}

${articleTypeInstructions[articleType]}

ARTICLE STRUCTURE TEMPLATE:
${template?.structure || "Standard structure"}

INTRODUCTION HOOK (Use this pattern):
${hookTemplate.template}

Example:
${hookTemplate.example}

TARGET KEYWORD: "${targetKeyword}"
- Include in title, first 100 words, and 3-5 times throughout
- Use naturally, never force keywords

SEO REQUIREMENTS:
- Meta description: Under 155 characters, includes keyword
- Proper H2/H3 hierarchy for featured snippets
- FAQ section at the end addressing real user questions
${template?.featuredSnippetTarget ? `- Featured Snippet Target: ${template.featuredSnippetTarget}` : ""}

HUMANIZATION RULES (CRITICAL - Follow these to sound human):
${humanRules.shortPunchySentences ? `- Include 1-2 short punchy sentences per section (under 8 words)` : ""}
${humanRules.useWeForSharedConcepts ? `- Use "we" when explaining concepts the reader will apply` : ""}
${humanRules.acknowledgeStruggles ? `- Acknowledge common struggles: "This is tricky at first" or "one of the harder skills"` : ""}
${humanRules.specificNumbers ? `- Use specific numbers: 67% not 70%, 3.7 not 4, 2.3 seconds not 2 seconds` : ""}
${humanRules.personalInsightRequired ? `- Include at least one "In my experience..." or "What I've found..." per article` : ""}
- After ${humanRules.sentencesBeforePunch} medium sentences, add 1 short punch
- Use intentional fragments: ${humanRules.intentionalFragments.slice(0, 3).join(", ")}

SENTENCE VARIETY RULES:
- Example flow: "Medium sentence here. Another medium one. Short punch."
- Mix short punchy ("I learned a lot.") with longer explanatory
- Use fragments intentionally for emphasis

CONTENT QUALITY:
- Write engaging, valuable content that helps readers
- Include concrete examples and actionable advice
- No fluff or filler content
- Every section should provide clear value
- Use specific details: "Take 2-3 shuffle steps" not "Move quickly"

INTERNAL LINKING:
- Add [INTERNAL: topic] placeholders for related content
- These will be resolved to actual links at publish time`;
}

/**
 * Build a type-specific outline prompt with structure template
 */
export function buildOutlinePrompt(
  toneProfile: ToneProfile,
  articleType: "how-to" | "pillar" | "comparison" | "summary",
  topic: string,
  targetKeyword: string
): string {
  const template = ARTICLE_STRUCTURE_TEMPLATES[articleType];
  const hookTemplate = HOOK_TEMPLATES[template?.hookType || "problem-first"];

  return `Create a detailed outline for a ${articleType} article.

TOPIC: ${topic}
TARGET KEYWORD: ${targetKeyword}
WORD TARGET: ${template?.wordRange.min}-${template?.wordRange.max} words

REQUIRED STRUCTURE:
${template?.structure}

HOOK TYPE TO USE: ${template?.hookType}
Hook Template:
${hookTemplate.template}

${template?.featuredSnippetTarget ? `FEATURED SNIPPET TARGET: ${template.featuredSnippetTarget}` : ""}

Return JSON only (no markdown code blocks):
{
  "title": "SEO-optimized title including keyword (NO COLONS)",
  "description": "Meta description under 155 characters",
  "hookType": "${template?.hookType}",
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

TITLE REQUIREMENTS (CRITICAL):
- NEVER use colons in the title - no "Title: Subtitle" format
- ❌ WRONG: "Pickleball Stacking: The Ultimate Guide"
- ✅ RIGHT: "The Complete Guide to Pickleball Stacking Strategy"
- Title must include the target keyword naturally
- Keep under 60 characters if possible

OTHER REQUIREMENTS:
- Description must be compelling and under 155 characters (no colons)
- Include ${template?.sectionCount} main sections (H2)
- Each section should have 2-4 key points
- FAQ should address 3-5 real user questions
- Mark one section as isFeaturedSnippetTarget: true`;
}

/**
 * Build humanization instructions for post-processing
 */
export function buildHumanizationInstructions(
  humanRules: HumanizationRules = DEFAULT_HUMANIZATION_RULES
): string {
  return `
HUMANIZATION CHECKLIST:
□ Does each section have at least 1 short punchy sentence (under 8 words)?
□ Is "we" used when explaining shared concepts?
□ Are common struggles acknowledged?
□ Are numbers specific (67% not 70%)?
□ Is there at least one personal insight ("In my experience...")?
□ Is sentence variety maintained (medium, medium, short punch)?
□ Are intentional fragments used for emphasis?

AI PHRASES TO REPLACE:
- "In this article, we will explore" → Delete entirely, just start with the hook
- "Let's delve into" → "Let's look at" or just start explaining
- "It's worth noting that" → Delete, just state the fact
- "As mentioned earlier" → Reference the specific section
- "comprehensive guide" → "guide" or "complete guide"
- "robust solution" → "solid approach" or just "solution"
- "leverage" → "use"
- "utilize" → "use"
- "facilitate" → "help"
- "cutting-edge" → "latest" or "new"
- "game-changing" → describe the specific impact
- "ever-evolving" → "changing" or be specific about what changed
- "synergy" → describe the actual benefit
- "empower" → "help" or "enable"

SPECIFIC DETAIL REQUIREMENTS:
❌ "Move quickly to the ball"
✅ "Take 2-3 shuffle steps, keeping your paddle at chest height"

❌ "Practice regularly"
✅ "Spend 15 minutes before each session on this drill"

❌ "Get in position early"
✅ "Split step 0.5 seconds before your opponent contacts the ball"
`;
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

export default {
  analyzeTone,
  buildContentSystemPrompt,
  validateTone,
  buildOutlinePrompt,
  buildHumanizationInstructions,
  ARTICLE_STRUCTURE_TEMPLATES,
  HOOK_TEMPLATES,
  DEFAULT_HUMANIZATION_RULES,
};
