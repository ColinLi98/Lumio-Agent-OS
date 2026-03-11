# Phase 2 Governed Flow

Date: 2026-03-11

## Goal

Turn the existing nine-role enterprise preview into one coherent governed execution story across:

- Workspace Overview
- Request Center
- Approval Center
- Operations Console
- Review Center
- Audit & Reporting Center

The target chain is:

`Request -> Approval -> Operations -> Review -> Audit`

This phase keeps the existing OA v1 role model, shell structure, and routes. It does not add a separate workflow engine.

## Shared stage model

The governed-flow stage model now lives in [services/platformContract.ts](/Users/lili/Desktop/Agent%20OS/services/platformContract.ts).

Shared stage keys:

- `REQUEST`
- `APPROVAL`
- `OPERATIONS`
- `REVIEW`
- `AUDIT`

Each stage carries:

- owner role
- destination section
- status
  - `DONE`
  - `CURRENT`
  - `UPCOMING`
  - `BLOCKED`
- shared summary text

The stage model is derived from the existing trial-task handoff lines, raw task lifecycle, and role-tagged activity receipts. It does not introduce a new execution state store.

## What changed

### Overview

Workspace Overview now includes a role-aware cockpit via the shared governed-flow surface:

- current task stage
- next action for the active role
- who is waiting on whom
- current blocker / gate
- best next destination section
- shared request-to-audit stage rail
- shared timeline
- shared blocked-reason panel
- shared evidence / receipt continuity panel

### Shared task surface

A single shared governed-flow surface now appears across the chain:

- [components/GovernedFlowTaskPanel.tsx](/Users/lili/Desktop/Agent%20OS/components/GovernedFlowTaskPanel.tsx)

It is mounted in:

- [components/EnterprisePlatformView.tsx](/Users/lili/Desktop/Agent%20OS/components/EnterprisePlatformView.tsx)
  - Overview
  - Request Center
  - Approval Center
  - Operations Console
  - Review Center
  - Audit & Reporting Center
  - tenant-admin admin view for the same evidence lens

### Blocked-reason and handoff explanation

The shared panel now explains:

- blocked by
- blocked because
- category
  - `POLICY`
  - `ACCESS`
  - `READINESS`
  - `EVIDENCE`
- next section
- recommended action

### Evidence and receipt continuity

Reviewer, Auditor, and Tenant Admin now see the same underlying evidence set:

- same `taskId` / evidence-set identity
- same receipt summary
- same approval summary
- same evidence items
- same timeline receipts

Only the role-lens explanation changes by active `oa_role`.

## Route continuity

Cross-center links now reuse the normalized route helpers so task and role context survive section changes:

- selected task id
- focused member
- active `oa_role`
- invite context
- current page when allowed, otherwise workspace-page fallback

No preview routes were removed.

## Validation focus

Phase 2 added coverage for:

- shared stage mapping
- role-aware next action
- cross-center task continuity links
- blocked-reason line rendering
- evidence / receipt continuity

Files with focused tests:

- [tests/platformContract.test.ts](/Users/lili/Desktop/Agent%20OS/tests/platformContract.test.ts)
- [tests/components/GovernedFlowTaskPanel.test.ts](/Users/lili/Desktop/Agent%20OS/tests/components/GovernedFlowTaskPanel.test.ts)
- [tests/components/EnterprisePlatformView.test.ts](/Users/lili/Desktop/Agent%20OS/tests/components/EnterprisePlatformView.test.ts)
