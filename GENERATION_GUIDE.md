# Daily Blog Generation Guide

## Overview

Your AI-powered blog platform is configured to generate 10 SEO-optimized pickleball strategy articles daily using Claude AI. The system includes safety checks, quality review loops, and automated publishing to Sanity CMS.

## Quick Start

```bash
# 1. Verify setup
npm run setup:check

# 2. Generate daily articles (generates 10 articles)
npm run generate:daily

# 3. Review results in Sanity Studio
npm run sanity:dev
```

## Current Status

✅ **Configured Components:**
- 5 Content Pillars (Doubles Strategy, Shot Technique, Drills, Paddle Science, Tournament Prep)
- Active Tone Profile ("Josh Comeau Inspired" - Professional, Intermediate level)
- Claude API configured
- Sanity CMS connected

⚠️ **Action Required:**
- Content pillar topic queues are currently empty
- You need to populate topics before generating articles (see "Adding Topics" below)

## System Architecture

### Content Pillars

Your blog uses a pillar/cluster content strategy with 5 main topics:

1. **Doubles Strategy & Positioning** - Stacking, court position, communication
2. **Shot Technique Mastery** - Third shot drop, dinking, erne, ATP
3. **Advanced Drills & Training** - Skill-specific drills for 4.0+
4. **Paddle Science & Equipment** - Technical reviews, paddle physics
5. **Tournament & Mental Game** - Competition prep, ratings, psychology

### Daily Content Mix

Each day generates:
- 8 How-To articles (1500-2000 words)
- 1 Pillar article (3000-5000 words)
- 1 Comparison article (2000-2500 words)

**Total:** 10 articles/day

### Generation Pipeline

```
1. Topic Selection (from queued topics in Sanity)
   ↓
2. Safety Check (blocks medical/legal/violence/etc)
   ↓
3. Outline Generation (Haiku)
   ↓
4. Draft Writing (Sonnet)
   ↓
5. Quality Review (Sonnet) - PASS/FAIL loop
   ↓
6. SEO Polish (Haiku)
   ↓
7. Final Safety Check
   ↓
8. Publish to Sanity CMS
```

## Adding Topics to Queue

Topics are managed in Sanity Studio. There are two ways to add them:

### Option 1: Manual Entry (Sanity Studio)

```bash
# Start Sanity Studio
npm run sanity:dev
# Navigate to http://localhost:3333
# Go to Content Pillars → Select a pillar → Add topics to Topic Queue
```

For each topic, specify:
- **Topic:** The article title/focus (e.g., "How to Master the Third Shot Drop")
- **Article Type:** how-to, pillar, or comparison
- **Target Keyword:** Primary SEO keyword
- **Priority:** 1-10 (higher = generated sooner)
- **Status:** Set to "queued"

### Option 2: Programmatic Generation (Recommended)

The seed script includes pre-populated topics. If your pillars have empty queues, you may need to re-seed or update them. Check the topics in:

```
scripts/seed-content-pillars.ts
```

Each pillar includes 8-10 pre-planned topics optimized for the pickleball strategy niche.

## Cost Estimates

### Per Article

- **How-To (1500-2000 words):** ~$0.15-0.25
- **Pillar (3000-5000 words):** ~$0.30-0.50
- **Comparison (2000-2500 words):** ~$0.20-0.30

**Average:** ~$0.20/article

### Daily Budget

- **10 articles/day:** ~$2.00-2.50/day
- **Monthly (30 days):** ~$60-75/month
- **With Batch API (50% off):** ~$30-40/month

### Cost Breakdown by Model

- **Haiku (planning/safety/polish):** ~10%
- **Sonnet (content writing/review):** ~85%
- **Opus (rarely used):** ~5%

## Generation Commands

### Setup Commands

```bash
# Check if system is ready to generate
npm run setup:check

# Seed initial content pillars (if needed)
npm run setup:seed

# Create default tone profile (if needed)
npm run setup:tone
```

### Generation Commands

```bash
# Generate 10 articles for today
npm run generate:daily

# Run test pipeline (1-2 articles for testing)
npm run generate:test
```

### Sanity Commands

```bash
# Start Sanity Studio for content management
npm run sanity:dev

# Deploy Sanity Studio to production
npm run sanity:deploy
```

## Content Safety

The system automatically blocks content in these categories:

❌ **Blocked Topics:**
- Medical/health advice and treatments
- War, military conflict, violent crime
- Financial investment advice
- Legal advice
- Political controversy
- Adult content
- Gambling
- Weapons
- Drugs

✅ **Safe Topics:**
- Sports strategy and technique (your niche!)
- General wellness and self-improvement
- Productivity and time management
- Technology tutorials
- Career development
- Creative skills and hobbies
- Educational content

## Tone Profile

Your active tone profile: **Josh Comeau Inspired**

**Characteristics:**
- Formality: Professional
- Technical Level: Intermediate
- Perspective: Second-person ("you")
- Personality: Strategic, analytical, authoritative, encouraging

**Voice Guidelines:**
- Focus on tactics and strategic decision-making
- Reference competitive play contexts (tournaments, ratings)
- Use specific technical terminology appropriately
- Provide actionable, practice-ready advice
- Avoid hyperbolic language ("game-changer", "secret weapon")

## Troubleshooting

### No Topics in Queue

**Problem:** `Warning: Only 0 topics queued`

**Solution:** Add topics in Sanity Studio or check if existing topics are marked as "queued" status

### Generation Failures

**Problem:** Articles failing quality review

**Solution:** The system auto-retries up to 2 times. If still failing, check:
- Tone profile settings
- Target keywords are appropriate
- Topic isn't blocked by safety checks

### API Errors

**Problem:** Claude API errors

**Solution:**
- Check ANTHROPIC_API_KEY in .env
- Verify API rate limits
- Check account billing status

### Sanity CMS Connection Issues

**Problem:** Cannot connect to Sanity

**Solution:**
- Verify SANITY_PROJECT_ID and SANITY_TOKEN in .env
- Check Sanity Studio is deployed
- Verify network connectivity

## File Structure

```
ai-blog/
├── lib/
│   ├── ai/                    # Claude client, tone training, safety
│   │   ├── claude-client.ts   # API client and cost estimation
│   │   ├── tone-training.ts   # Voice matching and tone analysis
│   │   └── content-safety.ts  # Topic and content safety checks
│   ├── generation/            # Article pipeline
│   │   ├── article-pipeline.ts # Main generation orchestration
│   │   └── topic-planner.ts   # Daily content planning
│   ├── sanity/                # CMS integration
│   │   ├── client.ts          # Sanity client instances
│   │   ├── queries.ts         # GROQ queries
│   │   └── mutations.ts       # Create/update operations
│   └── monitoring/            # Cost tracking (planned)
├── scripts/
│   ├── check-setup.ts         # Verify system configuration
│   ├── seed-content-pillars.ts # Initialize content pillars
│   ├── create-default-tone-profile.ts # Create tone profile
│   ├── generate-daily-articles.ts # Main generation script
│   └── test-pipeline.ts       # Test with 1-2 articles
├── sanity/
│   └── schemas/               # Sanity CMS schemas
│       ├── article.ts         # Article document
│       ├── contentPillar.ts   # Content pillar document
│       ├── toneProfile.ts     # Tone profile document
│       └── author.ts          # Author document
└── .env                       # Environment variables (API keys)
```

## Next Steps

Before your first generation run:

1. **Verify Topics:**
   ```bash
   npm run sanity:dev
   # Check that content pillars have queued topics
   ```

2. **Test with Small Batch:**
   ```bash
   # Generate 1-2 articles to test (modify test-pipeline.ts)
   npm run generate:test
   ```

3. **Review Test Results:**
   - Check Sanity Studio for generated articles
   - Verify tone matches expectations
   - Review SEO optimization (meta descriptions, keywords)
   - Check word counts and structure

4. **Run Full Daily Generation:**
   ```bash
   npm run generate:daily
   ```

5. **Set Up Automation (Optional):**
   - Create GitHub Actions workflow for daily runs
   - Set up Vercel deploy hooks to rebuild site after generation
   - Configure notifications for generation failures

## Monitoring and Optimization

### Track These Metrics

- **Cost per article:** Should stay around $0.15-0.25 for how-to articles
- **Review pass rate:** Aim for >80% passing on first attempt
- **Average word count:** How-to: 1500-2000, Pillar: 3000-5000
- **Safety check failures:** Should be <5% of topics

### Cost Optimization Tips

1. **Use Batch API** (50% off) for non-urgent generation
2. **Prompt caching** for repeated tone profiles (built-in)
3. **Model selection:** Haiku for routine tasks, Sonnet for content
4. **Reduce rewrites:** Improve prompts and tone profiles

## Support

For issues or questions:

1. Check logs in generation output
2. Verify setup with `npm run setup:check`
3. Review Sanity Studio for data consistency
4. Check API usage and costs in Anthropic dashboard

---

**Last Updated:** 2026-01-18
**Version:** 1.0.0
