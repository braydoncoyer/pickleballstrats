---
allowed-tools: Read, Write, Bash, WebFetch
description: Generate daily blog articles using AI pipeline
model: sonnet
---

# Daily Blog Generation

Generate 10 SEO-optimized articles following the content pillar strategy.

## Process

1. **Load Configuration**
   - Read content pillars from Sanity CMS
   - Load active tone profile
   - Check today's scheduled topics from topic queue

2. **Plan Today's Content**
   - Select 8 how-to topics from queued items
   - Select 1 pillar topic
   - Select 1 comparison topic
   - Validate all topics pass safety check

3. **For Each Article (10 total)**
   - Run safety check on topic (reject health/war/crime topics)
   - Generate detailed outline with target keywords
   - Write 2000+ word article matching tone profile
   - Source featured image (Unsplash first, DALL-E fallback)
   - Review with quality agent (PASS/FAIL loop)
   - Polish for SEO optimization

4. **Publish to Sanity**
   - Create article documents in Sanity CMS
   - Set appropriate publish dates (spread throughout day)
   - Mark topics as "published" in queue
   - Trigger Vercel rebuild webhook

5. **Generate Report**
   - Articles generated (count and titles)
   - Total word count
   - Estimated AI cost breakdown
   - Any failures or skipped topics
   - Review scores for each article

## Cost Budget

Target: ~$0.25 per article standard, ~$0.13 with batch API
Daily budget: ~$2.50 (10 articles)
Monthly budget: ~$75

## Error Handling

- If topic fails safety check: skip and log
- If review fails after 2 rewrites: flag for human review
- If image sourcing fails: publish without image, flag for manual addition
- If Sanity publish fails: save locally and retry
