package com.lumi.coreagent.policy

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SensitiveAppDetectorTest {

    private val detector = SensitiveAppDetector()

    @Test
    fun strictBlock_forBankingApp() {
        val decision = detector.detect("com.icbc", 0)
        assertFalse(decision.isAgentAllowed)
        assertTrue(decision.shieldIconVisible)
        assertTrue(decision.reason.contains("STRICT_BLOCK"))
    }

    @Test
    fun maskOnly_forEnterpriseApp() {
        val decision = detector.detect("com.tencent.wework", 0)
        assertTrue(decision.isAgentAllowed)
        assertTrue(decision.shieldIconVisible)
        assertTrue(decision.reason.contains("MASK_ONLY"))
    }

    @Test
    fun disableMemory_forIncognitoInput() {
        val decision = detector.detect(
            "com.example.app",
            SensitiveAppDetector.IME_FLAG_NO_PERSONALIZED_LEARNING
        )
        assertTrue(decision.isAgentAllowed)
        assertTrue(decision.shieldIconVisible)
        assertTrue(decision.reason.contains("DISABLE_MEMORY"))
    }
}
