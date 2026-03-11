<div align="center">

# Lumio B-End Platform

### Governed enterprise workspace platform for request, approval, operations, review, and audit

[![B-End Preview](https://img.shields.io/badge/B--End%20Preview-Lumio-blue?style=for-the-badge)](https://lumi-agent-simulator.vercel.app/?surface=platform&workspace_mode=local_lab&page=workspace&section=overview)
[![Version](https://img.shields.io/badge/Version-v0.2.7%20Beta-green?style=for-the-badge)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)]()
[![React](https://img.shields.io/badge/React-18.2-61dafb?style=for-the-badge&logo=react)]()

</div>

---

## What This Repository Ships

Lumio is a B-end enterprise workspace platform built for governed workflow execution.

The product is organized around one workspace shell that lets enterprise teams move the same task through request intake, approval, operations, review, readiness, policy, and audit without switching products or losing evidence context.

## Primary Entry

Primary preview route:

`https://lumi-agent-simulator.vercel.app/?surface=platform&workspace_mode=local_lab&page=workspace&section=overview`

Route contract:

- `surface=platform`
- `workspace_mode=local_lab`
- `page=workspace`
- `section=overview`
- role and member focus can be added through URL params during demos when needed

## Product Scope

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

## Product Framing

- B2B enterprise platform only
- Governed workspace shell, not a standalone IAM suite
- Role-aware workflow continuity over one shared task/evidence model
- Preview-safe posture with explicit sandbox boundaries
- Okta OIDC is the current enterprise login target in scope

## Current Foundation

- OA v1 nine-role model
- Role-aware workspace navigation and center-specific views
- Shared task detail continuity across request, approval, operations, review, and audit
- Membership, seat, invite, join, and access posture inside the same workspace shell
- Readiness, policy, and audit surfaces derived from the same workspace context

## Suggested Demo Path

1. Workspace Overview
2. Organization & Workspace
3. Members & Access
4. Approval Center
5. Review Center
6. Audit & Reporting Center
7. Integration & Readiness Center
8. Policy & Governance Center

## Quick Start

```bash
git clone https://github.com/ColinLi98/Lumio-Agent-OS.git
cd Lumio-Agent-OS
npm install
cp .env.example .env.local
npm run dev
```

Open the local B-end platform route:

```text
http://localhost:5173/?surface=platform&workspace_mode=local_lab&page=workspace&section=overview
```

## Key Documents

- [Commercial Package](./docs/B_End_Platform_Commercial_Package.md)
- [Admin Quick Start](./docs/B_End_Platform_Admin_Quick_Start.md)
- [Onboarding Guide](./docs/onboarding/onboarding-guide.md)
- [One-Pager](./docs/packaging/one-pager.md)
- [Packaging FAQ](./docs/packaging/faq.md)
- [Architecture and Governance](./docs/packaging/architecture-and-governance.md)
- [15-Min Demo](./docs/demo/demo-15-min.md)
- [30-Min Demo](./docs/demo/demo-30-min.md)

## Preview Constraints

- `local_lab` is a sandbox / preview workspace
- The current package does not claim full real-pilot closure
- The current package does not claim full production deployment completeness
- Provider breadth remains intentionally narrow in current enterprise packaging

## License

Proprietary - All Rights Reserved

---

<div align="center">

[B-End Preview](https://lumi-agent-simulator.vercel.app/?surface=platform&workspace_mode=local_lab&page=workspace&section=overview) · [Documentation](./docs/) · [Release](https://github.com/ColinLi98/Lumio-Agent-OS/releases/tag/v0.2.7-beta)

</div>
