# EPF-13 Collaboration Map and Identity Access Posture

Date: 2026-03-08
Owner: Codex
Status: Implemented

## Objective
Push the enterprise web platform closer to a real internal workspace by adding:
- a visible collaboration map
- a visible identity/access posture panel

## Scope
- web platform only
- additive shell layer
- no new runtime primitive
- no Android scope

## What shipped
- collaboration map on the shared workspace page
- identity/access posture panel on the tenant-admin page
- stronger role-to-role flow explanation for enterprise users

## Rules preserved
- `LOCAL_ROLE_LAB` remains non-pilot
- no synthetic artifact promotion
