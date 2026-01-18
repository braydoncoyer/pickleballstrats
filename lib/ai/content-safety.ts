/**
 * Content Safety Module
 *
 * Validates topics and content to ensure they don't touch
 * blocked categories that could risk ad account suspension.
 *
 * Blocked Topics:
 * - Medical/health advice and treatments
 * - War, military conflict, violent crime
 * - Financial investment advice
 * - Legal advice
 * - Political controversy
 */

import { sendMessage, type ClaudeModel } from "./claude-client";

/**
 * Blocked topic categories
 */
export const BLOCKED_CATEGORIES = [
  "medical_advice",
  "health_treatments",
  "war_conflict",
  "violent_crime",
  "financial_advice",
  "investment_advice",
  "legal_advice",
  "political_controversy",
  "adult_content",
  "gambling",
  "weapons",
  "drugs",
] as const;

export type BlockedCategory = (typeof BLOCKED_CATEGORIES)[number];

/**
 * Result of a safety check
 */
export interface SafetyCheckResult {
  safe: boolean;
  category?: BlockedCategory;
  reason?: string;
  confidence: number;
}

/**
 * Keyword patterns that indicate blocked content
 * Used for fast pre-screening before AI check
 */
const BLOCKED_KEYWORDS: Record<BlockedCategory, string[]> = {
  medical_advice: [
    "cure",
    "treatment",
    "diagnose",
    "prescription",
    "medication",
    "symptoms of",
    "disease",
    "disorder",
    "medical advice",
    "health condition",
  ],
  health_treatments: [
    "therapy",
    "healing",
    "remedy",
    "supplement",
    "detox",
    "weight loss",
    "diet pill",
    "alternative medicine",
  ],
  war_conflict: [
    "war",
    "military operation",
    "invasion",
    "bombing",
    "casualties",
    "combat",
    "armed conflict",
    "battlefield",
  ],
  violent_crime: [
    "murder",
    "assault",
    "shooting",
    "stabbing",
    "violent attack",
    "homicide",
    "manslaughter",
  ],
  financial_advice: [
    "investment advice",
    "stock pick",
    "buy this stock",
    "guaranteed returns",
    "get rich",
    "financial advice",
    "trading strategy",
  ],
  investment_advice: [
    "crypto investment",
    "forex trading",
    "options trading",
    "penny stocks",
    "insider tip",
    "market prediction",
  ],
  legal_advice: [
    "legal advice",
    "sue for",
    "lawsuit",
    "legal rights",
    "attorney recommendation",
    "legal strategy",
  ],
  political_controversy: [
    "election fraud",
    "political scandal",
    "partisan",
    "left-wing",
    "right-wing",
    "political debate",
  ],
  adult_content: [
    "explicit",
    "adult content",
    "nsfw",
    "sexual",
    "pornography",
  ],
  gambling: [
    "betting",
    "casino",
    "gambling",
    "odds",
    "sportsbook",
    "poker strategy",
  ],
  weapons: [
    "firearm",
    "ammunition",
    "explosive",
    "weapon modification",
    "gun build",
  ],
  drugs: [
    "recreational drug",
    "illegal substance",
    "drug use",
    "controlled substance",
  ],
};

/**
 * Fast keyword-based pre-screening
 */
export function quickSafetyCheck(text: string): SafetyCheckResult {
  const lowerText = text.toLowerCase();

  for (const category of BLOCKED_CATEGORIES) {
    const keywords = BLOCKED_KEYWORDS[category];
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return {
          safe: false,
          category,
          reason: `Contains blocked keyword: "${keyword}"`,
          confidence: 0.8,
        };
      }
    }
  }

  return {
    safe: true,
    confidence: 0.6, // Lower confidence since it's just keyword matching
  };
}

/**
 * Full AI-powered safety check
 */
export async function fullSafetyCheck(
  topic: string,
  options: { model?: ClaudeModel } = {}
): Promise<SafetyCheckResult> {
  const { model = "haiku" } = options;

  // First do a quick keyword check
  const quickResult = quickSafetyCheck(topic);
  if (!quickResult.safe) {
    return quickResult;
  }

  // Then do AI-powered semantic analysis
  const safetyPrompt = `Analyze if this topic is safe for an advertising-supported blog.

TOPIC: "${topic}"

BLOCKED CATEGORIES (content that would risk ad account suspension):
1. Medical/health advice and treatments
2. War, military conflict, violent crime
3. Financial investment advice
4. Legal advice
5. Political controversy
6. Adult content
7. Gambling
8. Weapons
9. Drugs/controlled substances

Return JSON:
{
  "safe": true | false,
  "category": "category_name" (only if unsafe),
  "reason": "explanation" (only if unsafe),
  "confidence": 0.0-1.0
}

Consider:
- Is the topic providing advice in blocked areas?
- Could it be interpreted as promoting harmful activities?
- Would major ad networks flag this content?

Be conservative - if there's doubt, mark as unsafe.`;

  const response = await sendMessage(safetyPrompt, {
    model,
    temperature: 0.1,
    maxTokens: 256,
  });

  try {
    return JSON.parse(response);
  } catch {
    // If parsing fails, assume unsafe
    return {
      safe: false,
      reason: "Failed to parse safety check response",
      confidence: 0,
    };
  }
}

/**
 * Check full article content for safety issues
 */
export async function checkArticleContent(
  content: string,
  options: { model?: ClaudeModel } = {}
): Promise<{
  safe: boolean;
  issues: Array<{
    section: string;
    category: BlockedCategory;
    reason: string;
  }>;
}> {
  const { model = "haiku" } = options;

  // First do quick keyword screening
  const quickResult = quickSafetyCheck(content);
  if (!quickResult.safe) {
    return {
      safe: false,
      issues: [
        {
          section: "content",
          category: quickResult.category!,
          reason: quickResult.reason!,
        },
      ],
    };
  }

  const contentCheckPrompt = `Review this article content for any advertising policy violations.

CONTENT:
${content.slice(0, 8000)} ${content.length > 8000 ? "...[truncated]" : ""}

BLOCKED CATEGORIES:
1. Medical/health advice
2. War/violence
3. Financial/investment advice
4. Legal advice
5. Political controversy
6. Adult content
7. Gambling
8. Weapons
9. Drugs

Return JSON:
{
  "safe": true | false,
  "issues": [
    {
      "section": "paragraph or heading where issue found",
      "category": "category_name",
      "reason": "why this is problematic"
    }
  ]
}

Empty issues array if safe.`;

  const response = await sendMessage(contentCheckPrompt, {
    model,
    temperature: 0.1,
    maxTokens: 1024,
  });

  try {
    return JSON.parse(response);
  } catch {
    return {
      safe: false,
      issues: [
        {
          section: "content",
          category: "medical_advice",
          reason: "Failed to parse content check response",
        },
      ],
    };
  }
}

/**
 * Suggest safe alternatives to a blocked topic
 */
export async function suggestAlternatives(
  blockedTopic: string,
  category: BlockedCategory,
  options: { model?: ClaudeModel } = {}
): Promise<string[]> {
  const { model = "haiku" } = options;

  const alternativePrompt = `The topic "${blockedTopic}" was blocked because it falls under "${category}".

Suggest 3 alternative topics that:
1. Are related to the user's apparent interest
2. Are completely safe for advertising
3. Would work well as blog content

Return JSON array of 3 topic strings:
["topic 1", "topic 2", "topic 3"]`;

  const response = await sendMessage(alternativePrompt, {
    model,
    temperature: 0.7,
    maxTokens: 256,
  });

  try {
    return JSON.parse(response);
  } catch {
    return [];
  }
}

export default {
  quickSafetyCheck,
  fullSafetyCheck,
  checkArticleContent,
  suggestAlternatives,
  BLOCKED_CATEGORIES,
};
