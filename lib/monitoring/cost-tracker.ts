/**
 * Cost Tracker Module
 *
 * Tracks and monitors AI generation costs for budget management.
 * Supports daily and monthly cost tracking with alerts.
 */

import { estimateCost as estimateClaudeCost, type ClaudeModel } from "../ai/claude-client";
import { estimateCost as estimateDalleCost } from "../images/dalle";

// ============================================
// Types
// ============================================

export interface CostEntry {
  timestamp: string;
  category: "claude" | "dalle" | "unsplash";
  model?: ClaudeModel;
  tokensInput?: number;
  tokensOutput?: number;
  cost: number;
  description: string;
}

export interface DailyCostSummary {
  date: string;
  totalCost: number;
  byCategory: {
    claude: number;
    dalle: number;
    unsplash: number;
  };
  articleCount: number;
  averageCostPerArticle: number;
}

export interface MonthlyCostSummary {
  month: string;
  totalCost: number;
  byCategory: {
    claude: number;
    dalle: number;
    unsplash: number;
  };
  articleCount: number;
  dailyBreakdown: DailyCostSummary[];
}

// ============================================
// In-Memory Cost Storage
// (Would be replaced with persistent storage in production)
// ============================================

const costEntries: CostEntry[] = [];
let dailyCostCache: Map<string, DailyCostSummary> = new Map();

// ============================================
// Cost Tracking Functions
// ============================================

/**
 * Record a cost entry
 */
export function recordCost(entry: Omit<CostEntry, "timestamp">): void {
  const fullEntry: CostEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  costEntries.push(fullEntry);

  // Invalidate daily cache for this date
  const date = fullEntry.timestamp.split("T")[0];
  dailyCostCache.delete(date);
}

/**
 * Record Claude API cost
 */
export function recordClaudeCost(
  model: ClaudeModel,
  tokensInput: number,
  tokensOutput: number,
  description: string
): number {
  const cost = estimateClaudeCost(tokensInput, tokensOutput, model);

  recordCost({
    category: "claude",
    model,
    tokensInput,
    tokensOutput,
    cost,
    description,
  });

  return cost;
}

/**
 * Record DALL-E image cost
 */
export function recordDalleCost(
  size: "1024x1024" | "1024x1792" | "1792x1024",
  quality: "standard" | "hd",
  description: string
): number {
  const cost = estimateDalleCost(size, quality);

  recordCost({
    category: "dalle",
    cost,
    description,
  });

  return cost;
}

/**
 * Get daily cost summary
 */
export function getDailySummary(date?: string): DailyCostSummary {
  const targetDate = date || new Date().toISOString().split("T")[0];

  // Check cache
  if (dailyCostCache.has(targetDate)) {
    return dailyCostCache.get(targetDate)!;
  }

  // Calculate from entries
  const dayEntries = costEntries.filter((e) =>
    e.timestamp.startsWith(targetDate)
  );

  const summary: DailyCostSummary = {
    date: targetDate,
    totalCost: 0,
    byCategory: {
      claude: 0,
      dalle: 0,
      unsplash: 0,
    },
    articleCount: 0,
    averageCostPerArticle: 0,
  };

  for (const entry of dayEntries) {
    summary.totalCost += entry.cost;
    summary.byCategory[entry.category] += entry.cost;

    // Count articles (assumes description contains "article")
    if (entry.description.toLowerCase().includes("article")) {
      summary.articleCount++;
    }
  }

  // Deduplicate article count (rough estimate)
  summary.articleCount = Math.ceil(summary.articleCount / 5); // ~5 API calls per article

  if (summary.articleCount > 0) {
    summary.averageCostPerArticle = summary.totalCost / summary.articleCount;
  }

  // Cache the result
  dailyCostCache.set(targetDate, summary);

  return summary;
}

/**
 * Get monthly cost summary
 */
export function getMonthlySummary(month?: string): MonthlyCostSummary {
  const targetMonth =
    month || new Date().toISOString().slice(0, 7); // YYYY-MM

  const monthEntries = costEntries.filter((e) =>
    e.timestamp.startsWith(targetMonth)
  );

  const summary: MonthlyCostSummary = {
    month: targetMonth,
    totalCost: 0,
    byCategory: {
      claude: 0,
      dalle: 0,
      unsplash: 0,
    },
    articleCount: 0,
    dailyBreakdown: [],
  };

  // Get unique dates in the month
  const dates = new Set(monthEntries.map((e) => e.timestamp.split("T")[0]));

  for (const date of dates) {
    const dailySummary = getDailySummary(date);
    summary.dailyBreakdown.push(dailySummary);
    summary.totalCost += dailySummary.totalCost;
    summary.byCategory.claude += dailySummary.byCategory.claude;
    summary.byCategory.dalle += dailySummary.byCategory.dalle;
    summary.byCategory.unsplash += dailySummary.byCategory.unsplash;
    summary.articleCount += dailySummary.articleCount;
  }

  return summary;
}

/**
 * Check if daily budget is exceeded
 */
export function checkDailyBudget(
  budgetLimit: number,
  date?: string
): {
  exceeded: boolean;
  current: number;
  limit: number;
  remaining: number;
} {
  const summary = getDailySummary(date);

  return {
    exceeded: summary.totalCost >= budgetLimit,
    current: summary.totalCost,
    limit: budgetLimit,
    remaining: Math.max(0, budgetLimit - summary.totalCost),
  };
}

/**
 * Check if monthly budget is exceeded
 */
export function checkMonthlyBudget(
  budgetLimit: number,
  month?: string
): {
  exceeded: boolean;
  current: number;
  limit: number;
  remaining: number;
  projectedTotal: number;
} {
  const summary = getMonthlySummary(month);
  const daysInMonth = new Date(
    parseInt(summary.month.split("-")[0]),
    parseInt(summary.month.split("-")[1]),
    0
  ).getDate();
  const currentDay = new Date().getDate();
  const dailyAverage =
    summary.dailyBreakdown.length > 0
      ? summary.totalCost / summary.dailyBreakdown.length
      : 0;
  const projectedTotal = dailyAverage * daysInMonth;

  return {
    exceeded: summary.totalCost >= budgetLimit,
    current: summary.totalCost,
    limit: budgetLimit,
    remaining: Math.max(0, budgetLimit - summary.totalCost),
    projectedTotal,
  };
}

/**
 * Get all cost entries (for debugging/export)
 */
export function getAllEntries(): CostEntry[] {
  return [...costEntries];
}

/**
 * Clear all cost entries (for testing)
 */
export function clearEntries(): void {
  costEntries.length = 0;
  dailyCostCache.clear();
}

export default {
  recordCost,
  recordClaudeCost,
  recordDalleCost,
  getDailySummary,
  getMonthlySummary,
  checkDailyBudget,
  checkMonthlyBudget,
  getAllEntries,
  clearEntries,
};
