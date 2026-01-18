/**
 * Generation Module Index
 *
 * Re-exports all content generation functionality.
 */

export {
  generateArticle,
  type TopicInput,
  type GenerationResult,
  type GeneratedArticle,
  type ArticleOutline,
  type GenerationMetrics,
  type ReviewResult,
} from "./article-pipeline";

export {
  planDailyContent,
  planWeeklyContent,
  generateTopicIdeas,
  evaluateTopicPriority,
  type ContentPillar,
  type QueuedTopic,
  type DailyPlan,
  type PlannedTopic,
  type WeeklyPlan,
} from "./topic-planner";

export {
  addInternalLinks,
  getExistingArticles,
  removePlaceholders,
  type ExistingArticle,
  type LinkResult,
  type LinkingResult,
} from "./internal-linker";
