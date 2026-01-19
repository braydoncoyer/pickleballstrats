---
allowed-tools: Bash
description: Check blog status and queue stats
model: haiku
---

# Blog Status

Show the current state of the blog content pipeline.

## Instructions

Run these Sanity queries and format the results for the user:

### 1. Article Counts

```bash
npx sanity documents query '{
  "total": count(*[_type == "article"]),
  "drafts": count(*[_type == "article" && draft == true]),
  "published": count(*[_type == "article" && draft == false])
}' --api-version 2024-01-01 2>/dev/null
```

### 2. Queue Status

```bash
npx sanity documents query '{
  "queued": count(*[_type == "contentPillar"].topicQueue[status == "queued"]),
  "titled": count(*[_type == "contentPillar"].topicQueue[status == "titled"]),
  "published": count(*[_type == "contentPillar"].topicQueue[status == "published"]),
  "skipped": count(*[_type == "contentPillar"].topicQueue[status == "skipped"])
}' --api-version 2024-01-01 2>/dev/null
```

### 3. Recent Articles (last 5)

```bash
npx sanity documents query '*[_type == "article"] | order(publishedAt desc) [0...5] { title, "slug": slug.current, publishedAt, wordCount, articleType }' --api-version 2024-01-01 2>/dev/null
```

### 4. Pillars Overview

```bash
npx sanity documents query '*[_type == "contentPillar" && active == true] { title, "queued": count(topicQueue[status == "queued"]), "titled": count(topicQueue[status == "titled"]) }' --api-version 2024-01-01 2>/dev/null
```

## Output Format

Present the results like this:

```
## Blog Status

### Articles
- Total: X
- Published: X
- Drafts: X

### Topic Queue
- Queued (ready for titles): X
- Titled (ready for content): X
- Published: X
- Skipped: X

### Content Pillars
| Pillar | Queued | Titled |
|--------|--------|--------|
| Name   | X      | X      |

### Recent Articles
1. [Title] - [type] - [date]
2. ...
```
