/**
 * Topic Planner Module
 *
 * Plans daily content topics following the pillar/cluster strategy:
 * - 8 how-to articles (80%)
 * - 1 pillar article (10%)
 * - 1 comparison article (10%)
 *
 * Topics are selected from content pillars and optimized for SEO.
 */

import { sendMessage } from "../ai/claude-client";

// ============================================
// Types
// ============================================

export interface ContentPillar {
  id: string;
  title: string;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  topicQueue: QueuedTopic[];
}

export interface QueuedTopic {
  topic: string;
  articleType: "how-to" | "pillar" | "comparison";
  targetKeyword: string;
  priority: number;
  status: "queued" | "in-progress" | "published" | "skipped";
  scheduledDate?: string;
}

export interface DailyPlan {
  date: string;
  topics: PlannedTopic[];
  estimatedCost: number;
}

export interface PlannedTopic {
  topic: string;
  articleType: "how-to" | "pillar" | "comparison";
  targetKeyword: string;
  pillarId: string;
  pillarTitle: string;
  order: number;
}

export interface WeeklyPlan {
  startDate: string;
  endDate: string;
  dailyPlans: DailyPlan[];
  summary: {
    totalArticles: number;
    byType: {
      "how-to": number;
      pillar: number;
      comparison: number;
    };
    estimatedTotalCost: number;
  };
}

// ============================================
// Daily Content Mix
// ============================================

const DAILY_MIX = {
  "how-to": 8,
  pillar: 1,
  comparison: 1,
  total: 10,
};

// ============================================
// Planning Functions
// ============================================

/**
 * Generate a daily content plan from content pillars
 */
export async function planDailyContent(
  pillars: ContentPillar[],
  date: string
): Promise<DailyPlan> {
  const topics: PlannedTopic[] = [];
  let order = 1;

  // Filter to active pillars with queued topics
  const activePillars = pillars.filter(
    (p) => p.topicQueue.some((t) => t.status === "queued")
  );

  if (activePillars.length === 0) {
    throw new Error("No active content pillars with queued topics");
  }

  // Select pillar article (1 per day)
  const pillarTopic = selectTopicByType(activePillars, "pillar");
  if (pillarTopic) {
    topics.push({ ...pillarTopic, order: order++ });
  }

  // Select comparison article (1 per day)
  const comparisonTopic = selectTopicByType(activePillars, "comparison");
  if (comparisonTopic) {
    topics.push({ ...comparisonTopic, order: order++ });
  }

  // Fill remaining with how-to articles
  const howToCount = DAILY_MIX.total - topics.length;
  const howToTopics = selectMultipleTopics(activePillars, "how-to", howToCount);
  for (const topic of howToTopics) {
    topics.push({ ...topic, order: order++ });
  }

  // Estimate cost (~$0.13-0.25 per article with batch)
  const estimatedCost = topics.length * 0.2;

  return {
    date,
    topics,
    estimatedCost,
  };
}

/**
 * Generate a weekly content plan
 */
export async function planWeeklyContent(
  pillars: ContentPillar[],
  startDate: string
): Promise<WeeklyPlan> {
  const dailyPlans: DailyPlan[] = [];
  const start = new Date(startDate);

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    try {
      const plan = await planDailyContent(pillars, dateStr);
      dailyPlans.push(plan);
    } catch (error) {
      // Skip days without available topics
      console.warn(`No topics available for ${dateStr}`);
    }
  }

  const summary = {
    totalArticles: dailyPlans.reduce((sum, p) => sum + p.topics.length, 0),
    byType: {
      "how-to": dailyPlans.reduce(
        (sum, p) => sum + p.topics.filter((t) => t.articleType === "how-to").length,
        0
      ),
      pillar: dailyPlans.reduce(
        (sum, p) => sum + p.topics.filter((t) => t.articleType === "pillar").length,
        0
      ),
      comparison: dailyPlans.reduce(
        (sum, p) => sum + p.topics.filter((t) => t.articleType === "comparison").length,
        0
      ),
    },
    estimatedTotalCost: dailyPlans.reduce((sum, p) => sum + p.estimatedCost, 0),
  };

  return {
    startDate,
    endDate: dailyPlans[dailyPlans.length - 1]?.date || startDate,
    dailyPlans,
    summary,
  };
}

/**
 * Generate new topic ideas for a pillar
 */
export async function generateTopicIdeas(
  pillar: ContentPillar,
  count: number = 10
): Promise<QueuedTopic[]> {
  const prompt = `Generate ${count} blog post topic ideas for this content pillar.

PILLAR: ${pillar.title}
PRIMARY KEYWORDS: ${pillar.primaryKeywords.join(", ")}
SECONDARY KEYWORDS: ${pillar.secondaryKeywords.join(", ")}

Requirements:
- 80% should be how-to articles (practical, actionable)
- 10% should be pillar/comprehensive guides (3000+ words)
- 10% should be comparison articles (X vs Y)
- Focus on long-tail keywords with search intent
- Avoid topics that could be considered medical, financial, or legal advice

Return JSON array:
[
  {
    "topic": "How to [specific action]",
    "articleType": "how-to" | "pillar" | "comparison",
    "targetKeyword": "primary keyword phrase",
    "priority": 1-10
  }
]

Sort by priority (highest first).`;

  const response = await sendMessage(prompt, {
    model: "haiku",
    temperature: 0.7,
    maxTokens: 2048,
  });

  const ideas = JSON.parse(response);

  return ideas.map((idea: Omit<QueuedTopic, "status">) => ({
    ...idea,
    status: "queued" as const,
  }));
}

/**
 * Evaluate and prioritize topics based on SEO potential
 */
export async function evaluateTopicPriority(
  topics: QueuedTopic[],
  pillar: ContentPillar
): Promise<QueuedTopic[]> {
  const prompt = `Evaluate and prioritize these blog topics for SEO potential.

PILLAR: ${pillar.title}
KEYWORDS: ${pillar.primaryKeywords.join(", ")}

TOPICS:
${topics.map((t, i) => `${i + 1}. ${t.topic} (${t.articleType})`).join("\n")}

Consider:
1. Search intent clarity
2. Keyword difficulty (prefer easier keywords)
3. Content differentiation potential
4. Internal linking opportunities

Return JSON array with updated priorities (1-10, 10 = highest):
[
  { "index": 0, "priority": 8, "reason": "clear search intent" },
  { "index": 1, "priority": 6, "reason": "competitive keyword" }
]`;

  const response = await sendMessage(prompt, {
    model: "haiku",
    temperature: 0.3,
    maxTokens: 1024,
  });

  const evaluations = JSON.parse(response);

  return topics.map((topic, index) => {
    const evaluation = evaluations.find(
      (e: { index: number }) => e.index === index
    );
    return {
      ...topic,
      priority: evaluation?.priority || topic.priority,
    };
  });
}

// ============================================
// Helpers
// ============================================

function selectTopicByType(
  pillars: ContentPillar[],
  articleType: "how-to" | "pillar" | "comparison"
): PlannedTopic | null {
  for (const pillar of shuffleArray(pillars)) {
    const topic = pillar.topicQueue.find(
      (t) => t.articleType === articleType && t.status === "queued"
    );
    if (topic) {
      return {
        topic: topic.topic,
        articleType: topic.articleType,
        targetKeyword: topic.targetKeyword,
        pillarId: pillar.id,
        pillarTitle: pillar.title,
        order: 0,
      };
    }
  }
  return null;
}

function selectMultipleTopics(
  pillars: ContentPillar[],
  articleType: "how-to" | "pillar" | "comparison",
  count: number
): PlannedTopic[] {
  const topics: PlannedTopic[] = [];
  const usedTopics = new Set<string>();

  // Round-robin across pillars to distribute content
  let pillarIndex = 0;
  const shuffledPillars = shuffleArray(pillars);

  while (topics.length < count && pillarIndex < shuffledPillars.length * 10) {
    const pillar = shuffledPillars[pillarIndex % shuffledPillars.length];
    const availableTopic = pillar.topicQueue.find(
      (t) =>
        t.articleType === articleType &&
        t.status === "queued" &&
        !usedTopics.has(t.topic)
    );

    if (availableTopic) {
      topics.push({
        topic: availableTopic.topic,
        articleType: availableTopic.articleType,
        targetKeyword: availableTopic.targetKeyword,
        pillarId: pillar.id,
        pillarTitle: pillar.title,
        order: 0,
      });
      usedTopics.add(availableTopic.topic);
    }

    pillarIndex++;
  }

  return topics;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default {
  planDailyContent,
  planWeeklyContent,
  generateTopicIdeas,
  evaluateTopicPriority,
};
