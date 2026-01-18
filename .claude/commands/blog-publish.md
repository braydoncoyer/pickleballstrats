---
allowed-tools: Read, Write, Bash
description: Publish a specific draft article
model: haiku
---

# Publish Article

Publish a draft article to the live blog.

## Usage

```
/blog publish [article-id or slug]
```

## Process

1. **Validate Article**
   - Fetch article from Sanity by ID or slug
   - Verify article exists and is in draft state
   - Check review status (must be "passed" or "human-review")

2. **Pre-Publish Checks**
   - Title present and within limits
   - Meta description present and within limits
   - Featured image present (warn if missing)
   - Content passes safety check
   - Word count meets minimum for type
   - Internal links resolved

3. **Resolve Internal Links**
   - Find all `[INTERNAL: topic]` placeholders
   - Match to existing articles by topic
   - Replace with actual links
   - Log any unresolved placeholders

4. **Publish to Sanity**
   - Set `draft: false`
   - Set `publishedAt` to current time (or scheduled time)
   - Update `modifiedAt`
   - Clear any pending review flags

5. **Post-Publish Actions**
   - Trigger Vercel rebuild webhook
   - Update content pillar article count
   - Mark topic as "published" in queue
   - Generate publish confirmation

## Options

- `--schedule [datetime]` - Schedule for future publish
- `--force` - Skip review status check
- `--no-rebuild` - Don't trigger Vercel rebuild

## Output

```
# Article Published

Title: [Article Title]
URL: /blog/[slug]
Published: [datetime]
Word Count: XXXX
Type: how-to

Internal Links Resolved: 3/3
- "React hooks" -> /blog/react-hooks-guide
- "State management" -> /blog/state-management-comparison
- "Performance tips" -> /blog/react-performance-tips

Vercel Rebuild: Triggered
Estimated live: ~2 minutes
```

## Error Handling

- If article not found: Show available drafts
- If review failed: Show issues and suggest fixes
- If links unresolved: Warn but allow publish
- If rebuild fails: Publish anyway, log for manual rebuild
