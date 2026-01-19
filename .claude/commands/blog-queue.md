---
allowed-tools: Bash
description: View and manage the topic queue
model: haiku
---

# Topic Queue

View topics in the content queue, grouped by status.

## Instructions

### Default: Show queue summary

Run this query and format the results:

```bash
npx sanity documents query '*[_type == "contentPillar" && active == true] {
  title,
  "queued": topicQueue[status == "queued"]{ topic, articleType, priority } | order(priority asc),
  "titled": topicQueue[status == "titled"]{ topic, generatedTitle, articleType }
}' --api-version 2024-01-01 2>/dev/null
```

### Output Format

```
## Topic Queue

### Ready for Titles (queued)
**Doubles Strategy & Positioning:**
1. [how-to] Partner Communication Hand Signals (priority: 1)
2. [how-to] Mastering the Transition Zone (priority: 2)

**Shot Technique Mastery:**
1. [comparison] Forehand vs Backhand Dinks (priority: 1)

### Ready for Content (titled)
**Shot Technique Mastery:**
1. "Master Pickleball Dinking Strategies That Win Points"

### Summary
- Queued: X topics
- Titled: X topics (ready for /blog generate)
```

## Variations

If user asks `/blog queue add [topic]`:
- Explain they should add topics in Sanity Studio under Content Pillars → Topic Queue

If user asks `/blog queue clear`:
- Warn this is destructive
- Explain how to mark topics as skipped instead
