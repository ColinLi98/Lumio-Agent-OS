# Lumio Buyer-Facing Exposure Inventory

Date: 2026-03-11
Owner: Codex
Purpose: source-of-truth inventory for buyer-visible or buyer-adjacent naming exposures

## Inventory rules

- `must-fix now`: visible buyer-facing surfaces that should present cleanly as Lumio in this phase
- `safe-to-alias`: technical or compatibility surfaces that may remain during transition if the rendered/visible presentation is clean
- `defer`: technical identifiers that should not be renamed in this phase because they risk breaking preview behavior, deep links, or internal workflows

## Inventory

| Surface | Current string | User visibility | Audience | Category | Recommended action | Rollback note |
| --- | --- | --- | --- | --- | --- | --- |
| Browser tab title | `Lumio B-End Platform` | High | Buyer / evaluator | must-fix now | Rename visible title to `Lumio Enterprise Workspace Platform` | Revert title string only; no route impact |
| Branding helper subtitle | `B-End Platform` | High | Buyer / evaluator | must-fix now | Rename visible subtitle to `Enterprise Workspace Platform` | Revert helper string only |
| App header chip | `Enterprise Platform` / `Governed B-end workspace only` | High | Buyer / evaluator | must-fix now | Replace with `Enterprise Workspace Platform` / `Governed enterprise workspace preview` | Revert visible chip copy only |
| Top app banner | `B-end enterprise workspace platform` | High | Buyer / evaluator | must-fix now | Replace with Lumio-first enterprise workspace wording | Revert banner copy only |
| Workspace shell framing | `Current B-end foundation` / `governed B-end workflow` | High | Buyer / evaluator | must-fix now | Replace with Lumio-first platform wording | Revert visible shell copy only |
| Trial Join page copy | `standalone B-end invite-claim page` / `multi-user B-end evaluation` | High | Buyer / evaluator | must-fix now | Replace with Lumio / enterprise workspace wording | Revert trial-join copy only |
| README heading | `B-end enterprise workspace platform` | High | Buyer / evaluator | must-fix now | Replace rendered heading with `Enterprise workspace platform` | Revert heading only |
| README preview label | `B-End Preview` / `Open Lumio B-end preview` | High | Buyer / evaluator | must-fix now | Use clean Lumio preview labels while keeping real link target | Revert link label only |
| Buyer-facing doc headings | `B-End Platform ...` headings in externally shareable docs | High | Buyer / evaluator / field | must-fix now | Keep filenames, but rename rendered headings to Lumio-first names | Revert headings only; filenames remain stable |
| Packaging doc headings | generic or B-end-heavy headings | Medium | Buyer / field | must-fix now | Standardize rendered headings on Lumio-first naming | Revert doc heading copy only |
| Demo/onboarding/support headings | generic or B-end-heavy headings | Medium | Buyer / field / admin | must-fix now | Standardize rendered headings on Lumio-first naming | Revert doc heading copy only |
| Preview URLs in README/docs | `https://lumio-b-end-platform.vercel.app/...` | High but label-controlled | Buyer / evaluator | safe-to-alias | Keep working URLs, but show them behind clean link labels and avoid foregrounding hostnames in prose | Revert labels only; URLs remain unchanged |
| Technical doc filenames | `docs/B_End_Platform_*` | Medium | Field / internal sharing | safe-to-alias | Keep filenames for compatibility, but make rendered headings buyer-clean | Do not rename files in this phase |
| Public hostname | `lumio-b-end-platform.vercel.app` | High if pasted raw, but operationally sensitive | Buyer / evaluator / internal | defer | Preserve hostname now; clean surrounding labels only | Avoid hostname rename without dedicated migration |
| Package id | `lumio-b-end-platform` in `package.json` | Low | Internal / build tooling | defer | Leave unchanged in this phase | Package-id rollback is not needed if untouched |
| Internal technical identifier | `lumi-agent-simulator` in `.env.example` comments | Low | Internal | defer | Preserve for internal continuity; document as internal-only | Leave unchanged |
| Internal technical identifier | `lumi-agent-simulator` in `.codex/environments/environment.toml` | Low | Internal | defer | Preserve for local/tool continuity; not buyer-facing | Leave unchanged |
| Internal technical identifier | `Lumi Agent Simulator` hardcoded local paths in `scripts/html2pdf*.cjs` | Low | Internal | defer | Preserve until a dedicated script cleanup slice exists | Leave unchanged |
| API / callback / preview base URLs | `lumio-b-end-platform.vercel.app` in service defaults and callbacks | Low to medium | Internal / runtime | defer | Preserve until a staged host/callback migration exists | Leave unchanged |
| Internal user-agent strings | `lumi-agent-os/1.0` and preview host references | Low | Internal | defer | Preserve in this phase | Leave unchanged |
| Local storage export source | `Lumio B-End Platform` | Low to medium | Support / internal export readers | safe-to-alias | Can be cleaned later if export artifacts become buyer-shared; not a must-fix now | Revert export label only if later changed |

## Direct `lumi-agent-simulator` findings

The inventory pass found no direct `lumi-agent-simulator` exposure on current browser titles, visible app labels, README headings, or existing buyer-facing product-shell copy.

Direct hits are currently limited to internal or technical surfaces:

- `.env.example`
- `.codex/environments/environment.toml`
- local `scripts/html2pdf*.cjs` paths

These are intentionally deferred in this phase.

## Cleanup summary for this phase

### Must-fix now

- browser tab and branding helper strings
- visible app copy
- README labels and headings
- buyer-facing doc headings and opening framing

### Safe-to-alias

- preview URLs
- technical filenames
- compatibility-oriented doc paths

### Defer

- hostnames
- package ids
- internal technical identifiers
- env vars
- callback URLs
- local scripts
