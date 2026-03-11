package com.lumi.keyboard
import com.lumi.coredomain.contract.KeystrokeDynamicsPayload
import org.junit.Assert.assertTrue
import org.junit.Test

class OnDeviceTriageEngineTest {

    @Test
    fun highRiskIntent_forcesCloudHandoff() {
        val engine = OnDeviceTriageEngine(
            configOverride = """
            {
              "model_name": "lite-test",
              "cloud_handoff_threshold": 0.58,
              "high_risk_handoff_threshold": 0.72,
              "weights": {
                "bias": 0.05,
                "realtime_keyword": 0.2,
                "complex_keyword": 0.2,
                "high_risk_keyword": 0.5,
                "long_query": 0.05,
                "question_form": 0.02,
                "emotion_negative": 0.1,
                "emotion_positive": -0.04,
                "stress_proxy": 0.22
              },
              "keyword_sets": {
                "realtime": ["实时"],
                "complex": ["多agent"],
                "high_risk": ["支付", "转账"],
                "emotion_negative": ["烦"],
                "emotion_positive": ["开心"]
              }
            }
            """.trimIndent()
        )

        val decision = engine.evaluate(
            rawText = "帮我做支付授权并转账",
            sourceApp = "com.tencent.mm",
            passwordField = false,
            keystroke = KeystrokeDynamicsPayload(
                windowMs = 3000,
                keyCount = 20,
                backspaceCount = 5,
                avgInterKeyDelayMs = 120.0,
                pauseCount = 1,
                burstKpm = 250.0,
                stressProxy = 0.78
            )
        )

        assertTrue(decision.requiresCloud)
        assertTrue(decision.highRisk)
        assertTrue(decision.reasonCodes.contains("high_risk_intent"))
        assertTrue(decision.modelName.isNotBlank())
        assertTrue(decision.stateVector.l3.stressScore >= 70)
    }

    @Test
    fun passwordField_staysLocal() {
        val engine = OnDeviceTriageEngine()

        val decision = engine.evaluate(
            rawText = "帮我优化这句话",
            sourceApp = "com.android.mms",
            passwordField = true,
            keystroke = KeystrokeDynamicsPayload(windowMs = 2000, keyCount = 8)
        )

        assertTrue(!decision.requiresCloud)
        assertTrue(decision.reasonCodes.contains("password_field_local_only"))
    }
}
