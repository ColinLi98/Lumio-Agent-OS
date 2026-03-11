package com.lumi.keyboard

import android.content.Context
import android.content.Intent
import android.inputmethodservice.InputMethodService
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.text.InputType
import android.util.Log
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.AgentResponseType
import com.lumi.coredomain.contract.InteractionEvent
import com.lumi.coredomain.contract.InteractionEventType
import com.lumi.coredomain.contract.LumiRoutes
import com.lumi.coredomain.contract.ModuleId
import com.lumi.coredomain.contract.NetworkPolicy
import com.lumi.coreagent.orchestrator.IntentClassifier
import java.util.Locale
import java.util.UUID

/**
 * Lumi Input Method Editor - thin frontend.
 *
 * IME only handles keyboard interaction and delegates complex logic
 * to App internal backend service through Binder bridge.
 */
class LumiIME : InputMethodService() {

    companion object {
        private const val TAG = "LumiIME"
        private const val DEFAULT_USER_ID = "local-user"
        private const val DEFAULT_INTENT_ID = "latest"
    }

    private var keyboardView: LumiKeyboardView? = null
    private var isAgentMode = false
    private var agentPinyinBuffer = StringBuilder()
    private var vibrator: Vibrator? = null
    private lateinit var chineseLexiconEngine: ChineseLexiconEngine
    private lateinit var backendClient: BackendClient
    private lateinit var keystrokeCollector: KeystrokeDynamicsCollector
    private lateinit var onDeviceTriageEngine: OnDeviceTriageEngine

    // Current input state
    private var currentInput = StringBuilder()
    private var isShiftPressed = false
    private var isNumberMode = false
    private var currentLanguage = "EN"
    private var currentPinyinBuffer = StringBuilder()
    private var currentSessionId: String = UUID.randomUUID().toString()
    private var lastCloudRequestId: String? = null
    private var pendingBackflowResponse: AgentResponse? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "LumiIME onCreate")
        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        chineseLexiconEngine = ChineseLexiconEngine(applicationContext)
        backendClient = BackendClient(applicationContext)
        keystrokeCollector = KeystrokeDynamicsCollector()
        onDeviceTriageEngine = OnDeviceTriageEngine(applicationContext)
        backendClient.connect()
    }

    override fun onDestroy() {
        super.onDestroy()
        backendClient.disconnect()
    }

    override fun onCreateInputView(): View {
        Log.d(TAG, "LumiIME onCreateInputView")
        keyboardView = LumiKeyboardView(this).apply {
            onKeyPress = { key -> handleKeyPress(key) }
            onLongPressSpace = { enterAgentMode() }
            onAgentSubmit = { text -> handleAgentSubmit(text) }
            onLanguageChanged = { language ->
                currentLanguage = language
                if (!isChineseMode()) {
                    clearChineseComposition()
                }
            }
            onChineseCandidateSelected = { candidate ->
                if (isAgentMode) {
                    commitAgentChineseCandidate(candidate)
                } else {
                    commitChineseCandidate(candidate)
                }
            }
            onOpenSourceChineseIme = {
                switchToOpenSourceChineseIme()
            }
            onOpenAppDeeplink = { deeplink ->
                openAppDeeplink(deeplink)
            }
            onAgentModeToggle = {
                if (isAgentMode) exitAgentMode() else enterAgentMode()
            }
            onQuickActionSelected = { prefix ->
                handleQuickAction(prefix)
            }
        }
        return keyboardView!!
    }

    override fun onStartInput(attribute: EditorInfo?, restarting: Boolean) {
        super.onStartInput(attribute, restarting)
        Log.d(TAG, "LumiIME onStartInput")
        currentInput.clear()
        clearChineseComposition()
        currentSessionId = UUID.randomUUID().toString()
        isAgentMode = false
        keystrokeCollector.reset()
        keyboardView?.setAgentMode(false)
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        Log.d(TAG, "LumiIME onStartInputView")
        recoverBackflowResult()
    }

    private fun handleKeyPress(key: String) {
        vibrateKey()
        keystrokeCollector.recordKey(key)

        if (isAgentMode) {
            handleAgentKeyPress(key)
        } else {
            handleTypingKeyPress(key)
        }
    }

    private fun handleTypingKeyPress(key: String) {
        when (key) {
            "SHIFT" -> {
                isShiftPressed = !isShiftPressed
                keyboardView?.setShiftState(isShiftPressed)
            }

            "DELETE" -> {
                if (handleChineseDelete()) return
                currentInputConnection?.deleteSurroundingText(1, 0)
            }

            "ENTER" -> {
                if (commitChineseCompositionIfNeeded()) return
                currentInputConnection?.performEditorAction(EditorInfo.IME_ACTION_DONE)
            }

            "SPACE" -> {
                if (commitChineseCompositionIfNeeded()) return
                currentInputConnection?.commitText(" ", 1)
            }

            "123" -> {
                isNumberMode = true
                keyboardView?.setNumberMode(true)
            }

            "ABC" -> {
                isNumberMode = false
                keyboardView?.setNumberMode(false)
            }

            "LANG" -> {
                keyboardView?.toggleLanguage()
            }

            else -> {
                if (isChineseMode() && key.length == 1 && key[0].isLetter()) {
                    appendPinyinKey(key)
                    return
                }

                val textToCommit = if (isShiftPressed) key.uppercase() else key.lowercase()
                currentInputConnection?.commitText(textToCommit, 1)

                if (isShiftPressed) {
                    isShiftPressed = false
                    keyboardView?.setShiftState(false)
                }
            }
        }
    }

    private fun handleAgentKeyPress(key: String) {
        when (key) {
            "SHIFT" -> {
                isShiftPressed = !isShiftPressed
                keyboardView?.setShiftState(isShiftPressed)
            }

            "DELETE" -> {
                if (handleAgentChineseDelete()) return
                if (currentInput.isNotEmpty()) {
                    currentInput.deleteCharAt(currentInput.length - 1)
                    keyboardView?.updateAgentInput(currentInput.toString())
                }
            }

            "ENTER" -> {
                if (commitAgentChineseCompositionIfNeeded()) return
                handleAgentSubmit(currentInput.toString())
            }

            "SPACE" -> {
                if (commitAgentChineseCompositionIfNeeded()) return
                currentInput.append(" ")
                keyboardView?.updateAgentInput(currentInput.toString())
            }

            "123" -> {
                isNumberMode = true
                keyboardView?.setNumberMode(true)
            }

            "ABC" -> {
                isNumberMode = false
                keyboardView?.setNumberMode(false)
            }

            "LANG" -> {
                keyboardView?.toggleLanguage()
            }

            else -> {
                // Chinese pinyin input in Agent mode
                if (isChineseMode() && key.length == 1 && key[0].isLetter()) {
                    appendAgentPinyinKey(key)
                    return
                }

                val textToCommit = if (isShiftPressed) key.uppercase() else key.lowercase()
                currentInput.append(textToCommit)
                keyboardView?.updateAgentInput(currentInput.toString())

                if (isShiftPressed) {
                    isShiftPressed = false
                    keyboardView?.setShiftState(false)
                }
            }
        }
    }

    private fun enterAgentMode() {
        isAgentMode = true
        currentInput.clear()
        agentPinyinBuffer.clear()
        clearChineseComposition()
        keyboardView?.setAgentMode(true)
        recordInteraction(InteractionEventType.AGENT_MODE_ENTER)
        vibrateHaptic()
    }

    fun exitAgentMode() {
        if (!isAgentMode) return
        isAgentMode = false
        currentInput.clear()
        agentPinyinBuffer.clear()
        clearChineseComposition()
        keyboardView?.setAgentMode(false)
        recordInteraction(InteractionEventType.AGENT_MODE_EXIT)
    }

    // ── Agent mode Chinese input helpers ──────────────────────────

    private fun appendAgentPinyinKey(key: String) {
        val normalized = key.lowercase(Locale.ROOT)
        agentPinyinBuffer.append(normalized)
        refreshAgentChineseCompositionUi()
    }

    private fun handleAgentChineseDelete(): Boolean {
        if (!isChineseMode() || agentPinyinBuffer.isEmpty()) return false
        agentPinyinBuffer.deleteCharAt(agentPinyinBuffer.length - 1)
        refreshAgentChineseCompositionUi()
        return true
    }

    private fun commitAgentChineseCompositionIfNeeded(): Boolean {
        if (!isChineseMode() || agentPinyinBuffer.isEmpty()) return false
        val pinyin = agentPinyinBuffer.toString()
        val candidate = chineseLexiconEngine.queryCandidates(pinyin).firstOrNull() ?: pinyin
        commitAgentChineseCandidate(candidate)
        return true
    }

    private fun commitAgentChineseCandidate(candidate: String) {
        if (candidate.isBlank()) return
        val pinyin = agentPinyinBuffer.toString()
        currentInput.append(candidate)
        if (pinyin.isNotBlank()) {
            chineseLexiconEngine.learnSelection(pinyin, candidate)
        }
        agentPinyinBuffer.clear()
        keyboardView?.clearChineseComposition()
        keyboardView?.updateAgentInput(currentInput.toString())
    }

    private fun refreshAgentChineseCompositionUi() {
        val pinyin = agentPinyinBuffer.toString()
        if (pinyin.isBlank()) {
            keyboardView?.clearChineseComposition()
            return
        }
        val candidates = chineseLexiconEngine.queryCandidates(pinyin)
        keyboardView?.showChineseCandidates(pinyin, candidates)
    }

    private fun handleAgentSubmit(text: String) {
        if (text.isBlank()) {
            exitAgentMode()
            return
        }

        val sourceApp = currentSourceApp()
        val passwordField = isPasswordField()
        val keystroke = keystrokeCollector.snapshot()
        val triage = onDeviceTriageEngine.evaluate(
            rawText = text,
            sourceApp = sourceApp,
            passwordField = passwordField,
            keystroke = keystroke
        )
        val handoffPlan = buildHandoffPlan(
            rawText = text,
            sourceApp = sourceApp,
            passwordField = passwordField,
            cloudByTriage = triage.requiresCloud
        )

        keyboardView?.showLoading("Submitting to Super Agent kernel...")
        recordInteraction(
            InteractionEventType.QUERY_REFINE,
            mapOf(
                "char_count" to text.length.toString(),
                "routing_mode" to (if (handoffPlan.requiresAppHandoff) "cloud" else "local"),
                "module" to handoffPlan.module.name.lowercase(Locale.ROOT),
                "triage_score" to triage.score.toString(),
                "triage_model" to triage.modelName
            )
        )
        recordInteraction(
            InteractionEventType.KEYSTROKE_WINDOW,
            mapOf(
                "stress" to triage.stateVector.l3.stressScore.toString(),
                "focus" to triage.stateVector.l3.focusScore.toString(),
                "polarity" to triage.stateVector.l3.polarity.toString()
            )
        )

        backendClient.submit(
            sessionId = currentSessionId,
            userId = DEFAULT_USER_ID,
            sourceApp = sourceApp,
            rawText = text,
            imeOptions = currentInputEditorInfo?.imeOptions ?: 0,
            isPasswordField = passwordField,
            module = handoffPlan.module,
            networkPolicy = handoffPlan.networkPolicy,
            stateVector = triage.stateVector,
            keystroke = keystroke,
            onRequestAccepted = { requestId ->
                lastCloudRequestId = requestId
                if (handoffPlan.requiresAppHandoff) {
                    recordInteraction(
                        InteractionEventType.TASK_CONFIRM,
                        mapOf(
                            "handoff" to "auto_app_jump",
                            "module" to handoffPlan.module.name.lowercase(Locale.ROOT),
                            "reason" to handoffPlan.reason
                        )
                    )
                    runOnMainThread {
                        keyboardView?.showHandoffPending(handoffPlan.moduleLabel)
                    }
                    openAppDeeplink(handoffPlan.deeplink, trackCardClick = false)
                }
            }
        ) { response ->
            pendingBackflowResponse = response
            runOnMainThread {
                deliverBackflowIfPossible()
            }
        }
    }

    private fun handleQuickAction(prefix: String) {
        if (!isAgentMode) enterAgentMode()
        currentInput.clear()
        currentInput.append(prefix)
        keyboardView?.updateAgentInput(currentInput.toString())
        vibrateKey()
    }

    fun commitDraft(text: String) {
        currentInputConnection?.commitText(text, 1)
        recordInteraction(
            InteractionEventType.DRAFT_ACCEPT,
            mapOf("char_count" to text.length.toString())
        )
        recordInteraction(InteractionEventType.CONFIRM_SEND)
        exitAgentMode()
    }

    private fun openAppDeeplink(deeplink: String, trackCardClick: Boolean = true) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deeplink)).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            setPackage(packageName)
        }
        runCatching {
            startActivity(intent)
            if (trackCardClick) {
                recordInteraction(
                    InteractionEventType.CARD_CLICK,
                    mapOf("deeplink" to deeplink)
                )
            }
        }.onFailure { error ->
            Log.w(TAG, "Failed to open deeplink: $deeplink", error)
        }
    }

    private fun deliverBackflowIfPossible() {
        val response = pendingBackflowResponse ?: return
        if (!isInputViewShown) return

        if (!isAgentMode) {
            isAgentMode = true
            keyboardView?.setAgentMode(true)
        }

        val backflowResponse = response.copy(
            summary = buildBackflowSummary(response)
        )

        keyboardView?.hideLoading()
        keyboardView?.showAgentResponse(backflowResponse)
        pendingBackflowResponse = null
        lastCloudRequestId = null
    }

    private fun recoverBackflowResult() {
        deliverBackflowIfPossible()
        val requestId = lastCloudRequestId ?: return
        backendClient.fetchResult(requestId) { response ->
            if (response == null || response.type == AgentResponseType.PLACEHOLDER) return@fetchResult
            pendingBackflowResponse = response
            runOnMainThread { deliverBackflowIfPossible() }
        }
    }

    private fun buildBackflowSummary(response: AgentResponse): String {
        val origin = response.summary?.trim().orEmpty()
        return if (origin.isBlank()) {
            "App processing completed; results returned to draft area (tap to insert)"
        } else {
            "App return: $origin (tap a draft to insert)"
        }
    }

    private fun buildHandoffPlan(
        rawText: String,
        sourceApp: String,
        passwordField: Boolean,
        cloudByTriage: Boolean
    ): HandoffPlan {
        val lower = rawText.lowercase(Locale.ROOT)

        if (passwordField) {
            return HandoffPlan(
                module = ModuleId.CHAT,
                moduleLabel = "Chat",
                networkPolicy = NetworkPolicy.LOCAL_ONLY,
                deeplink = LumiRoutes.CHAT,
                requiresAppHandoff = false,
                reason = "password_field_local_only"
            )
        }

        val intentType = IntentClassifier.classify(lower)
        val module = IntentClassifier.toModuleId(intentType)

        val deeplink = when (module) {
            ModuleId.CHAT -> LumiRoutes.CHAT
            ModuleId.LIX -> LumiRoutes.lixIntent(DEFAULT_INTENT_ID)
            ModuleId.AGENT_MARKET -> LumiRoutes.AGENT_MARKET
            ModuleId.AVATAR -> LumiRoutes.AVATAR
            ModuleId.DESTINY -> LumiRoutes.DESTINY
            ModuleId.SETTINGS -> LumiRoutes.SETTINGS
            ModuleId.HOME -> LumiRoutes.CHAT
        }

        val requiresCloudByModule = module != ModuleId.CHAT
        val chatNeedsCloud = cloudByTriage || requiresCloudForChat(lower, sourceApp)
        val requiresAppHandoff = requiresCloudByModule || chatNeedsCloud
        val networkPolicy = when {
            module == ModuleId.AVATAR || module == ModuleId.SETTINGS -> NetworkPolicy.LOCAL_ONLY
            requiresAppHandoff -> NetworkPolicy.CLOUD_PREFERRED
            else -> NetworkPolicy.LOCAL_FIRST
        }

        val reason = when {
            requiresCloudByModule -> "module_${
                module.name.lowercase(Locale.ROOT)
            }_requires_app"
            cloudByTriage -> "ondevice_model_cloud_handoff"
            chatNeedsCloud -> "chat_cloud_trigger"
            else -> "local_first"
        }

        return HandoffPlan(
            module = module,
            moduleLabel = moduleLabel(module),
            networkPolicy = networkPolicy,
            deeplink = deeplink,
            requiresAppHandoff = requiresAppHandoff,
            reason = reason
        )
    }

    private fun requiresCloudForChat(raw: String, sourceApp: String): Boolean {
        if (sourceApp.contains("weixin", ignoreCase = true) ||
            sourceApp.contains("sms", ignoreCase = true) ||
            sourceApp.contains("browser", ignoreCase = true)
        ) {
            // Keep default local-first for normal chatting apps; only escalate on content trigger.
        }

        val realtime = listOf(
            "realtime", "Newest", "today", "weather", "flight", "flight", "hotel", "price", "market",
            "news", "latest", "today", "flight", "hotel", "price", "market"
        ).any { raw.contains(it) }
        val complex = listOf(
            "parallel", "collaboration", "multi-agent", "multiple plans", "task breakdown", "workflow", "multi-agent", "agent marketplace"
        ).any { raw.contains(it) }
        val highRisk = listOf(
            "payment", "transfer", "authorization", "legal", "contract", "medical", "investment", "stocks", "finance", "bank"
        ).any { raw.contains(it) }
        return realtime || complex || highRisk
    }


    private fun moduleLabel(module: ModuleId): String {
        return when (module) {
            ModuleId.HOME -> "Home"
            ModuleId.CHAT -> "Chat"
            ModuleId.LIX -> "LIX"
            ModuleId.AGENT_MARKET -> "Agent Market"
            ModuleId.AVATAR -> "Avatar"
            ModuleId.DESTINY -> "Navigation"
            ModuleId.SETTINGS -> "Settings"
        }
    }

    private data class HandoffPlan(
        val module: ModuleId,
        val moduleLabel: String,
        val networkPolicy: NetworkPolicy,
        val deeplink: String,
        val requiresAppHandoff: Boolean,
        val reason: String
    )

    private fun currentSourceApp(): String {
        return currentInputEditorInfo?.packageName ?: packageName
    }

    private fun isPasswordField(): Boolean {
        val inputType = currentInputEditorInfo?.inputType ?: return false
        val variation = inputType and InputType.TYPE_MASK_VARIATION
        return variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
            variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
            variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD ||
            variation == InputType.TYPE_NUMBER_VARIATION_PASSWORD
    }

    private fun recordInteraction(
        eventType: InteractionEventType,
        payload: Map<String, String> = emptyMap()
    ) {
        backendClient.recordInteraction(
            InteractionEvent(
                sessionId = currentSessionId,
                userId = DEFAULT_USER_ID,
                eventType = eventType,
                payload = payload,
                timestampMs = System.currentTimeMillis()
            )
        )
    }

    private fun switchToOpenSourceChineseIme() {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as? InputMethodManager
        val preferredPackage = ImePreferenceStore.getPreferredChineseImePackage(applicationContext)
        val enabled = runCatching { imm?.enabledInputMethodList.orEmpty() }.getOrDefault(emptyList())
        val targetId = enabled.firstOrNull { it.packageName == preferredPackage }?.id
            ?: enabled.firstOrNull { ImePreferenceStore.isKnownOpenSourceChineseIme(it.packageName) }?.id

        if (targetId != null) {
            val switched = runCatching {
                switchInputMethod(targetId)
                true
            }.getOrDefault(false)
            if (switched) {
                Log.d(TAG, "Switched to open-source Chinese IME: $targetId")
                return
            }
        }

        runCatching { imm?.showInputMethodPicker() }
            .onFailure { error -> Log.w(TAG, "Failed to show input method picker", error) }
    }

    private fun isChineseMode(): Boolean = currentLanguage == "ZH"

    private fun appendPinyinKey(key: String) {
        if (!isChineseMode()) return
        val normalized = key.lowercase(Locale.ROOT)
        currentPinyinBuffer.append(normalized)
        refreshChineseCompositionUi()
    }

    private fun handleChineseDelete(): Boolean {
        if (!isChineseMode() || currentPinyinBuffer.isEmpty()) return false
        currentPinyinBuffer.deleteCharAt(currentPinyinBuffer.length - 1)
        refreshChineseCompositionUi()
        return true
    }

    private fun commitChineseCompositionIfNeeded(): Boolean {
        if (!isChineseMode() || currentPinyinBuffer.isEmpty()) return false
        val pinyin = currentPinyinBuffer.toString()
        val candidate = chineseLexiconEngine.queryCandidates(pinyin).firstOrNull() ?: pinyin
        commitChineseCandidate(candidate)
        return true
    }

    private fun commitChineseCandidate(candidate: String) {
        if (candidate.isBlank()) return
        val currentPinyin = currentPinyinBuffer.toString()
        currentInputConnection?.commitText(candidate, 1)
        if (currentPinyin.isNotBlank()) {
            chineseLexiconEngine.learnSelection(currentPinyin, candidate)
        }
        clearChineseComposition()
    }

    private fun clearChineseComposition() {
        if (currentPinyinBuffer.isNotEmpty()) {
            currentPinyinBuffer.clear()
        }
        keyboardView?.clearChineseComposition()
    }

    private fun refreshChineseCompositionUi() {
        val pinyin = currentPinyinBuffer.toString()
        if (pinyin.isBlank()) {
            keyboardView?.clearChineseComposition()
            return
        }
        val candidates = chineseLexiconEngine.queryCandidates(pinyin)
        keyboardView?.showChineseCandidates(pinyin, candidates)
    }

    private fun vibrateKey() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createOneShot(20, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(20)
        }
    }

    private fun vibrateHaptic() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(50)
        }
    }

    private fun runOnMainThread(action: () -> Unit) {
        keyboardView?.post(action)
    }
}
