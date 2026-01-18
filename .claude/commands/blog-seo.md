---
allowed-tools: Read, Write, WebFetch
description: Audit an article for SEO optimization
model: haiku
---

# SEO Audit

Analyze an article for SEO optimization and provide improvement recommendations.

## Input

Provide one of:
- Article slug or ID from Sanity
- Path to local markdown file
- URL to published article

## Audit Checklist

### Title & Meta
- [ ] Title under 60 characters
- [ ] Title includes target keyword naturally
- [ ] Meta description under 155 characters
- [ ] Meta description is compelling and includes keyword
- [ ] Title is unique (not duplicated on site)

### Content Structure
- [ ] Proper H1 -> H2 -> H3 hierarchy
- [ ] H2s include keywords where natural
- [ ] Content answers the search intent
- [ ] FAQ section at the end
- [ ] Table of contents for long articles

### Keyword Optimization
- [ ] Target keyword in first 100 words
- [ ] Keyword density 1-2% (not stuffed)
- [ ] Related keywords and synonyms used
- [ ] Keywords in image alt text
- [ ] Natural language (not forced)

### Readability
- [ ] Paragraphs 2-4 sentences
- [ ] Sentence variety (short + medium + long)
- [ ] No walls of text
- [ ] Bullet points and lists where appropriate
- [ ] Active voice preferred

### Internal Linking
- [ ] Links to related content
- [ ] Links to pillar article (if cluster)
- [ ] Anchor text is descriptive
- [ ] No orphan pages

### Technical
- [ ] Canonical URL set
- [ ] Open Graph tags present
- [ ] Schema markup (Article)
- [ ] Image optimization (size, format)
- [ ] Mobile-friendly

## Output Format

```
# SEO Audit: [Article Title]

## Score: XX/100

### Issues (Critical)
- Issue 1: Description and fix

### Issues (Important)
- Issue 2: Description and fix

### Issues (Minor)
- Issue 3: Description and fix

### Opportunities
- Suggestion 1
- Suggestion 2

### What's Good
- Positive 1
- Positive 2
```

## Auto-Fix Option

If `--fix` flag provided, automatically:
- Update meta description
- Add missing H2 keywords
- Suggest internal link placements
- Generate [INTERNAL: topic] markers
