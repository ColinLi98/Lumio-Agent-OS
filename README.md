<div align="center">

# Lumio

### B-end enterprise workspace platform

[![B-End Preview](https://img.shields.io/badge/B--End%20Preview-Lumio-blue?style=for-the-badge)](https://lumio-b-end-platform.vercel.app/?surface=platform&workspace_mode=local_lab&page=workspace&section=overview)
[![Release](https://img.shields.io/badge/Release-v0.2.7%20Beta-green?style=for-the-badge)](https://github.com/ColinLi98/Lumio-Agent-OS/releases/tag/v0.2.7-beta)

</div>

---

## What Lumio Is

Lumio is a governed B-end workspace platform for enterprise request, approval, operations, review, policy, readiness, and audit work.

It is packaged as one enterprise workspace shell instead of a collection of disconnected admin pages or demo-only flows.

## Primary Entry

[Open Lumio B-end preview](https://lumio-b-end-platform.vercel.app/?surface=platform&workspace_mode=local_lab&page=workspace&section=overview)

## Core Product Surface

- Workspace Overview
- Organization & Workspace
- Members & Access
- Trial Join
- Request Center
- Approval Center
- Review Center
- Operations Console
- Integration & Readiness Center
- Policy & Governance Center
- Audit & Reporting Center

## Who It Is For

- Enterprise requester teams
- Approval and review owners
- Operations teams
- Tenant and workspace admins
- Governance and audit stakeholders

## Product Boundaries

- B2B enterprise platform only
- Governed workspace shell only
- Okta OIDC is the current enterprise identity target in scope
- `local_lab` is a sandbox / preview workspace
- The current package does not claim full real-pilot closure
- The current package does not claim full production deployment completeness

## Key Documents

- [Commercial Package](./docs/B_End_Platform_Commercial_Package.md)
- [Admin Quick Start](./docs/B_End_Platform_Admin_Quick_Start.md)
- [Onboarding Guide](./docs/onboarding/onboarding-guide.md)
- [One-Pager](./docs/packaging/one-pager.md)
- [Packaging FAQ](./docs/packaging/faq.md)
- [Architecture and Governance](./docs/packaging/architecture-and-governance.md)

## Local Run

```bash
git clone https://github.com/ColinLi98/Lumio-Agent-OS.git
cd Lumio-Agent-OS
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:5173/?surface=platform&workspace_mode=local_lab&page=workspace&section=overview
```
