# Example Session: Clarification → PRD

This example demonstrates the full workflow from vague idea to structured PRD.

---

## Initial User Input

**User:** 我想做一个帮助人找工作的app

*Translation: "I want to make an app that helps people find jobs"*

---

## Round 1: Problem & User Clarification

**Assistant:**

很高兴帮你把这个想法具体化！在我们开始之前，我想先了解一些关键问题：

1. **你想解决什么具体问题？** 找工作有很多痛点——是投递效率低？信息不对称？还是面试准备难？

2. **你的目标用户是谁？** 应届生、跳槽的职场人、还是特定行业（比如科技、金融）的求职者？

3. **现在人们怎么找工作？** 他们用什么工具？最让他们沮丧的是什么？

4. **这个问题有多痛？** 用户会为解决这个问题付费吗？大概愿意付多少？

---

**User Response:**

1. 主要是投递效率太低，每个公司都要重新写简历和cover letter
2. 在英国的留学生，找金融和科技工作
3. 他们用LinkedIn和各种招聘网站，但要反复填写相同信息
4. 很痛，而且有时间压力（签证）

---

## Round 2: Solution & Scope Clarification

**Assistant:**

非常清晰！针对英国留学生的求职痛点很有意义。让我再深入了解一下：

1. **核心功能是什么？** 如果app只能做一件事，应该是自动生成简历、匹配职位、还是跟踪申请进度？

2. **MVP包含什么？** 第一版必须有什么功能？什么可以放到后面做？

3. **用户流程是什么？** 用户打开app后，从开始到完成申请，大概是什么步骤？

4. **为什么选你？** 市面上有很多求职工具（LinkedIn、Indeed），你的产品有什么不同？

5. **有技术限制吗？** 平台偏好（web/app）、需要对接的API、数据来源？

---

**User Response:**

1. 核心是用AI自动生成针对每个职位的简历和cover letter
2. MVP: 上传简历 → AI分析 → 搜索职位 → 一键生成申请材料
3. 用户上传简历和作品集 → 系统建立profile → 用户点"找工作" → 系统返回匹配职位 → 用户选择 → 生成申请包
4. 专门针对留学生（签证过滤）、一键批量申请、AI个性化
5. Web优先，用Gemini API，从LinkedIn和Adzuna拿数据

---

## Round 3: Business & Metrics Clarification

**Assistant:**

产品方向很清晰了！最后几个问题帮助完善商业计划：

1. **怎么赚钱？** 免费+付费订阅？按申请次数收费？还是给企业收费？

2. **成功指标是什么？** 什么数据能证明产品有用？（申请数、面试率、用户留存？）

3. **用户怎么发现你？** 计划怎么获取第一批用户？

4. **最大风险是什么？** 什么假设如果错了，整个产品就不成立？

5. **时间表？** 什么时候需要上线？有什么deadline驱动？

---

**User Response:**

1. 免费版每次搜10个职位，Pro版100+，可能$15/月
2. 北极星指标是"面试率"（申请→面试的转化），还有周活、付费转化
3. 先从留学生社群开始，红书、小红书、学校career center
4. 最大风险是LinkedIn/公司网站可能限制自动申请
5. 1月24日demo，2月初Google AI Studio原型，3月MVP，4月正式上线

---

## Generated PRD

**Assistant:**

完美！我现在有足够信息来生成PRD了。

---

# Product Requirements Document: Lumi

**Version:** 1.0
**Date:** 2026-01-10
**Author:** Songyi Li
**Status:** Draft

---

## 1. Overview

### Product Name
Lumi

### One-liner
AI-powered career assistant that automates job discovery and application preparation for international students in the UK.

### Product Vision
A privacy-first digital twin that continuously learns a user's professional identity, then automates job discovery, tailored application generation, and professional networking—helping international students land interviews faster while navigating visa constraints.

---

## 2. Problem Statement

### What problem are we solving?
Modern job searching is fragmented and repetitive. International students must manually reformat CVs, write cover letters, and tailor applications for each role—consuming 10-30+ hours/week with low conversion rates.

### Who experiences this problem?
International students in the UK seeking Finance and Tech roles, particularly those on Tier 4 visas with time pressure to secure sponsored positions before visa expiration.

### How painful is it?
- **Frequency:** Daily during active job search (3-6 months)
- **Impact:** 10-30 hours/week; emotional toll from rejections; missed opportunities from slow iteration
- **Current workarounds:** Copy-pasting templates, ChatGPT prompts, manual spreadsheet tracking

### Why now?
- LLM capabilities now enable high-quality, personalized content generation at scale
- Remote work normalization increases job mobility expectations
- Competition for sponsored roles is intensifying post-Brexit

---

## 3. Target Users

### Primary Persona: "Wei Chen" — International Career Seeker
- **Who:** MSc student at UK university (Imperial, LSE, Oxbridge), 22-28 years old
- **Goal:** Secure sponsored graduate role in Finance/Tech before Tier 4 expires
- **Context:** Applying to 50+ positions while managing coursework and visa deadlines
- **Pain points:** 
  - Repetitive application tailoring
  - Uncertainty about visa sponsorship availability
  - Managing multiple platforms and threads
- **Current behavior:** Uses LinkedIn + Indeed + company sites; rewrites materials in ChatGPT; tracks in Notion

### Anti-Personas (who this is NOT for)
- UK citizens/permanent residents (no visa urgency)
- Senior professionals (different job search dynamics)
- Non-Finance/Tech seekers (different keyword/industry needs in v1)

---

## 4. Solution

### Product Description
Lumi creates a "Digital Twin" profile from the user's CV and work samples, then uses this profile to discover matching jobs from LinkedIn and Adzuna, filter by visa sponsorship, and generate tailored application materials (CV bullets, cover letter, ATS keywords) for each selected role.

### Key Value Propositions
1. **Visa-aware filtering** — Only shows jobs that sponsor Skilled Worker visas
2. **One-click application packs** — AI generates tailored CV + cover letter + keywords per job
3. **Batch efficiency** — Apply to 10-100+ jobs with consistent quality

### How it's Different
| Competitor | Lumi Advantage |
|------------|----------------|
| LinkedIn Jobs | Visa filtering + AI tailoring |
| ChatGPT manual | Integrated workflow + job discovery |
| Traditional ATS | User-controlled, privacy-first |

---

## 5. Core Features (MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| Account + Onboarding | Google OAuth, profile setup, consent settings | P0 |
| Digital Twin Builder | Upload CV → extract structured profile (skills, experience, preferences) | P0 |
| Job Discovery | One-click search from LinkedIn/Adzuna; Free: 10 jobs, Pro: 100+ | P0 |
| Job Ranking | Score breakdown (skills, visa, seniority fit) + risk flags | P0 |
| Application Pack Generator | Tailored CV bullets + cover letter + ATS keywords per job | P0 |
| Visa Filtering | Only show sponsorship-available roles | P0 |

### Out of Scope (v1)
- Room-based networking / community features
- Recruiter-side tools
- Mobile native apps
- Automated application submission

---

## 6. User Flows

### Flow A: New User → Profile → Job Discovery → Application

1. User signs up (Google OAuth)
2. User uploads CV + optional work samples
3. System creates Digital Twin profile
4. User clicks "Find Jobs"
5. System searches LinkedIn/Adzuna, filters by visa sponsorship
6. User sees ranked job list (10 for Free, 100+ for Pro)
7. User selects target jobs
8. System generates application pack per job
9. User downloads/copies materials
10. User applies externally

---

## 7. Success Metrics

### North Star Metric
**Interview Rate:** Interviews booked / applications submitted

### Key Performance Indicators

| Metric | Target (Month 1) | Target (Month 3) |
|--------|------------------|------------------|
| Profile completion rate | 60% | 75% |
| WAU/MAU ratio | 40% | 50% |
| Free → Pro conversion | 5% | 10% |
| Interview rate | 5% | 10% |

---

## 8. Technical Considerations

### Platform
Web-first (responsive)

### Key Integrations
- **Gemini API:** Profile extraction, application generation
- **LinkedIn/Adzuna:** Job data sources
- **Google OAuth:** Authentication

### Data & Privacy
- Store structured profile in encrypted DB
- Documents in encrypted object storage
- Redact sensitive info (ID, addresses) before persistence
- GDPR compliant: deletion on request

---

## 9. Timeline & Milestones

| Phase | Deliverable | Target Date |
|-------|-------------|-------------|
| Demo | Clickable prototype + sample job run | Jan 24, 2026 |
| AI Studio Prototype | System prompt + function calling | Feb 7, 2026 |
| MVP | Full web app with core features | Mar 7, 2026 |
| Beta | User testing + iteration | Apr 4, 2026 |
| Launch | Public release + Pro tier | May 2, 2026 |

---

## 10. Risks & Open Questions

### Key Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LinkedIn/company ToS blocks automation | High | High | Use "assisted apply" (autofill + confirm) not auto-submit |
| Low job data quality from APIs | Medium | Medium | Cross-reference sources; flag uncertain data |
| AI hallucination in cover letters | Medium | High | Human review step; grounded generation |

### Open Questions
1. What's the minimum viable recruiter verification for job postings?
2. How to handle jobs that don't clearly state sponsorship status?

### Assumptions to Validate
- Users trust AI-generated cover letters enough to use them
- 10 jobs/run is enough value for free tier to drive activation

---

*End of PRD*
