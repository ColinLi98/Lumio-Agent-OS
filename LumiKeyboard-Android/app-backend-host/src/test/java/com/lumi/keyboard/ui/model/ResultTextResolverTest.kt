package com.lumi.keyboard.ui.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ResultTextResolverTest {

    @Test
    fun formatUserFacingResult_rewritesLocalizedTemplateToEnglish() {
        val input = """
            已生成可执行解决方案：
            - 核心问题：暂无结果
            - 推荐策略：先完成 1 个最小可行步骤，再并行拉取补充证据。
            - 下一步动作：先澄清目标与约束，再按优先级执行任务并回填证据。
        """.trimIndent()

        val output = formatUserFacingResult(input)

        assertNotNull(output)
        val normalized = output.orEmpty()
        assertTrue(normalized.contains("Actionable solution generated:"))
        assertTrue(
            normalized.contains(
                "- Core issue: No result is available yet. Returning an executable local plan."
            )
        )
        assertTrue(
            normalized.contains(
                "- Recommended strategy: Complete one minimal viable step first, then gather supplementary evidence in parallel."
            )
        )
        assertTrue(
            normalized.contains(
                "- Next action: Clarify goals and constraints first, then execute by priority and backfill evidence."
            )
        )
        assertFalse(containsHanScript(normalized))
    }

    @Test
    fun formatUserFacingResult_unknownLocalizedLineFallsBackToDeterministicEnglish() {
        val output = formatUserFacingResult("请尽快联系供应商确认交付")

        assertEquals(
            "Localized source content detected. Structured English action steps are provided in this response.",
            output
        )
    }

    @Test
    fun extractStructuredPlanSections_localizedHeadingsAreMappedToEnglish() {
        val input = """
            核心问题：
            预算不足，暂无结果
            下一步动作：
            先完成 1 个最小可行步骤，再并行拉取补充证据。
        """.trimIndent()

        val sections = extractStructuredPlanSections(input)

        assertEquals(listOf("Core issue", "Next action"), sections.map { it.title })
        assertTrue(sections.flatMap { it.items }.isNotEmpty())
        assertFalse(sections.flatMap { it.items }.any(::containsHanScript))
    }

    private fun containsHanScript(text: String): Boolean {
        return text.any { char ->
            Character.UnicodeScript.of(char.code) == Character.UnicodeScript.HAN
        }
    }
}
