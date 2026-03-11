# Agent Kernel Pilot Deployment Baseline

Decision date: 2026-03-07
Scope: controlled enterprise pilot only

## Deployment model
- Vendor-managed single-tenant cloud deployment.
- One dedicated pilot tenant per deployment boundary.
- One staging environment and one production environment per pilot tenant.
- The pilot rollout stage is a controlled release ring on the production environment, not a separate shared control plane.

## Tenant isolation baseline
- Identity, admin, connector, and vault configuration are all expected to resolve to the same pilot tenant id.
- The pilot does not support shared multi-tenant data-plane operation.
- Workspace admin access remains scoped by durable enterprise bindings; tenant admin remains explicit and auditable.
- Any active enterprise principal, session, binding, or credential record outside the configured pilot tenant is treated as deployment drift and surfaced as `DEGRADED`.

## Environment boundaries
- `DEVELOPMENT`
  - Internal engineering only.
  - Local or synthetic data only.
  - Local-only or engineering-owned secrets only.
- `STAGING`
  - Tenant-specific pre-production validation.
  - Non-production tenant secrets only.
  - Manual promotion required before pilot release.
- `PILOT`
  - Controlled release stage on the dedicated production environment.
  - Real tenant production data allowed within the frozen pilot scope.
  - Manual promotion from staging and explicit operator oversight required.
- `PRODUCTION`
  - Full production operation after pilot sign-off.
  - Still single-tenant and vendor-managed.

## Region and residency baseline
- One primary region per pilot tenant.
- Staging is expected to stay in the same region family as production for the pilot.
- No multi-region active-active runtime.
- No automatic cross-region failover in the pilot baseline.
- Region failover, if required, is manual redeploy under operator control.
- Residency scope must be explicit for each pilot tenant before launch.

## Secret separation baseline
- HashiCorp Vault remains the only supported pilot secret backend.
- Secrets must be separated by dedicated deployment scope plus environment scope.
- This may be expressed through a dedicated Vault namespace, environment-specific paths, or both.
- Production-stage secrets must not be reused in development or staging.
- Secret material remains resolved at use time and is never persisted into durable task, compliance, or observability state.

## Minimum runtime config inputs
- `AGENT_KERNEL_DEPLOYMENT_STAGE`
- `AGENT_KERNEL_DEPLOYMENT_ENVIRONMENT`
- `AGENT_KERNEL_PRIMARY_REGION`
- `AGENT_KERNEL_STAGING_REGION`
- `AGENT_KERNEL_RESIDENCY_SCOPE`
- `AGENT_KERNEL_PILOT_TENANT_ID`
- existing frozen Okta and Vault webhook config inputs from Launch 05 and Launch 06

## Explicitly deferred beyond pilot
- Shared multi-tenant productization.
- Self-hosted, private-cloud, and hybrid deployment models.
- Multi-region active-active runtime and automated failover orchestration.
- Broad tenant/environment self-serve provisioning.
