---
allowed-tools: Bash
description: Generate blog articles (titles + content)
model: sonnet
---

# Generate Articles

Generate blog articles from the topic queue. This runs both phases automatically:
1. Generate SEO-optimized titles for queued topics
2. Generate full article content for those titles

## Instructions

When the user runs `/blog generate [count]`, execute:

```bash
npx tsx scripts/generate-titles.ts [count] && npx tsx scripts/generate-articles.ts [count]
```

**Default count is 3 if not specified.**

### Examples

- `/blog generate` → Generate 3 articles
- `/blog generate 5` → Generate 5 articles
- `/blog generate 10` → Generate 10 articles

## What Happens

**Phase 1 - Title Generation (Haiku - fast/cheap):**
- Fetches `queued` topics from content pillars
- Generates SEO-optimized titles
- Checks for duplicates
- Status: `queued` → `titled`

**Phase 2 - Content Generation (Sonnet - high quality):**
- Uses the titles from Phase 1
- Generates full article with images
- Adds internal links
- Saves to Sanity as draft
- Status: `titled` → `published`

## After Running

Report to the user:
- How many articles were generated
- Any errors or skipped topics
- Remind them to review drafts in Sanity Studio
