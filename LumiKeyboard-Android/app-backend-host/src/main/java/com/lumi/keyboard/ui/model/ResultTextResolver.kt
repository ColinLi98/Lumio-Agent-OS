package com.lumi.keyboard.ui.model

import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.ModulePayload

private val genericDetailPhrases = setOf(
    "Queued",
    "Running",
    "Awaiting Confirmation",
    "Completed",
    "Partially Completed",
    "Request is being processed",
    "Task queued",
    "Chat supports draft management, evidence retrieval, and deep processing.",
    "Manage reply drafts and retrieve evidence in real time."
)

private val localizedFallbackRewrites = listOf(
    "未找到相关答案" to "No relevant answer was found. Returning an executable local plan.",
    "没有相关答案" to "No relevant answer was found. Returning an executable local plan.",
    "未找到答案" to "No relevant answer was found. Returning an executable local plan.",
    "暂无结果" to "No result is available yet. Returning an executable local plan.",
    "暂无可用结果" to "No result is available yet. Returning an executable local plan.",
    "已生成可执行解决方案：" to "Actionable solution generated:",
    "已生成可执行解决方案" to "Actionable solution generated",
    "已生成可执行旅行方案（先给可落地步骤，再持续补齐实时结果）：" to
        "Actionable travel plan generated (concrete steps first, then real-time refinement):",
    "- 核心问题：" to "- Core issue: ",
    "• 核心问题：" to "• Core issue: ",
    "核心问题：" to "Core issue: ",
    "- 推荐策略：" to "- Recommended strategy: ",
    "• 推荐策略：" to "• Recommended strategy: ",
    "推荐策略：" to "Recommended strategy: ",
    "- 下一步动作：" to "- Next action: ",
    "• 下一步动作：" to "• Next action: ",
    "下一步动作：" to "Next action: ",
    "先澄清目标与约束，再按优先级执行任务并回填证据。" to
        "Clarify goals and constraints first, then execute by priority and backfill evidence.",
    "先完成 1 个最小可行步骤，再并行拉取补充证据。" to
        "Complete one minimal viable step first, then gather supplementary evidence in parallel."
)

private const val unresolvedLocalizedLineFallback =
    "Localized source content detected. Structured English action steps are provided in this response."

data class StructuredPlanSection(
    val title: String,
    val items: List<String>
)

fun resolvePrimaryResultText(
    response: AgentResponse?,
    payloadOverride: ModulePayload.ChatPayload? = null
): String? {
    if (response == null && payloadOverride == null) return null

    val payload = payloadOverride ?: (response?.payload as? ModulePayload.ChatPayload)
    val summary = response?.summary.normalizeResultCandidate()
    if (summary != null) return summary

    val taskDetail = payload?.taskTrack?.steps
        ?.asReversed()
        ?.mapNotNull { it.detail.normalizeResultCandidate(filterGenericDetail = true) }
        ?.firstOrNull()
    if (taskDetail != null) return taskDetail

    val draft = response?.drafts
        ?.asSequence()
        ?.mapNotNull { it.text.normalizeResultCandidate() }
        ?.firstOrNull()
    if (draft != null) return draft

    val cardSummary = response?.cards
        ?.asSequence()
        ?.mapNotNull { it.summary.normalizeResultCandidate() }
        ?.firstOrNull()
    if (cardSummary != null) return cardSummary

    val evidenceSnippet = payload?.evidenceItems
        ?.asSequence()
        ?.mapNotNull { it.snippet.normalizeResultCandidate() }
        ?.firstOrNull()
    if (evidenceSnippet != null) return evidenceSnippet

    val cardComposite = response?.cards
        ?.mapNotNull { card ->
            val title = card.title.normalizeResultCandidate()
            val detail = card.summary.normalizeResultCandidate()
            when {
                title != null && detail != null -> "$title: $detail"
                detail != null -> detail
                else -> null
            }
        }
        ?.take(3)
        ?.joinToString("\n")
        ?.normalizeResultCandidate()
    if (cardComposite != null) return cardComposite

    return null
}

fun formatUserFacingResult(text: String?): String? {
    if (text.isNullOrBlank()) return null
    val normalized = decodeHtmlNewlines(text)
        .replace("\r\n", "\n")
        .lines()
        .mapNotNull { line ->
            val cleaned = sanitizeResultLine(line)
            cleaned?.takeIf { it.isNotBlank() }
        }
        .joinToString("\n")
        .replace(Regex("\n{3,}"), "\n\n")
        .trim()
    return normalized.takeIf { it.isNotBlank() }
}

fun extractStructuredPlanSections(
    text: String?,
    maxSections: Int = 5,
    maxItemsPerSection: Int = 5
): List<StructuredPlanSection> {
    if (text.isNullOrBlank()) return emptyList()
    val lines = decodeHtmlNewlines(text).replace("\r\n", "\n").lines()
    val buckets = linkedMapOf<String, MutableList<String>>()
    var currentHeading: String? = null

    lines.forEach { raw ->
        val trimmed = raw.trim()
        if (trimmed.isBlank()) return@forEach

        val localized = rewriteLocalizedFallback(trimmed).trim()
        val heading = parseHeading(localized)
        if (heading != null) {
            currentHeading = heading
            buckets.putIfAbsent(heading, mutableListOf())
            return@forEach
        }

        val cleaned = sanitizeResultLine(stripMarkdownPrefix(localized)) ?: return@forEach
        if (cleaned.length < 2) return@forEach
        val key = currentHeading ?: "Plan Summary"
        val list = buckets.getOrPut(key) { mutableListOf() }
        if (list.size < maxItemsPerSection && cleaned !in list) {
            list.add(cleaned)
        }
    }

    return buckets.entries
        .asSequence()
        .filter { it.value.isNotEmpty() }
        .take(maxSections)
        .map { StructuredPlanSection(title = it.key, items = it.value.toList()) }
        .toList()
}

fun buildResultHighlights(text: String?, maxItems: Int = 4): List<String> {
    val cleanedText = formatUserFacingResult(text) ?: return emptyList()
    val normalizedLines = cleanedText
        .replace("\r\n", "\n")
        .split('\n')
        .map { stripMarkdownPrefix(it.trim()) }
        .mapNotNull { it.normalizeResultCandidate() }
        .distinct()
    if (normalizedLines.isNotEmpty()) {
        return normalizedLines.take(maxItems)
    }

    return cleanedText
        .split('.', ';')
        .map { stripMarkdownPrefix(it.trim()) }
        .mapNotNull { it.normalizeResultCandidate() }
        .distinct()
        .take(maxItems)
}

private fun stripMarkdownPrefix(line: String): String {
    return line
        .replace(Regex("^#{1,6}\\s*"), "")
        .replace(Regex("^[-*•]\\s*"), "")
        .replace(Regex("^\\d+[.)、]\\s*"), "")
        .trim()
}

private fun decodeHtmlNewlines(text: String): String {
    return text
        .replace("&#10;", "\n")
        .replace("&amp;", "&")
}

private fun parseHeading(line: String): String? {
    val markdownHeading = Regex("^#{1,6}\\s*(.+)$").find(line)?.groupValues?.getOrNull(1)
    val colonHeading = Regex("^([^:：]{2,24})[:：]$").find(line)?.groupValues?.getOrNull(1)
    val bracketHeading = Regex("^[【\\[](.+)[】\\]]$").find(line)?.groupValues?.getOrNull(1)

    val candidate = markdownHeading ?: colonHeading ?: bracketHeading ?: return null
    val normalized = candidate
        .replace(Regex("\\s+"), " ")
        .replace(Regex("[()（）]"), "")
        .trim()
    if (normalized.length !in 2..24) return null
    if (normalized.contains("http", ignoreCase = true)) return null
    return normalized
}

private fun sanitizeResultLine(line: String): String? {
    val trimmed = rewriteLocalizedFallback(line.trim())
    if (trimmed.isBlank()) return null
    if (trimmed.contains("vertexaisearch.cloud.google.com/grounding-api-redirect", ignoreCase = true)) return null

    val markdownLinkNormalized = trimmed.replace(Regex("\\[([^\\]]+)]\\((https?://[^\\s)]+)\\)")) { match ->
        val label = match.groupValues[1].trim()
        val url = match.groupValues[2].trim()
        if (label.isBlank()) url else "$label ($url)"
    }
    val normalized = markdownLinkNormalized
        .replace(Regex("[\\t ]+"), " ")
        .replace(Regex("\\s*\\(\\s*\\)\\s*"), " ")
        .trim()

    if (normalized.isBlank()) return null
    return normalized
}

private fun rewriteLocalizedFallback(text: String): String {
    if (text.isBlank()) return text
    var rewritten = text
    localizedFallbackRewrites.forEach { (source, target) ->
        rewritten = rewritten.replace(source, target)
    }
    if (!containsHanScript(rewritten)) {
        return rewritten
    }
    return fallbackLocalizedLine(rewritten)
}

private fun containsHanScript(text: String): Boolean {
    return text.any { char ->
        Character.UnicodeScript.of(char.code) == Character.UnicodeScript.HAN
    }
}

private fun fallbackLocalizedLine(line: String): String {
    val normalized = line
        .replace('：', ':')
        .replace(Regex("[\\t ]+"), " ")
        .trim()

    val headingFallback = when {
        normalized.contains("Core issue", ignoreCase = true) -> {
            "Core issue: localized constraints from user context."
        }

        normalized.contains("Recommended strategy", ignoreCase = true) -> {
            "Recommended strategy: follow the verified executable steps below."
        }

        normalized.contains("Next action", ignoreCase = true) -> {
            "Next action: execute one reversible step and validate evidence."
        }

        else -> null
    }
    if (headingFallback != null) return headingFallback

    val distilled = normalized
        .replace(Regex("[\\p{IsHan}]"), "")
        .replace(Regex("[\\s\\p{Punct}]+"), " ")
        .trim()

    return if (distilled.any(Char::isLetterOrDigit)) {
        "Localized source detail: $distilled"
    } else {
        unresolvedLocalizedLineFallback
    }
}

private fun String?.normalizeResultCandidate(
    filterGenericDetail: Boolean = false
): String? {
    val cleaned = this
        ?.replace("\r\n", "\n")
        ?.lines()
        ?.joinToString("\n") { line ->
            rewriteLocalizedFallback(line.replace(Regex("[\\t ]+"), " ").trim())
        }
        ?.replace(Regex("\n{2,}"), "\n")
        ?.trim()
        ?.takeIf { it.isNotBlank() }
        ?: return null

    if (cleaned.length < 3) return null
    if (filterGenericDetail && genericDetailPhrases.any { cleaned == it }) return null
    return cleaned
}
