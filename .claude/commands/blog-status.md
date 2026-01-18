---
allowed-tools: Read, Bash
description: Check blog health, recent articles, and stats
model: haiku
---

# Blog Status Check

Get a comprehensive overview of blog health and recent activity.

## Status Report Sections

### 1. Content Overview
- Total published articles
- Articles by type (how-to, pillar, comparison)
- Articles published this week/month
- Draft articles pending review

### 2. Content Pillars
- Active pillars with article counts
- Topics queued per pillar
- Pillars needing attention (low queue)

### 3. Recent Articles
- Last 10 published articles with:
  - Title
  - Publish date
  - Word count
  - Review score
  - Article type

### 4. Generation Metrics
- Articles generated today
- AI cost today/this month
- Average cost per article
- Review pass rate
- Average review score

### 5. System Health
- Sanity CMS connection status
- API keys configured (Claude, Unsplash, DALL-E)
- DALL-E daily budget status
- Last successful generation run

### 6. SEO Quick Check
- Articles missing meta descriptions
- Articles with low word count
- Orphan articles (no pillar)
- Recent indexing status (if available)

## Output Format

```
# Blog Status Report
Generated: [DATE TIME]

## Content Overview
Published: XXX articles
- How-To: XX (80%)
- Pillar: XX (10%)
- Comparison: XX (10%)

This week: X new articles
This month: XX new articles
Drafts pending: X

## Content Pillars
| Pillar | Articles | Queued | Status |
|--------|----------|--------|--------|
| Name   | 15       | 8      | Good   |

## Recent Articles
1. [Title] - 2000 words - Score: 85 - Jan 15
2. ...

## Generation Metrics
Today: X articles ($X.XX)
This month: XX articles ($XX.XX)
Avg cost/article: $0.XX
Pass rate: XX%
Avg score: XX

## System Health
✅ Sanity CMS: Connected
✅ Claude API: Configured
✅ Unsplash: Configured
✅ DALL-E: Configured (8/10 remaining today)

## Attention Needed
- ⚠️ Pillar "React" has only 2 topics queued
- ⚠️ 3 articles missing meta descriptions
```
