package com.lumi.keyboard.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.GateDecisionStatus
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.keyboard.ui.model.AppModule

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun UserInteractionHubCard(
    module: AppModule,
    response: AgentResponse?,
    latestUserRequest: String,
    loading: Boolean,
    onSubmitReply: (prompt: String, source: String) -> Unit
) {
    val clarificationQuestion = response?.clarificationQuestions?.firstOrNull()
    val unresolvedGate = response?.gateDecisions?.firstOrNull { it.decision != GateDecisionStatus.PASSED }
    val pendingQuestion = clarificationQuestion?.prompt.cleanInteractionPrompt()
        ?: unresolvedGate?.nextAction.cleanInteractionPrompt()
        ?: if (response?.status == ResponseStatus.WAITING_USER) {
            response.nextAction.cleanInteractionPrompt() ?: response.summary.cleanInteractionPrompt()
        } else {
            null
        }
    val pendingReason = clarificationQuestion?.reason.cleanInteractionPrompt()
        ?: unresolvedGate?.reason.cleanInteractionPrompt()
    val awaitingReply = pendingQuestion != null
    val replyLabel = if (awaitingReply) "Reply to continue" else "Optional update"
    val submitLabel = if (awaitingReply) "Reply and continue" else "Update context"
    var replyText by rememberSaveable(module.name, pendingQuestion.orEmpty()) { mutableStateOf("") }
    val canSubmit = !loading && replyText.trim().isNotBlank()
    val requestPreview = latestUserRequest.trim()

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1B3651)),
        modifier = Modifier.semantics { contentDescription = "Interaction Hub Card" }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = "Interaction Hub",
                color = Color(0xFFE8F4FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "Use one place to answer follow-up questions or add missing details.",
                color = Color(0xFFB9D9F2),
                fontSize = 10.sp
            )
            if (requestPreview.isNotBlank()) {
                Text(
                    text = "Current request: $requestPreview",
                    color = Color(0xFFCFE7FA),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (pendingQuestion != null) {
                Text(
                    text = "Agent asks: $pendingQuestion",
                    color = Color(0xFFFFE7B1),
                    fontSize = 10.sp,
                    modifier = Modifier.semantics { contentDescription = "Interaction Hub Pending Question" }
                )
                pendingReason?.let {
                    Text(
                        text = "Why needed: $it",
                        color = Color(0xFFF4D79E),
                        fontSize = 10.sp
                    )
                }
            }
            if (clarificationQuestion?.options?.isNotEmpty() == true) {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    clarificationQuestion.options.take(6).forEach { option ->
                        TextButton(
                            onClick = { replyText = option.value },
                            enabled = !loading
                        ) {
                            Text(option.label, fontSize = 10.sp)
                        }
                    }
                }
            }
            OutlinedTextField(
                value = replyText,
                onValueChange = { replyText = it },
                enabled = !loading,
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = "Interaction Hub Input" },
                label = { Text(replyLabel, fontSize = 11.sp) },
                placeholder = {
                    Text(
                        if (awaitingReply) "Answer the pending question..." else "Add constraints, corrections, or preferences...",
                        fontSize = 10.sp
                    )
                },
                minLines = 2
            )
            Button(
                onClick = {
                    val prompt = buildInteractionHubPrompt(
                        moduleLabel = module.label,
                        latestUserRequest = latestUserRequest,
                        pendingQuestion = pendingQuestion,
                        userReply = replyText,
                        awaitingReply = awaitingReply
                    )
                    val source = if (awaitingReply) "interaction_hub_pending_question" else "interaction_hub_context_update"
                    onSubmitReply(prompt, source)
                    replyText = ""
                },
                enabled = canSubmit,
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = "Interaction Hub Submit" }
            ) {
                Text(submitLabel, fontSize = 11.sp)
            }
        }
    }
}

internal fun buildInteractionHubPrompt(
    moduleLabel: String,
    latestUserRequest: String,
    pendingQuestion: String?,
    userReply: String,
    awaitingReply: Boolean
): String {
    val request = latestUserRequest.trim()
    val reply = userReply.trim()
    return buildString {
        if (awaitingReply && !pendingQuestion.isNullOrBlank()) {
            append("User response for pending question in module ").append(moduleLabel).append('.').append('\n')
            append("Pending question: ").append(pendingQuestion.trim()).append('\n')
            if (request.isNotBlank()) {
                append("Original request: ").append(request).append('\n')
            }
            append("User response: ").append(reply).append('\n')
            append("Continue execution with this response and return an executable next step.")
        } else {
            append("User context update for module ").append(moduleLabel).append('.').append('\n')
            if (request.isNotBlank()) {
                append("Original request: ").append(request).append('\n')
            }
            append("Update: ").append(reply).append('\n')
            append("Re-plan with this update and continue execution with evidence-backed actions.")
        }
    }
}

private fun String?.cleanInteractionPrompt(): String? {
    val value = this?.trim().orEmpty()
    if (value.isBlank()) return null
    if (value.equals("review_and_continue", ignoreCase = true)) return null
    return value
}
