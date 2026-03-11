package com.lumi.keyboard

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Build
import android.os.IBinder
import android.util.Log
import com.lumi.coredomain.contract.AgentDraft
import com.lumi.coredomain.contract.AgentMode
import com.lumi.coredomain.contract.AgentRequest
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.AgentResponseType
import com.lumi.coredomain.contract.AgentResultObserver
import com.lumi.coredomain.contract.FieldHints
import com.lumi.coredomain.contract.InteractionEvent
import com.lumi.coredomain.contract.KeystrokeDynamicsPayload
import com.lumi.coredomain.contract.LumiBackendBridge
import com.lumi.coredomain.contract.ModuleId
import com.lumi.coredomain.contract.NetworkPolicy
import com.lumi.coredomain.contract.PrivacyAction
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.UUID
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicBoolean

class BackendClient(
    private val context: Context,
    private val callbackScope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
) {

    private val pendingRequests = CopyOnWriteArrayList<PendingRequest>()
    private var bridge: LumiBackendBridge? = null
    private var bound = false

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            bridge = service as? LumiBackendBridge
            bound = bridge != null
            runCatching { bridge?.resumePendingRequests(DEFAULT_USER_ID) }
                .onFailure { error -> Log.w(TAG, "Failed to resume pending requests", error) }
            flushPending()
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            bridge = null
            bound = false
        }
    }

    fun connect() {
        if (bound) return
        val intent = backendServiceIntent()
        runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
            bound = true
        }.onFailure { error ->
            Log.w(TAG, "Failed to connect backend service", error)
        }
    }

    fun disconnect() {
        if (!bound) return
        runCatching {
            context.unbindService(serviceConnection)
        }
        bound = false
        bridge = null
    }

    fun submit(
        sessionId: String,
        userId: String,
        sourceApp: String,
        rawText: String,
        imeOptions: Int,
        isPasswordField: Boolean,
        module: ModuleId = ModuleId.CHAT,
        networkPolicy: NetworkPolicy = NetworkPolicy.LOCAL_FIRST,
        stateVector: DynamicHumanStatePayload? = null,
        keystroke: KeystrokeDynamicsPayload? = null,
        onRequestAccepted: ((String) -> Unit)? = null,
        onProgress: ((AgentResponse) -> Unit)? = null,
        onResult: (AgentResponse) -> Unit
    ): Job {
        val request = AgentRequest(
            sessionId = sessionId,
            userId = userId,
            sourceApp = sourceApp,
            mode = AgentMode.AGENT_MODE,
            rawText = rawText,
            fieldHints = FieldHints(
                isPasswordField = isPasswordField,
                imeOptions = imeOptions,
                isIncognito = (imeOptions and INCOGNITO_FLAG) != 0
            ),
            timestampMs = System.currentTimeMillis(),
            locale = DEFAULT_RESPONSE_LOCALE,
            networkPolicy = networkPolicy,
            module = module,
            stateVector = stateVector,
            keystroke = keystroke
        )

        val api = bridge
        if (api == null) {
            pendingRequests += PendingRequest(
                request = request,
                callback = onResult,
                onRequestAccepted = onRequestAccepted,
                onProgress = onProgress
            )
            connect()
            return callbackScope.launch {
                delay(120)
                if (bridge == null) {
                    onResult(localFallbackResponse())
                }
            }
        }

        return submitToBridge(
            api = api,
            request = request,
            onRequestAccepted = onRequestAccepted,
            onProgress = onProgress,
            onResult = onResult
        )
    }

    fun cancelRequest(requestId: String): Boolean {
        return bridge?.cancelRequest(requestId) == true
    }

    fun fetchResult(requestId: String, onResult: (AgentResponse?) -> Unit): Job {
        return callbackScope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                callbackScope.launch { onResult(null) }
                return@launch
            }

            val response = runCatching { api.getAgentResult(requestId) }.getOrNull()
            val delivered = response
                ?.takeIf { it.type != AgentResponseType.PLACEHOLDER || it.status.isTerminal() }
            callbackScope.launch { onResult(delivered) }
        }
    }

    fun recordInteraction(event: InteractionEvent) {
        bridge?.recordInteraction(event)
    }

    private fun flushPending() {
        val api = bridge ?: return
        val pending = pendingRequests.toList()
        pendingRequests.clear()
        pending.forEach { item ->
            submitToBridge(
                api = api,
                request = item.request,
                onRequestAccepted = item.onRequestAccepted,
                onProgress = item.onProgress,
                onResult = item.callback
            )
        }
    }

    private fun submitToBridge(
        api: LumiBackendBridge,
        request: AgentRequest,
        onRequestAccepted: ((String) -> Unit)?,
        onProgress: ((AgentResponse) -> Unit)?,
        onResult: (AgentResponse) -> Unit
    ): Job {
        return callbackScope.launch(Dispatchers.IO) {
            val requestId = runCatching { api.submitAgentRequest(request) }
                .getOrElse {
                    onResult(localFallbackResponse())
                    return@launch
                }
            callbackScope.launch { onRequestAccepted?.invoke(requestId) }

            val delivered = AtomicBoolean(false)
            runCatching {
                api.observeAgentResult(requestId, AgentResultObserver { response ->
                    if (response.type == AgentResponseType.PLACEHOLDER) {
                        callbackScope.launch { onProgress?.invoke(response) }
                        return@AgentResultObserver
                    }
                    if (!response.status.isTerminal()) {
                        callbackScope.launch { onProgress?.invoke(response) }
                        return@AgentResultObserver
                    }
                    if (delivered.compareAndSet(false, true)) {
                        callbackScope.launch { onResult(response) }
                    }
                })
            }

            while (!delivered.get()) {
                val response = runCatching { api.getAgentResult(requestId) }.getOrNull()
                if (response != null && response.type != AgentResponseType.PLACEHOLDER) {
                    if (delivered.compareAndSet(false, true)) {
                        callbackScope.launch { onResult(response) }
                    }
                    break
                }
                if (response != null) {
                    callbackScope.launch { onProgress?.invoke(response) }
                }
                delay(POLL_INTERVAL_MS)
            }
        }
    }

    private suspend fun awaitBridge(): LumiBackendBridge? {
        if (bridge == null) {
            connect()
            repeat(CONNECTION_WAIT_RETRY) {
                if (bridge != null) return bridge
                delay(CONNECTION_WAIT_MS)
            }
        }
        return bridge
    }

    private fun localFallbackResponse(): AgentResponse {
        return AgentResponse(
            type = AgentResponseType.DRAFT,
            drafts = localFallbackDrafts(),
            summary = "Service disconnected; local draft template used",
            privacyAction = PrivacyAction.NONE,
            traceId = UUID.randomUUID().toString(),
            latencyMs = 0,
            confidence = 0.5,
            errorCode = "backend_disconnected",
            module = ModuleId.CHAT
        )
    }

    private fun localFallbackDrafts(): List<AgentDraft> {
        return listOf(
            AgentDraft("Got it. I understand your message.", "casual", 0.62),
            AgentDraft("Received. I will handle it shortly and share progress.", "professional", 0.6),
            AgentDraft("Understood. Handling it now.", "concise", 0.58)
        )
    }

    private fun backendServiceIntent(): Intent {
        return Intent().setClassName(context.packageName, BACKEND_SERVICE_CLASS)
    }

    private data class PendingRequest(
        val request: AgentRequest,
        val callback: (AgentResponse) -> Unit,
        val onRequestAccepted: ((String) -> Unit)?,
        val onProgress: ((AgentResponse) -> Unit)?
    )

    companion object {
        private const val TAG = "BackendClient"
        private const val BACKEND_SERVICE_CLASS = "com.lumi.keyboard.LumiAgentBackendService"
        private const val POLL_INTERVAL_MS = 80L
        private const val DEFAULT_USER_ID = "local-user"
        private const val DEFAULT_RESPONSE_LOCALE = "en-GB"
        private const val CONNECTION_WAIT_MS = 80L
        private const val CONNECTION_WAIT_RETRY = 8

        // Matches EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING.
        private const val INCOGNITO_FLAG = 0x1000000
    }
}

private fun ResponseStatus.isTerminal(): Boolean {
    return this == ResponseStatus.SUCCESS ||
        this == ResponseStatus.PARTIAL ||
        this == ResponseStatus.ERROR ||
        this == ResponseStatus.CANCELLED
}
