package com.lumi.coreagent.orchestrator

import kotlin.test.Test
import kotlin.test.assertEquals

class IntentClassifierTest {

    @Test
    fun classify_travelIntent() {
        assertEquals(IntentType.TRAVEL, IntentClassifier.classify("帮我找机票和酒店"))
    }

    @Test
    fun classify_lixIntent() {
        assertEquals(IntentType.LIX, IntentClassifier.classify("帮我做一次谈判意图"))
    }

    @Test
    fun classify_agentMarketIntent() {
        assertEquals(IntentType.AGENT_MARKET, IntentClassifier.classify("agent marketplace 执行"))
    }

    @Test
    fun classify_generalIntent() {
        assertEquals(IntentType.GENERAL, IntentClassifier.classify("今天晚上回家"))
    }
}
