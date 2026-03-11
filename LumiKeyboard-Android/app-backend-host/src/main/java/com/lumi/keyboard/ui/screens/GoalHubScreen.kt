package com.lumi.keyboard.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.keyboard.ui.components.SmartBriefComposer

data class GoalBriefInput(
    val goal: String,
    val budget: String,
    val deadline: String,
    val acceptanceCriteria: String,
    val confirmationToken: String
)

private data class InlineConstraintExtraction(
    val budget: String?,
    val deadline: String?,
    val acceptanceCriteria: String?,
    val confirmationToken: String?
)

private fun isConstraintSegment(text: String): Boolean {
    return Regex(
        """(?i)\b(?:budget|deadline|acceptance(?:\s+criteria)?|token|confirmation(?:[_\s-]*token)?|预算|时限|期限|验收标准|验收|确认令牌)\b"""
    ).containsMatchIn(text)
}

private fun extractGoalNarrative(goalText: String): String {
    val candidates = goalText
        .split(Regex("""[\n.!?;。！？]"""))
        .map { it.trim() }
        .filter { it.length >= 8 }
        .filterNot(::isConstraintSegment)
    return candidates.firstOrNull().orEmpty()
}

private fun normalizeConfirmationToken(raw: String): String {
    val match = Regex("""[A-Za-z0-9][A-Za-z0-9._-]{3,}""")
        .find(raw.trim())
        ?.value
    return (match ?: raw).trim().trim(' ', ';', ',', '.', ':')
}

private fun extractInlineConstraints(goalText: String): InlineConstraintExtraction {
    fun extract(pattern: String): String? {
        return Regex(pattern)
            .find(goalText)
            ?.groupValues
            ?.getOrNull(1)
            ?.trim()
            ?.trim(' ', ';', ',', '.', ':')
            ?.takeIf { it.isNotBlank() }
    }

    val budget = extract(
        """(?is)(?:budget|预算)\s*(?:[:：]|=)\s*(.+?)(?=(?:deadline|时限|期限|acceptance\s+criteria|acceptance|验收标准|验收|user[_\s-]*confirmation[_\s-]*token|confirmation[_\s-]*token|confirmation\s+token|confirm\s+token|确认令牌|token)\b|[;\n]|$)"""
    ) ?: extract(
        """(?is)(?:budget|预算)\s+(.+?)(?=(?:deadline|时限|期限|acceptance\s+criteria|acceptance|验收标准|验收|user[_\s-]*confirmation[_\s-]*token|confirmation[_\s-]*token|confirmation\s+token|confirm\s+token|确认令牌|token)\b|$)"""
    )

    val deadline = extract(
        """(?is)(?:deadline|时限|期限)\s*(?:[:：]|=)\s*(.+?)(?=(?:budget|预算|acceptance\s+criteria|acceptance|验收标准|验收|user[_\s-]*confirmation[_\s-]*token|confirmation[_\s-]*token|confirmation\s+token|confirm\s+token|确认令牌|token)\b|[;\n]|$)"""
    ) ?: extract(
        """(?is)(?:deadline|时限|期限)\s+(.+?)(?=(?:budget|预算|acceptance\s+criteria|acceptance|验收标准|验收|user[_\s-]*confirmation[_\s-]*token|confirmation[_\s-]*token|confirmation\s+token|confirm\s+token|确认令牌|token)\b|$)"""
    )

    val acceptanceCriteria = extract(
        """(?is)(?:acceptance\s+criteria|acceptance|验收标准|验收)\s*(?:[:：]|=)\s*(.+?)(?=(?:budget|预算|deadline|时限|期限|user[_\s-]*confirmation[_\s-]*token|confirmation[_\s-]*token|confirmation\s+token|confirm\s+token|确认令牌|token)\b|[;\n]|$)"""
    ) ?: extract(
        """(?is)(?:acceptance\s+criteria|acceptance|验收标准|验收)\s+(.+?)(?=(?:budget|预算|deadline|时限|期限|user[_\s-]*confirmation[_\s-]*token|confirmation[_\s-]*token|confirmation\s+token|confirm\s+token|确认令牌|token)\b|$)"""
    )

    val confirmationToken = extract(
        """(?is)(?:user[_\s-]*confirmation[_\s-]*token|confirmation[_\s-]*token|confirmation\s+token|confirm\s+token|确认令牌|token)\s*(?:[:：]|=)\s*(.+?)(?=(?:budget|预算|deadline|时限|期限|acceptance\s+criteria|acceptance|验收标准|验收)\b|[;\n]|$)"""
    ) ?: extract(
        """(?is)(?:user[_\s-]*confirmation[_\s-]*token|confirmation[_\s-]*token|confirmation\s+token|confirm\s+token|确认令牌|token)\s+(.+?)(?=(?:budget|预算|deadline|时限|期限|acceptance\s+criteria|acceptance|验收标准|验收)\b|$)"""
    )

    return InlineConstraintExtraction(
        budget = budget,
        deadline = deadline,
        acceptanceCriteria = acceptanceCriteria,
        confirmationToken = confirmationToken
    )
}

fun GoalBriefInput.toGoalPrompt(): String {
    val goalText = goal.trim()
    if (goalText.isBlank()) return ""
    val inline = extractInlineConstraints(goalText)
    val resolvedBudget = budget.trim().ifBlank { inline.budget.orEmpty() }
    val resolvedDeadline = deadline.trim().ifBlank { inline.deadline.orEmpty() }
    val resolvedAcceptance = acceptanceCriteria.trim().ifBlank { inline.acceptanceCriteria.orEmpty() }
    val resolvedToken = confirmationToken.trim().ifBlank { inline.confirmationToken.orEmpty() }
    val normalizedToken = resolvedToken.takeIf { it.isNotBlank() }?.let(::normalizeConfirmationToken).orEmpty()
    val goalNarrative = extractGoalNarrative(goalText).ifBlank { goalText }

    val lines = mutableListOf<String>()
    lines += goalNarrative
    if (resolvedBudget.isNotBlank()) lines += "Budget: $resolvedBudget"
    if (resolvedDeadline.isNotBlank()) lines += "Deadline: $resolvedDeadline"
    if (resolvedAcceptance.isNotBlank()) lines += "Acceptance criteria: $resolvedAcceptance"
    if (normalizedToken.isNotBlank()) lines += "Confirmation token: $normalizedToken"
    return lines.joinToString(separator = "\n").trim()
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GoalHubScreenContent(
    brief: GoalBriefInput,
    loading: Boolean,
    showAdvanced: Boolean,
    onBriefChange: (GoalBriefInput) -> Unit,
    onToggleAdvanced: () -> Unit,
    onRunPlan: () -> Unit
) {
    val capabilityTags = listOf(
        "Cross-app execution",
        "Cloud task decomposition",
        "Digital Twin personalization",
        "External Fulfillment network",
        "Legal outcome delivery"
    )
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF143058)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = "Lumi Agent OS · Goal Hub",
                    color = Color(0xFFE6F5FF),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Describe the outcome once. Lumi OS can coordinate across apps, agents, skills, and External Fulfillment to deliver a concrete result.",
                    color = Color(0xFFB8D6EE),
                    fontSize = 11.sp
                )
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    capabilityTags.forEach { tag ->
                        Text(
                            text = tag,
                            color = Color(0xFFBFE4FF),
                            fontSize = 10.sp,
                            modifier = Modifier
                                .background(Color(0x223FA9FF), RoundedCornerShape(20.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
                Text(
                    text = "Example intent: Budget £800, buy an iPhone. Lumi publishes to External Fulfillment, scouts suppliers/agents, compares offers, and returns executable actions.",
                    color = Color(0xFF99C7E6),
                    fontSize = 10.sp
                )
            }
        }
        SmartBriefComposer(
            goal = brief.goal,
            budget = brief.budget,
            deadline = brief.deadline,
            acceptanceCriteria = brief.acceptanceCriteria,
            confirmationToken = brief.confirmationToken,
            loading = loading,
            showAdvanced = showAdvanced,
            onGoalChange = { onBriefChange(brief.copy(goal = it)) },
            onBudgetChange = { onBriefChange(brief.copy(budget = it)) },
            onDeadlineChange = { onBriefChange(brief.copy(deadline = it)) },
            onAcceptanceChange = { onBriefChange(brief.copy(acceptanceCriteria = it)) },
            onTokenChange = { onBriefChange(brief.copy(confirmationToken = it)) },
            onToggleAdvanced = onToggleAdvanced,
            onApplyTemplate = { key ->
                val template = when (key) {
                    "travel" -> brief.copy(
                        goal = "Plan a one-week trip from London to Beijing with executable booking steps."
                    )

                    "hiring" -> brief.copy(
                        goal = "Hire one senior Android engineer with clear shortlist, interview plan, and offer strategy."
                    )

                    "shopping" -> brief.copy(
                        goal = "Buy an iPhone within budget £800. Return verified offers, payment terms, delivery ETA, and executable purchase links."
                    )

                    else -> brief
                }
                onBriefChange(template)
            },
            onRunPlan = onRunPlan
        )
    }
}
