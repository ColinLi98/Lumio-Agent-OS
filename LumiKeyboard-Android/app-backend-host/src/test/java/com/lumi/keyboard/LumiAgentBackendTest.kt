package com.lumi.keyboard

import org.junit.Assert.assertTrue
import org.junit.Test

class LumiAgentBackendTest {

    @Test
    fun describeBackend_mentionsInternalService() {
        val summary = LumiAgent.describeBackend()
        assertTrue(summary.contains("App internal backend core"))
        assertTrue(summary.contains("Binder"))
    }
}
