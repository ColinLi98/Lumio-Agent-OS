package com.lumi.keyboard

import android.inputmethodservice.InputMethodService
import android.view.View
import android.view.inputmethod.EditorInfo
import android.os.Vibrator
import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.util.Log

/**
 * Lumi Input Method Editor - Smart AI Keyboard
 * 
 * Features:
 * - Standard QWERTY keyboard with Chinese support
 * - Agent Mode (long press space) for AI-powered input
 * - Three core functions: 帮我写, 帮我找, 帮我记
 */
class LumiIME : InputMethodService() {

    companion object {
        private const val TAG = "LumiIME"
    }

    private var keyboardView: LumiKeyboardView? = null
    private var isAgentMode = false
    private var vibrator: Vibrator? = null
    
    // Current input state
    private var currentInput = StringBuilder()
    private var isShiftPressed = false
    private var isNumberMode = false

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "LumiIME onCreate")
        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    override fun onCreateInputView(): View {
        Log.d(TAG, "LumiIME onCreateInputView")
        keyboardView = LumiKeyboardView(this).apply {
            onKeyPress = { key -> handleKeyPress(key) }
            onLongPressSpace = { enterAgentMode() }
            onAgentSubmit = { text -> handleAgentSubmit(text) }
        }
        return keyboardView!!
    }

    override fun onStartInput(attribute: EditorInfo?, restarting: Boolean) {
        super.onStartInput(attribute, restarting)
        Log.d(TAG, "LumiIME onStartInput")
        // Reset state for new input field
        currentInput.clear()
        isAgentMode = false
        keyboardView?.setAgentMode(false)
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        Log.d(TAG, "LumiIME onStartInputView")
    }

    private fun handleKeyPress(key: String) {
        vibrateKey()
        
        when (key) {
            "SHIFT" -> {
                isShiftPressed = !isShiftPressed
                keyboardView?.setShiftState(isShiftPressed)
            }
            "DELETE" -> {
                currentInputConnection?.deleteSurroundingText(1, 0)
            }
            "ENTER" -> {
                if (isAgentMode) {
                    handleAgentSubmit(currentInput.toString())
                } else {
                    currentInputConnection?.performEditorAction(EditorInfo.IME_ACTION_DONE)
                }
            }
            "SPACE" -> {
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
                // Toggle language (EN/ZH)
                keyboardView?.toggleLanguage()
            }
            else -> {
                val textToCommit = if (isShiftPressed) key.uppercase() else key.lowercase()
                currentInputConnection?.commitText(textToCommit, 1)
                
                if (isAgentMode) {
                    currentInput.append(textToCommit)
                    keyboardView?.updateAgentInput(currentInput.toString())
                }
                
                // Auto-disable shift after typing
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
        keyboardView?.setAgentMode(true)
        vibrateHaptic()
    }

    fun exitAgentMode() {
        isAgentMode = false
        currentInput.clear()
        keyboardView?.setAgentMode(false)
    }

    private fun handleAgentSubmit(text: String) {
        if (text.isBlank()) {
            exitAgentMode()
            return
        }
        
        // Show loading state
        keyboardView?.showLoading()
        
        // Process with AI Agent (async)
        LumiAgent.process(text) { result ->
            runOnMainThread {
                keyboardView?.hideLoading()
                keyboardView?.showDrafts(result.drafts)
            }
        }
    }

    fun commitDraft(text: String) {
        currentInputConnection?.commitText(text, 1)
        exitAgentMode()
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

