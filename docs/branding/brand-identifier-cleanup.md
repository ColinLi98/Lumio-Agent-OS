# Lumio Brand / Identifier Cleanup

Date: 2026-03-11
Owner: Codex
Purpose: staged, low-risk cleanup plan for buyer-facing naming

## Goal

Present the product cleanly as Lumio on buyer-facing surfaces while preserving internal continuity and avoiding any preview-route or workflow instability.

## Cleanup policy

- external-facing first
- alias before hard cut
- preserve route, hostname, and package continuity
- do not let naming cleanup derail product capability work

## Short-Term Cleanup

Do now:

- browser/app titles
- visible product-shell labels
- README labels and headings
- rendered headings in buyer-facing docs
- opening framing in docs most likely to be shared externally

Keep unchanged:

- preview URLs
- deep links
- route params
- hostnames
- package ids
- env vars
- callback URLs
- internal scripts

## Mid-Term Cleanup

Do later, in a dedicated compatibility slice:

- add explicit alias notes for older `B_End_Platform_*` doc families
- reduce raw hostname visibility further in externally shared material
- unify older packaging/demo/onboarding docs around the newer `docs/field/` and `docs/branding/` entrypoints

## Long-Term Cleanup

Evaluate only if product work is stable and a migration slice is justified:

- preview hostname cleanup
- callback/base-URL cleanup
- package/repo/internal-id cleanup
- internal technical-identifier standardization

## Risk Notes

Risky surfaces:

- preview hostnames
- deep links
- route params
- callback URLs
- package ids
- env vars

Why they are deferred:

- changing them now would risk breaking preview behavior or internal workflows without adding product capability

## Rollback Notes

Safe rollback for this phase is revert-only on:

- visible branding strings
- rendered doc headings
- README labels
- non-operational buyer-facing copy

Avoid rollback-sensitive changes on:

- URLs
- routes
- hostnames
- package ids
- env vars

## Staged Checklist

### Short-term status

- buyer-facing exposure inventory: complete
- naming policy: complete
- safe buyer-facing cleanup: complete

### Mid-term next steps

- review older doc families for alias guidance
- reduce raw hostname visibility in shareable collateral

### Long-term next steps

- evaluate dedicated technical-id migration only if product priorities allow
