---
name: blog-automation
description: Automated blog content generation, publishing, and management. Use when working on blog-related tasks.
allowed-tools: Read, Write, Bash, WebFetch
model: sonnet
---

# Blog Automation Skill

Core capabilities for automated blog content generation and management.

## Capabilities

- Generate SEO-optimized articles
- Manage content pillars and topic queues
- Publish to Sanity CMS
- Source images from Unsplash/DALL-E
- Track content performance and costs

## Quick Reference

### Generate Single Article

```typescript
import { generateArticle } from "@/lib/generation";
import { client } from "@/lib/sanity";
import { activeToneProfileQuery } from "@/lib/sanity/queries";

// Load tone profile
const toneProfile = await client.fetch(activeToneProfileQuery);

// Generate article
const result = await generateArticle({
  topic: "How to optimize React performance",
  articleType: "how-to",
  targetKeyword: "react performance optimization",
}, toneProfile);

if (result.success) {
  console.log(`Generated: ${result.article.title}`);
  console.log(`Word count: ${result.article.wordCount}`);
  console.log(`Cost: $${result.metrics.estimatedCost.toFixed(2)}`);
}
```

### Plan Weekly Content

```typescript
import { planWeeklyContent } from "@/lib/generation";
import { client } from "@/lib/sanity";
import { activeContentPillarsQuery } from "@/lib/sanity/queries";

const pillars = await client.fetch(activeContentPillarsQuery);
const plan = await planWeeklyContent(pillars, "2024-01-15");

console.log(`Planned ${plan.summary.totalArticles} articles`);
console.log(`Estimated cost: $${plan.summary.estimatedTotalCost.toFixed(2)}`);
```

### Check Content Safety

```typescript
import { fullSafetyCheck } from "@/lib/ai";

const result = await fullSafetyCheck("How to cure anxiety naturally");

if (!result.safe) {
  console.log(`Blocked: ${result.category} - ${result.reason}`);
}
```

### Source Images

```typescript
import { findImageForArticle } from "@/lib/images";

const image = await findImageForArticle({
  topic: "React hooks programming",
  keywords: ["code", "development"],
});

if (image.success) {
  console.log(`Found image: ${image.image.url}`);
  console.log(`Cost: $${image.cost}`);
}
```

## Configuration Files

| File | Purpose |
|------|---------|
| `.env` | API keys and secrets |
| `CLAUDE.md` | Project memory |
| `sanity/schemas/` | CMS data models |
| `lib/ai/` | Claude API integration |

## Content Safety Rules

**NEVER generate content about:**
- Medical/health advice
- Financial investment advice
- Legal advice
- War/violence/crime
- Political controversy

See `lib/ai/content-safety.ts` for full blocked categories.

## Cost Tracking

```typescript
import { getDailySummary, checkMonthlyBudget } from "@/lib/monitoring";

const today = getDailySummary();
console.log(`Today: $${today.totalCost.toFixed(2)} (${today.articleCount} articles)`);

const monthly = checkMonthlyBudget(100); // $100 budget
console.log(`Month: $${monthly.current.toFixed(2)} / $${monthly.limit}`);
```

## Common Tasks

### Add New Content Pillar

1. Create pillar in Sanity Studio
2. Add primary and secondary keywords
3. Generate initial topic queue
4. Link to pillar article (if exists)

### Analyze Tone from Samples

1. Gather 3-5 writing samples (1000+ words each)
2. Run `/blog analyze-tone` command
3. Review extracted characteristics
4. Adjust manually if needed
5. Test with sample generation

### Debug Failed Article

1. Check generation metrics
2. Review review-agent feedback
3. Check safety validation
4. Verify tone profile loaded
5. Check API key validity
