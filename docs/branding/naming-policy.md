# Lumio Naming Policy

Date: 2026-03-11
Owner: Codex
Purpose: define safe naming boundaries for external product presentation versus internal technical continuity

## 1. External product naming

Use these names on buyer-facing surfaces:

- `Lumio`
- `Lumio Enterprise Workspace Platform`
- `Lumio Trial Join`
- `governed enterprise workspace preview`
- `enterprise workspace platform`
- `governed flow`

Use these terms consistently with the existing product backbone:

- `OA v1 nine-role model`
- `current workspace`
- `local_lab`
- `readiness`
- `audit receipt`
- `evidence bundle`

## 2. Internal technical naming

The following may remain unchanged during transition:

- `lumio-b-end-platform`
- `lumi-agent-simulator`
- package names
- env var names
- callback URLs
- preview hostnames
- internal scripts and local filesystem paths
- technical filenames that are already shared internally

These are internal technical identifiers, not external product names.

## 3. Transitional alias policy

### Visible labels and headings

- Buyer-facing labels and rendered headings should be Lumio-first now.
- Do not surface `lumi-agent-simulator` in buyer-facing prose, titles, or prominent labels.

### URLs and hostnames

- Raw preview URLs may remain as working links.
- Raw hostnames should be hidden behind clean labels whenever possible.
- Do not change preview routes or deep links in this phase.

### Filenames and paths

- Filenames may remain technical during transition if the rendered heading is buyer-clean.
- Existing `B_End_Platform_*` filenames may remain for compatibility.

### Metadata and browser naming

- Browser-visible titles should use `Lumio Enterprise Workspace Platform`.
- Trial-join browser-visible titles should use `Lumio Trial Join`.

## 4. Prohibited actions in this phase

Do not do these in the current slice:

- repository-wide rename
- package-name migration
- hostname migration
- env-var rename
- callback URL rename
- path or route migration that could break deep links or preview behavior

## 5. Staged default

### Short-term

- clean buyer-facing labels
- clean browser titles
- clean rendered doc headings
- keep technical ids internal

### Mid-term

- add clearer alias conventions for older doc families
- reduce buyer-visible use of raw preview hostnames

### Long-term

- evaluate technical-id migration only under a dedicated, compatibility-aware rollout

## 6. Decision rule

If a surface is externally visible and non-operational, prefer Lumio naming now.

If a surface is operational, compatibility-sensitive, or internal-tooling-facing, preserve the technical name until a dedicated migration slice exists.
