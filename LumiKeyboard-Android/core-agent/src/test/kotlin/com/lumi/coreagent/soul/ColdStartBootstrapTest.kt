package com.lumi.coreagent.soul

import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

/**
 * Tests for cold-start questionnaire flow:
 * needsColdStart → bootstrap(answers) → traits populated → needsColdStart returns false.
 *
 * Scaffolded by OpenClaw (Opus 4.6), reviewed & corrected by Team Leader.
 */
class ColdStartBootstrapTest {

    private lateinit var store: InMemoryDigitalSoulStore
    private val testUser = "test-user-001"

    @BeforeTest
    fun setup() {
        store = InMemoryDigitalSoulStore()
    }

    @Test
    fun `needsColdStart returns true for new user`() {
        assertTrue(store.needsColdStart(testUser))
    }

    @Test
    fun `bootstrap with professional style populates traits`() {
        val answers = ColdStartAnswer(
            communicationStyle = "professional",
            riskTolerance = "conservative",
            privacyLevel = "strict"
        )

        store.bootstrap(testUser, answers)

        val traits = store.exportTraits(testUser)
        assertTrue(traits.isNotEmpty(), "Traits should be populated after bootstrap")
    }

    @Test
    fun `needsColdStart returns false after bootstrap`() {
        val answers = ColdStartAnswer(
            communicationStyle = "professional",
            riskTolerance = "conservative",
            privacyLevel = "strict"
        )

        store.bootstrap(testUser, answers)

        assertFalse(store.needsColdStart(testUser), "Should not need cold start after bootstrap")
    }

    @Test
    fun `different styles produce different trait values`() {
        val storeA = InMemoryDigitalSoulStore()
        storeA.bootstrap("userA", ColdStartAnswer("professional", "aggressive", "minimal"))

        val storeB = InMemoryDigitalSoulStore()
        storeB.bootstrap("userB", ColdStartAnswer("casual", "conservative", "strict"))

        val traitsA = storeA.exportTraits("userA").toMap()
        val traitsB = storeB.exportTraits("userB").toMap()

        // Professional vs casual should yield different communication trait values
        assertNotEquals(
            traitsA["communication"],
            traitsB["communication"],
            "Different communication styles should produce different trait scores"
        )
    }

    @Test
    fun `bootstrap trait values are within valid range 0 to 1`() {
        store.bootstrap(testUser, ColdStartAnswer("professional", "balanced", "moderate"))

        val traits = store.exportTraits(testUser)
        traits.forEach { (key, score) ->
            assertTrue(score in 0.0..1.0, "Trait '$key' score $score should be in [0, 1]")
        }
    }
}
