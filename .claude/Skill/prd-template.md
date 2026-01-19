# PRD Template

Use this template structure when generating Product Requirements Documents. Adapt sections based on information gathered during clarification.

---

## Document Header

```markdown
# Product Requirements Document: {Product Name}

**Version:** {version}
**Date:** {date}
**Author:** {author}
**Status:** Draft | In Review | Approved
```

---

## Section 1: Overview

```markdown
## 1. Overview

### Product Name
{name}

### One-liner
{single sentence describing what this product does}

### Product Vision
{2-3 sentences describing the long-term vision and value proposition}
```

---

## Section 2: Problem Statement

```markdown
## 2. Problem Statement

### What problem are we solving?
{describe the core problem in specific terms}

### Who experiences this problem?
{describe the affected users and their context}

### How painful is it?
- **Frequency:** {how often does this occur}
- **Impact:** {time/money/emotional cost}
- **Current workarounds:** {how people cope today}

### Why now?
{market timing, technology enablers, or triggers}
```

---

## Section 3: Target Users

```markdown
## 3. Target Users

### Primary Persona: {persona name}
- **Who:** {demographic/role description}
- **Goal:** {what they want to achieve}
- **Context:** {when/where they experience the problem}
- **Pain points:** {specific frustrations}
- **Current behavior:** {how they solve it today}

### Secondary Persona (optional): {persona name}
{same structure as above}

### Anti-Personas (who this is NOT for)
- {description of users explicitly out of scope}
```

---

## Section 4: Solution

```markdown
## 4. Solution

### Product Description
{2-3 paragraphs describing what the product is and how it works}

### Key Value Propositions
1. {value prop 1}
2. {value prop 2}
3. {value prop 3}

### How it's Different
{comparison to alternatives and why users would switch}
```

---

## Section 5: Features (MVP)

```markdown
## 5. Core Features (MVP)

| Feature | Description | Priority | Notes |
|---------|-------------|----------|-------|
| {feature 1} | {what it does} | P0 | {constraints/dependencies} |
| {feature 2} | {what it does} | P0 | |
| {feature 3} | {what it does} | P1 | |
| {feature 4} | {what it does} | P2 | |

### Priority Definitions
- **P0:** Must have for launch. Product is unusable without it.
- **P1:** Should have. Important but can launch without.
- **P2:** Nice to have. Deferred to future versions.

### Out of Scope (v1)
- {feature explicitly not included}
- {feature explicitly not included}
```

---

## Section 6: User Flows

```markdown
## 6. User Flows

### Flow A: {primary user journey name}

1. User {action}
2. System {response}
3. User {action}
4. System {response}
5. Outcome: {what user achieves}

### Flow B: {secondary user journey name}
{same structure}

### Edge Cases
- **{edge case}:** {how system handles it}
```

---

## Section 7: Success Metrics

```markdown
## 7. Success Metrics

### North Star Metric
{the single most important metric}

### Key Performance Indicators

| Metric | Definition | Target | Measurement Method |
|--------|------------|--------|-------------------|
| {metric 1} | {how calculated} | {target value} | {how to measure} |
| {metric 2} | {how calculated} | {target value} | {how to measure} |

### Activation Metrics (Week 1)
- {early indicator of success}

### Retention Metrics (Month 1+)
- {longer-term indicator}
```

---

## Section 8: Technical Considerations

```markdown
## 8. Technical Considerations

### Platform
{web/mobile/desktop/API}

### Key Integrations
- {integration 1}: {purpose}
- {integration 2}: {purpose}

### Data & Privacy
- {what data is collected}
- {how data is stored}
- {privacy/compliance requirements}

### Technical Constraints
- {constraint 1}
- {constraint 2}
```

---

## Section 9: Timeline

```markdown
## 9. Timeline & Milestones

| Phase | Deliverable | Target Date |
|-------|-------------|-------------|
| Discovery | {output} | {date} |
| Design | {output} | {date} |
| MVP Development | {output} | {date} |
| Beta Testing | {output} | {date} |
| Launch | {output} | {date} |

### Dependencies
- {dependency 1}
- {dependency 2}
```

---

## Section 10: Risks & Open Questions

```markdown
## 10. Risks & Open Questions

### Key Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| {risk 1} | High/Med/Low | High/Med/Low | {mitigation strategy} |
| {risk 2} | High/Med/Low | High/Med/Low | {mitigation strategy} |

### Open Questions
1. {question that needs answering}
2. {question that needs answering}

### Assumptions to Validate
- {assumption 1}
- {assumption 2}
```

---

## Section 11: Appendix (Optional)

```markdown
## 11. Appendix

### Competitive Analysis
{if relevant, brief comparison}

### Research References
{links to user research, data sources}

### Wireframes/Mockups
{links or embedded images}
```

---

## Template Usage Notes

1. **Adapt sections** - Not all sections required for every PRD. Small features may skip user flows; internal tools may skip go-to-market.

2. **Fill what's known** - If information is incomplete, mark as "[TBD]" or "[Needs Research]" rather than guessing.

3. **Keep it actionable** - Every section should help the team build. Remove fluff.

4. **Version control** - Update version number with significant changes. Note what changed.

5. **Language** - Match user's language. Keep industry terms (MVP, P0, KPI) in English if standard.
