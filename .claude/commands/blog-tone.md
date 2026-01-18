---
allowed-tools: Read, Write, WebFetch
description: Analyze writing samples to extract tone profile
model: sonnet
---

# Tone Profile Analysis

Analyze writing samples to extract voice characteristics and build a tone profile for AI content generation.

## Input

Provide one or more of:
- URLs to existing blog posts
- Paths to local markdown/text files
- Pasted text samples

## Analysis Process

1. **Collect Writing Samples**
   - Read provided URLs or files
   - Extract main content (remove boilerplate)
   - Aim for at least 3-5 samples, 1000+ words each

2. **Analyze Voice Characteristics**
   - Formality level (casual to formal)
   - Technical depth (beginner to expert)
   - Personality traits (enthusiastic, analytical, etc.)
   - Writing perspective (I/we, you, third person)
   - Sentence variety and length patterns

3. **Extract Patterns**
   - Characteristic phrases and expressions
   - Transition patterns between sections
   - Introduction styles
   - Conclusion approaches
   - Phrases/patterns to avoid

4. **Identify Structure Preferences**
   - Paragraph length tendencies
   - Subheading frequency
   - List usage patterns
   - Code example inclusion
   - Personal anecdote usage

5. **Build System Prompt**
   - Generate system prompt prefix for AI
   - Include specific guidance on voice
   - Add example phrases to emulate
   - List patterns to avoid

## Output

Save tone profile to Sanity CMS with:
- Voice characteristics object
- Sample phrases array
- Avoid phrases array
- Structural preferences
- System prompt prefix

Also create local backup at `~/.blog/tone-profile.json`

## Validation

After creating profile:
1. Generate a short test paragraph
2. Compare against original samples
3. Score similarity (aim for 80%+)
4. Adjust profile if needed
