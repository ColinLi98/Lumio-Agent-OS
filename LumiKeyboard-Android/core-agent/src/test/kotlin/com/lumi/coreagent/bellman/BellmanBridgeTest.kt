package com.lumi.coreagent.bellman

import com.lumi.coreagent.soul.ColdStartAnswer
import com.lumi.coreagent.soul.InMemoryDigitalSoulStore
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Tests for BellmanBridge — the adapter that connects
 * InMemoryDigitalSoulStore → BellmanSolver → DestinyPayload.
 *
 * Scaffolded by OpenClaw (Opus 4.6), reviewed & corrected by Team Leader.
 */
class BellmanBridgeTest {

    private lateinit var soulStore: InMemoryDigitalSoulStore
    private lateinit var bridge: BellmanBridge
    private val testUser = "bridge-test-user"

    @BeforeTest
    fun setup() {
        soulStore = InMemoryDigitalSoulStore()
        // Bootstrap some traits so the bridge has data to work with
        soulStore.bootstrap(testUser, ColdStartAnswer("professional", "balanced", "moderate"))
        bridge = BellmanBridge(soulStore)
    }

    @Test
    fun `evaluate returns DestinyPayload with non-empty strategyLabel`() {
        val payload = bridge.evaluate(testUser, quick = true)

        assertTrue(payload.strategyLabel.isNotBlank(), "Strategy label should not be blank")
    }

    @Test
    fun `riskLevel is one of low medium high`() {
        val payload = bridge.evaluate(testUser, quick = true)
        val validLevels = setOf("low", "medium", "high")

        assertTrue(
            payload.riskLevel in validLevels,
            "Risk level '${payload.riskLevel}' should be one of $validLevels"
        )
    }

    @Test
    fun `routeSteps contain evaluation pipeline steps`() {
        val payload = bridge.evaluate(testUser, quick = true)

        assertNotNull(payload.routeSteps, "Route steps should not be null")
        assertTrue(
            payload.routeSteps.size >= 3,
            "Should have at least 3 route steps (analyze, evaluate, recommend)"
        )
    }

    @Test
    fun `nextSteps are populated from ranked actions`() {
        val payload = bridge.evaluate(testUser, quick = true)

        assertTrue(
            payload.nextSteps.isNotEmpty(),
            "Next steps should be populated from solver output"
        )
        // Verify each step has content
        payload.nextSteps.forEach { step ->
            assertTrue(step.isNotBlank(), "Each next step should have content")
        }
    }

    @Test
    fun `evidenceItems contain solver metadata`() {
        val payload = bridge.evaluate(testUser, quick = true)

        assertTrue(
            payload.evidenceItems.isNotEmpty(),
            "Evidence items should contain solver metadata"
        )

        val solverEvidence = payload.evidenceItems.firstOrNull { it.source == "Bellman Solver" }
        assertNotNull(solverEvidence, "Should have evidence from Bellman Solver")
    }

    @Test
    fun `deep strategy contract fields are populated`() {
        val payload = bridge.evaluate(testUser, quick = true)

        assertTrue(payload.nextBestAction.isNotBlank(), "nextBestAction should not be blank")
        assertTrue(payload.alternatives.isNotEmpty(), "alternatives should be available")
        assertTrue(payload.constraintNotes.isNotEmpty(), "constraintNotes should be available")
        assertTrue(payload.auditTrail.isNotEmpty(), "auditTrail should be available")
    }

    @Test
    fun `evaluate with empty user returns fallback payload`() {
        val emptyStore = InMemoryDigitalSoulStore()
        val emptyBridge = BellmanBridge(emptyStore)

        // Should not throw even with no bootstrapped traits
        val payload = emptyBridge.evaluate("unknown-user", quick = true)
        assertNotNull(payload)
        assertTrue(payload.strategyLabel.isNotBlank())
    }
}
