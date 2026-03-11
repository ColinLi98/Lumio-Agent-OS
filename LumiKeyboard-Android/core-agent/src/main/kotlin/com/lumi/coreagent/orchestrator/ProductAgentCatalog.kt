package com.lumi.coreagent.orchestrator

import com.lumi.coredomain.contract.AgentCard
import com.lumi.coredomain.contract.AgentAuthority
import com.lumi.coredomain.contract.AgentPhase
import com.lumi.coredomain.contract.AgentRole
import com.lumi.coredomain.contract.LumiRoutes

internal data class ProductAgentBlueprint(
    val role: AgentRole,
    val name: String,
    val responsibility: String,
    val activationPhase: AgentPhase,
    val activationTrigger: String,
    val runtime: String,
    val stage: String,
    val authority: AgentAuthority,
    val permissionScope: List<String>,
    val approvalRule: String,
    val forbiddenOps: String
)

internal data class ProductAgentConstructionStatus(
    val role: AgentRole,
    val name: String,
    val status: String,
    val activationPhase: AgentPhase,
    val authority: AgentAuthority,
    val approvalRule: String
)

internal object ProductAgentCatalog {

    fun all(): List<ProductAgentBlueprint> = listOf(
        ProductAgentBlueprint(
            role = AgentRole.EDGE_DIGITAL_TWIN_BUILDER,
            name = "Edge Digital Twin Builder",
            responsibility = "Build and refresh the user digital twin locally on device.",
            activationPhase = AgentPhase.INTAKE,
            activationTrigger = "Starts before cloud orchestration when profile/state context is required.",
            runtime = "edge",
            stage = "live",
            authority = AgentAuthority.READ_TWIN_LOCAL,
            permissionScope = listOf("read_local_state", "write_twin_traits", "score_preference_signals"),
            approvalRule = "No explicit approval for local updates; cloud sync follows privacy settings.",
            forbiddenOps = "Cannot publish market intents or execute supplier transactions."
        ),
        ProductAgentBlueprint(
            role = AgentRole.CODEX_TEAM_LEADER,
            name = "Codex Team Leader",
            responsibility = "Reason over complex requests, decompose tasks, and orchestrate agent collaboration.",
            activationPhase = AgentPhase.PLAN,
            activationTrigger = "Starts when complexity/risk/dependency crosses multi-agent threshold.",
            runtime = "cloud",
            stage = "live",
            authority = AgentAuthority.LEADER_COORDINATION,
            permissionScope = listOf("create_task_graph", "assign_sub_agents", "set_validation_criteria"),
            approvalRule = "No direct spending authority; must route market actions through LIX publisher.",
            forbiddenOps = "Cannot finalize supplier purchase or override user constraints."
        ),
        ProductAgentBlueprint(
            role = AgentRole.REQUIREMENT_CLARIFIER,
            name = "Requirement Clarifier",
            responsibility = "Collect missing budget, deadline, and acceptance criteria before execution.",
            activationPhase = AgentPhase.CLARIFY,
            activationTrigger = "Starts when request constraints are incomplete.",
            runtime = "cloud",
            stage = "live",
            authority = AgentAuthority.CLARIFY_ONLY,
            permissionScope = listOf("ask_structured_questions", "normalize_constraints", "set_waiting_user_status"),
            approvalRule = "No external execution until required constraints are complete.",
            forbiddenOps = "Cannot execute tools, publish market demands, or modify user intent."
        ),
        ProductAgentBlueprint(
            role = AgentRole.TASK_PLANNER,
            name = "Task Planner",
            responsibility = "Build task DAG with dependencies, parallel groups, and delivery checkpoints.",
            activationPhase = AgentPhase.PLAN,
            activationTrigger = "Starts after constraints pass the clarifier gate.",
            runtime = "cloud",
            stage = "live",
            authority = AgentAuthority.PLAN_ONLY,
            permissionScope = listOf("build_dag", "set_phase_handoffs", "attach_acceptance_tests"),
            approvalRule = "Planning only; cannot execute or spend.",
            forbiddenOps = "Cannot route to suppliers directly."
        ),
        ProductAgentBlueprint(
            role = AgentRole.OPENCLAW_ORCHESTRATOR,
            name = "OpenClaw Orchestrator",
            responsibility = "Coordinate OpenClaw sub-agents and execution flow for complex tasks.",
            activationPhase = AgentPhase.EXECUTE,
            activationTrigger = "Starts after task graph is approved for OpenClaw execution.",
            runtime = "cloud",
            stage = "live",
            authority = AgentAuthority.EXECUTION_ORCHESTRATION,
            permissionScope = listOf("dispatch_sub_tasks", "collect_evidence", "aggregate_intermediate_results"),
            approvalRule = "May execute technical tasks directly; escalation with budget requires user input.",
            forbiddenOps = "Cannot bypass budget gate for supplier escalation."
        ),
        ProductAgentBlueprint(
            role = AgentRole.SUB_AGENT_ROUTER,
            name = "Sub-Agent Router",
            responsibility = "Route decomposed tasks to the best sub-agent and capability set.",
            activationPhase = AgentPhase.EXECUTE,
            activationTrigger = "Runs for each decomposed task before execution dispatch.",
            runtime = "cloud",
            stage = "live",
            authority = AgentAuthority.ROUTING_ONLY,
            permissionScope = listOf("rank_sub_agents", "map_capabilities", "fallback_route_selection"),
            approvalRule = "No user approval required; this is internal routing.",
            forbiddenOps = "Cannot change user requirements or publish external demand."
        ),
        ProductAgentBlueprint(
            role = AgentRole.SKILL_EXECUTION_AGENT,
            name = "Skill Execution Agent",
            responsibility = "Invoke concrete skills/tools and return verifiable execution outputs.",
            activationPhase = AgentPhase.EXECUTE,
            activationTrigger = "Runs when a task node requires concrete skill/tool invocation.",
            runtime = "hybrid",
            stage = "live",
            authority = AgentAuthority.TOOL_EXECUTION_WHITELIST,
            permissionScope = listOf("invoke_registered_skills", "capture_output_artifacts", "attach_evidence_links"),
            approvalRule = "May call pre-approved tools; high-risk actions require explicit confirmation.",
            forbiddenOps = "Cannot execute unregistered destructive commands."
        ),
        ProductAgentBlueprint(
            role = AgentRole.SOLUTION_VALIDATION_AGENT,
            name = "Solution Validation Agent",
            responsibility = "Validate execution outputs against acceptance criteria with evidence checks.",
            activationPhase = AgentPhase.VERIFY,
            activationTrigger = "Runs after each execution batch and before final delivery.",
            runtime = "hybrid",
            stage = "live",
            authority = AgentAuthority.VALIDATION_VETO,
            permissionScope = listOf("check_evidence_integrity", "evaluate_acceptance_criteria", "reject_unverified_output"),
            approvalRule = "Can veto low-confidence or unverified results.",
            forbiddenOps = "Cannot mark SUCCESS without evidence."
        ),
        ProductAgentBlueprint(
            role = AgentRole.COMPLIANCE_GUARD,
            name = "Compliance Guard",
            responsibility = "Run policy and risk checks before external actions and before final delivery.",
            activationPhase = AgentPhase.VERIFY,
            activationTrigger = "Runs before supplier contracts, payouts, and delivery.",
            runtime = "cloud",
            stage = "live",
            authority = AgentAuthority.COMPLIANCE_BLOCK,
            permissionScope = listOf("policy_scan", "high_risk_block", "delivery_risk_gate"),
            approvalRule = "Can block execution paths that violate policy.",
            forbiddenOps = "Cannot rewrite requirements to bypass policy."
        ),
        ProductAgentBlueprint(
            role = AgentRole.BUDGET_GATEKEEPER,
            name = "Budget Gatekeeper",
            responsibility = "Enforce budget and user confirmation token before any external spend.",
            activationPhase = AgentPhase.ESCALATE,
            activationTrigger = "Runs before LIX publish, supplier acceptance, and any paid action.",
            runtime = "cloud",
            stage = "live",
            authority = AgentAuthority.BUDGET_ENFORCEMENT,
            permissionScope = listOf("check_budget_presence", "check_budget_range", "require_user_confirmation_token"),
            approvalRule = "Missing budget/token must return WAITING_USER.",
            forbiddenOps = "Cannot auto-confirm spending."
        ),
        ProductAgentBlueprint(
            role = AgentRole.LIX_DEMAND_PUBLISHER,
            name = "LIX Demand Publisher",
            responsibility = "Publish unmet requirements with budget and constraints to LIX market.",
            activationPhase = AgentPhase.ESCALATE,
            activationTrigger = "Starts only when local/cloud execution cannot produce validated solution.",
            runtime = "cloud",
            stage = "live",
            authority = AgentAuthority.MARKET_PUBLISH,
            permissionScope = listOf("publish_intent", "set_budget_deadline", "open_supplier_broadcast"),
            approvalRule = "Requires explicit budget and constraints from user.",
            forbiddenOps = "Cannot publish with empty budget or hidden constraints."
        ),
        ProductAgentBlueprint(
            role = AgentRole.SUPPLIER_SCOUT,
            name = "Lumio Supplier Scout",
            responsibility = "Discover candidate suppliers and supplier-agents for the user need.",
            activationPhase = AgentPhase.ESCALATE,
            activationTrigger = "Starts after LIX demand publication succeeds.",
            runtime = "cloud",
            stage = "live",
            authority = AgentAuthority.SUPPLIER_DISCOVERY,
            permissionScope = listOf("query_supplier_offers", "rank_by_fit_score", "filter_by_budget_range"),
            approvalRule = "No user approval for ranking; acceptance still requires explicit confirmation.",
            forbiddenOps = "Cannot accept offer automatically."
        ),
        ProductAgentBlueprint(
            role = AgentRole.SUPPLIER_NEGOTIATOR,
            name = "Lumio Supplier Negotiator",
            responsibility = "Negotiate constraints with supplier agents to improve personalization fit.",
            activationPhase = AgentPhase.ESCALATE,
            activationTrigger = "Starts when no supplier passes initial digital-twin validation.",
            runtime = "cloud",
            stage = "live",
            authority = AgentAuthority.SUPPLIER_NEGOTIATION_BOUNDED,
            permissionScope = listOf("propose_constraint_adjustment", "request_requote", "collect_counter_offer"),
            approvalRule = "Cannot widen budget/scope beyond user-provided limits without confirmation.",
            forbiddenOps = "Cannot commit to final deal."
        ),
        ProductAgentBlueprint(
            role = AgentRole.DELIVERY_QUALITY_GUARD,
            name = "Delivery Quality Guard",
            responsibility = "Run final acceptance checks and quality/risk gates before user delivery.",
            activationPhase = AgentPhase.FINAL_GATE,
            activationTrigger = "Runs after a supplier solution is selected and before user-facing delivery.",
            runtime = "cloud",
            stage = "live",
            authority = AgentAuthority.DELIVERY_GATE,
            permissionScope = listOf("quality_check", "risk_check", "delivery_block_or_release"),
            approvalRule = "Can block unsafe delivery; release requires final consistency pass.",
            forbiddenOps = "Cannot alter original user requirements."
        ),
        ProductAgentBlueprint(
            role = AgentRole.OUTCOME_AUDITOR,
            name = "Outcome Auditor",
            responsibility = "Independently audit final outputs for claim/evidence consistency and return-contract compliance.",
            activationPhase = AgentPhase.FINAL_GATE,
            activationTrigger = "Runs after delivery-quality gate and before final user delivery.",
            runtime = "cloud",
            stage = "live",
            authority = AgentAuthority.INDEPENDENT_AUDIT,
            permissionScope = listOf("audit_claim_vs_evidence", "audit_required_links", "request_rework"),
            approvalRule = "Can request rework when required links/evidence are missing or inconsistent.",
            forbiddenOps = "Cannot execute external actions or override user constraints."
        )
    )

    fun governanceCards(limit: Int = 8): List<AgentCard> {
        return all().take(limit).map { agent ->
            val permissionsPreview = agent.permissionScope.take(3).joinToString(",")
            AgentCard(
                id = "product-agent-${agent.role.idKey()}",
                title = agent.name,
                summary = "resp=${agent.responsibility} · phase=${agent.activationPhase.name.lowercase()} · trigger=${agent.activationTrigger} · authority=${agent.authority.name.lowercase()} · perms=$permissionsPreview · approval=${agent.approvalRule} · forbidden=${agent.forbiddenOps}",
                deeplink = LumiRoutes.AGENT_MARKET
            )
        }
    }

    fun constructionStatus(): List<ProductAgentConstructionStatus> {
        return all().map { agent ->
            ProductAgentConstructionStatus(
                role = agent.role,
                name = agent.name,
                status = if (agent.stage.equals("planned", ignoreCase = true)) "scaffold" else "constructed",
                activationPhase = agent.activationPhase,
                authority = agent.authority,
                approvalRule = agent.approvalRule
            )
        }
    }

    fun constructionCards(limit: Int = 8): List<AgentCard> {
        return constructionStatus().take(limit).map { status ->
            AgentCard(
                id = "product-agent-build-${status.role.idKey()}",
                title = status.name,
                summary = "status=${status.status} · phase=${status.activationPhase.name.lowercase()} · authority=${status.authority.name.lowercase()} · approval=${status.approvalRule}",
                deeplink = LumiRoutes.AGENT_MARKET
            )
        }
    }

    private fun AgentRole.idKey(): String {
        return when (this) {
            AgentRole.EDGE_DIGITAL_TWIN_BUILDER -> "edge-digital-twin-builder"
            AgentRole.CODEX_TEAM_LEADER -> "codex-team-leader"
            AgentRole.REQUIREMENT_CLARIFIER -> "requirement-clarifier"
            AgentRole.TASK_PLANNER -> "task-planner"
            AgentRole.OPENCLAW_ORCHESTRATOR -> "openclaw-orchestrator"
            AgentRole.SUB_AGENT_ROUTER -> "openclaw-subagent-router"
            AgentRole.SKILL_EXECUTION_AGENT -> "skill-execution-agent"
            AgentRole.SOLUTION_VALIDATION_AGENT -> "solution-validation-agent"
            AgentRole.COMPLIANCE_GUARD -> "compliance-guard"
            AgentRole.BUDGET_GATEKEEPER -> "budget-gatekeeper"
            AgentRole.LIX_DEMAND_PUBLISHER -> "lix-demand-publisher"
            AgentRole.SUPPLIER_SCOUT -> "lumio-supplier-scout"
            AgentRole.SUPPLIER_NEGOTIATOR -> "lumio-supplier-negotiator"
            AgentRole.DELIVERY_QUALITY_GUARD -> "delivery-quality-guard"
            AgentRole.OUTCOME_AUDITOR -> "outcome-auditor"
        }
    }
}
