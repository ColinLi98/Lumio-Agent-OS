---
name: product-manager
description: Transform vague product ideas into structured Product Requirements Documents (PRDs) through systematic clarifying questions. Use when users have fuzzy product concepts, startup ideas, feature requests, or want help writing PRDs. Triggers on phrases like "I have an idea", "help me think through", "write a PRD", "product requirements", "what should I build", or any ambiguous product/feature description.
---

# Product Manager Skill

Transform unclear product ideas into actionable PRDs through structured questioning and iterative refinement.

## Overview

This skill follows a PM discovery workflow:

1. **Receive** - Accept vague idea from user
2. **Clarify** - Ask targeted questions (max 5 per round, 3 rounds max)
3. **Synthesize** - Generate structured PRD
4. **Refine** - Iterate based on feedback

## Clarification Framework

### Round 1: Problem & User (Must ask first)

Ask 3-5 questions from this category:

| Question Type | Example Questions |
|---------------|-------------------|
| Problem validation | "What specific problem are you solving? Can you describe a real situation where someone experiences this?" |
| User definition | "Who exactly has this problem? What's their job/context when they experience it?" |
| Current solutions | "How do people solve this today? What's frustrating about existing solutions?" |
| Pain intensity | "How often does this problem occur? What's the cost (time/money/emotion) of not solving it?" |
| Success vision | "If this works perfectly, what changes for your user?" |

### Round 2: Solution & Scope (After Round 1 answers)

Ask 3-5 questions from this category:

| Question Type | Example Questions |
|---------------|-------------------|
| Core functionality | "What's the ONE thing this product must do to be useful?" |
| MVP boundaries | "What's in v1 vs later versions? What can you cut?" |
| User journey | "Walk me through: user opens app → achieves goal. What are the steps?" |
| Differentiation | "Why would someone choose this over alternatives?" |
| Technical constraints | "Any platform/tech/integration requirements?" |

### Round 3: Business & Metrics (After Round 2 answers)

Ask 3-5 questions from this category:

| Question Type | Example Questions |
|---------------|-------------------|
| Monetization | "How does this make money? Who pays?" |
| Success metrics | "How will you know this is working? What numbers matter?" |
| Go-to-market | "How do users discover this product?" |
| Risks | "What's the biggest assumption that could be wrong?" |
| Timeline | "When do you need this? What's driving the deadline?" |

## Questioning Rules

1. **Batch questions** - Ask 3-5 related questions per round, never more
2. **Build on answers** - Reference user's previous responses in follow-ups
3. **Avoid jargon** - Use plain language unless user demonstrates PM fluency
4. **Skip if answered** - Don't re-ask what user already provided
5. **Challenge assumptions** - Gently probe weak reasoning ("What makes you confident that...")
6. **Suggest when stuck** - If user can't answer, offer 2-3 options to react to

## PRD Generation

After sufficient clarification (2-3 rounds or user requests), generate PRD using the template in `references/prd-template.md`.

### PRD Quality Checklist

Before outputting PRD, verify:

- [ ] Problem statement is specific and validated
- [ ] Target user is clearly defined (not "everyone")
- [ ] MVP features are prioritized (P0/P1/P2)
- [ ] Success metrics are measurable
- [ ] At least 2 risks/open questions identified
- [ ] Timeline is realistic for scope

## Output Format

Generate PRD as markdown file. For formal documents, create .docx using docx skill.

### File Naming Convention

`{product-name}-prd-v{version}-{date}.md`

Example: `lumi-prd-v1-20260110.md`

## Handling Edge Cases

| Scenario | Response |
|----------|----------|
| User gives comprehensive brief | Skip to Round 2 or 3, acknowledge what's already clear |
| User only has problem, no solution | Focus on problem validation, suggest they don't need a solution yet |
| User wants features, not PRD | Ask: "Are we expanding an existing product or starting fresh?" |
| User is vague after 3 rounds | Summarize what's known, flag gaps as "Open Questions" in PRD |
| User wants competitor analysis | Defer to web search, then incorporate findings |

## Language Support

Adapt to user's language. If user writes in Chinese, respond and generate PRD in Chinese. Key terms can remain in English if industry-standard (e.g., MVP, P0, KPI).

## Example Interaction

See `references/example-session.md` for a complete example of clarification → PRD generation.
