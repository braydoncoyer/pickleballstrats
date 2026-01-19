# Pickleball Strats - Project Memory

**Domain:** https://pickleballstrats.com

## Overview

AI-powered automated blog platform targeting **Advanced Pickleball Strategy** for competitive players (3.5-5.0). Generates SEO-optimized articles using Claude AI, with proper ad network compatibility.

## Niche: Advanced Pickleball Strategy

**Target Audience:** Competitive players (3.5-5.0) looking to level up
**Positioning:** "The strategy resource for competitive pickleball players who want to level up from 3.5 to 4.5+"

### Content Pillars (in Sanity)
1. **Doubles Strategy & Positioning** (`doubles-strategy-positioning`)
2. **Shot Technique Mastery** (`shot-technique-mastery`)
3. **Advanced Drills & Training** (`advanced-drills-training`)
4. **Paddle Science & Equipment** (`paddle-science-equipment`)
5. **Tournament & Mental Game** (`tournament-mental-game`)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Astro (MPA architecture for ad compatibility) |
| Language | TypeScript |
| CMS | Sanity |
| Hosting | Vercel |
| AI | Claude API (Haiku for planning, Sonnet for writing) |
| Images | Unsplash (free) + Google Imagen (fallback) |

---

## Article Generation Pipeline

### Two-Phase Workflow

Article generation is split into two phases for better control and duplicate prevention:

```
Phase 1: generate-titles.ts
   queued → titled
   Fast, cheap (Haiku)
   Review titles before generating content

Phase 2: generate-articles.ts
   titled → published
   High-quality content (Sonnet)
   Uses pre-generated titles
```

### Quick Start

```bash
# PHASE 1: Generate titles for queued topics (default: 50)
npx tsx scripts/generate-titles.ts [count]

# Review and edit titles in Sanity Studio...

# PHASE 2: Generate content for titled topics (default: 3)
npx tsx scripts/generate-articles.ts [count]
```

### Why Two Phases?

1. **Catch duplicates early** - Review titles before spending time/money on content
2. **Editorial control** - Edit titles before content is generated
3. **Cost efficiency** - Haiku for titles (~$0.003), Sonnet for content (~$0.15)
4. **Batch processing** - Generate all titles at once, then content in batches

### Phase 1: Title Generation

```bash
npx tsx scripts/generate-titles.ts 10    # Generate 10 titles
```

- Fetches `queued` topics from all content pillars
- Generates SEO-optimized titles using Claude Haiku
- Checks for duplicate titles (exact and similar)
- Updates status: `queued` → `titled`
- Stores title in `generatedTitle` field (editable in Sanity)

### Phase 2: Content Generation

```bash
npx tsx scripts/generate-articles.ts 5   # Generate 5 articles
```

- Fetches `titled` topics (Phase 1 must be complete)
- Uses the pre-generated title (no regeneration)
- Generates outline, draft, images, internal links
- Updates status: `titled` → `published`

### Topic Queue Status

| Status | Meaning |
|--------|---------|
| `queued` | Ready for title generation (Phase 1) |
| `titled` | Has title, ready for content (Phase 2) |
| `in-progress` | Currently being generated |
| `published` | Successfully completed |
| `skipped` | Duplicate detected |

**To add new topics:** Edit the `topicQueue` array in Sanity Studio under Content Pillars.

### Article Types

| Type | Word Target | Purpose |
|------|-------------|---------|
| `how-to` | 800-1200 | Focused, actionable tutorials on specific techniques |
| `summary` | 2000-3000 | Roundup articles that aggregate multiple how-to topics |
| `comparison` | 1500-2000 | X vs Y comparisons |
| `pillar` | 3000-5000 | Comprehensive guides (cornerstone content) |

### Pipeline Steps (Phase 2)

Each article goes through these automated steps:

1. **Generate Outline** (Haiku) - Uses pre-generated title, creates H2/H3 structure
2. **Generate Draft** (Sonnet) - Writes full article matching word target
3. **Resolve Images** - Searches Unsplash for inline image placeholders
4. **Extract Metadata** (Haiku) - Description, tags, keywords
5. **Process Internal Links** - Resolves `[INTERNAL: topic]` placeholders
6. **Find Featured Image** - Searches Unsplash, generates SEO alt text
7. **Save to Sanity** - Creates draft article in CMS
8. **Update Queue** - Marks topic as `published`

---

## Internal Linking System

The pipeline automatically creates internal links between articles:

- **How-to articles** link UP to their parent pillar
- **Pillar articles** link DOWN to cluster articles
- Uses `[INTERNAL: topic]` placeholders in drafts
- Only links to **published** articles (not drafts)

**Note:** New articles won't have internal links until you publish existing articles.

---

## Image Sourcing

Priority order:
1. **Unsplash** (free) - Searches based on article topic
2. **Google Imagen** (~$0.03/image) - Fallback when no Unsplash match

Budget: Max 10 Imagen images/day

All images get AI-generated SEO alt text (under 125 characters).

---

## Key Directories

```
ai-blog/
├── scripts/
│   └── generate-articles.ts  # Main generation script
├── lib/
│   ├── ai/                   # Claude client, tone training
│   ├── generation/           # Article pipeline, internal linker
│   ├── images/               # Unsplash, Google Imagen integration
│   └── sanity/               # CMS client, queries
├── sanity/schemas/           # Sanity CMS schemas
├── .claude/
│   ├── agents/               # Custom agents (review, content-writer, etc.)
│   └── rules/                # Content style rules
└── content/                  # Keyword research, article planning docs
```

---

## Content Style Rules (CRITICAL)

**Title Rules:**
- NEVER use colons in titles - no "Title: Subtitle" format
- ❌ WRONG: "10 Essential Drills: Elevate Your Game"
- ✅ RIGHT: "10 Essential Pickleball Drills for 4.0 Players"

**Phrases to Avoid:**
- "Game changer"
- "Take your game to the next level"
- "In conclusion"
- "At the end of the day"

See `.claude/rules/content-style.md` for full style guide.

---

## Content Safety Rules

**NEVER generate content about:**
- Medical/health advice and treatments
- War, military conflict, violent crime
- Financial investment advice
- Legal advice
- Political controversy

---

## Environment Variables

Required in `.env`:

```bash
# Sanity CMS
SANITY_PROJECT_ID=your_project_id
SANITY_DATASET=production
SANITY_TOKEN=your_write_token
SANITY_API_VERSION=2024-01-01

# AI
ANTHROPIC_API_KEY=your_claude_key

# Images
UNSPLASH_ACCESS_KEY=your_unsplash_key
GEMINI_API_KEY=your_gemini_key  # Optional, for Google Imagen fallback
```

---

## Sanity CLI Commands

```bash
# Query all articles
npx sanity documents query '*[_type == "article"]{ _id, title, draft }' --api-version 2024-01-01

# Delete specific articles
npx sanity documents delete [id1] [id2] --api-version 2024-01-01

# Query content pillars
npx sanity documents query '*[_type == "contentPillar"]{ _id, title, "slug": slug.current }' --api-version 2024-01-01

# Count queued topics (ready for Phase 1)
npx sanity documents query 'count(*[_type == "contentPillar"].topicQueue[status == "queued"])' --api-version 2024-01-01

# Count titled topics (ready for Phase 2)
npx sanity documents query 'count(*[_type == "contentPillar"].topicQueue[status == "titled"])' --api-version 2024-01-01

# View titled topics with their generated titles
npx sanity documents query '*[_type == "contentPillar"]{ title, "titled": topicQueue[status == "titled"]{ topic, generatedTitle } }' --api-version 2024-01-01

# Check topic queue status (non-queued topics)
npx sanity documents query '*[_type == "contentPillar"]{ title, "completed": topicQueue[status in ["published", "skipped"]]{ topic, status } }' --api-version 2024-01-01
```

---

## Development

```bash
# Start Astro dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Cost Estimates

| Component | Cost |
|-----------|------|
| Haiku (outline, metadata) | ~$0.003/article |
| Sonnet (draft) | ~$0.15/article |
| Google Imagen | ~$0.03/image |
| **Total per article** | ~$0.15-0.20 |

---

## Troubleshooting

**"No existing articles found for linking"**
- Normal for new sites - internal links only work once you have published articles

**"No image sources available"**
- Check that `UNSPLASH_ACCESS_KEY` is set in `.env`
- Unsplash may not have images for very specific pickleball terms

**TypeScript errors when running script**
- Use `npx tsx` not `npx ts-node` - tsx handles module issues better
