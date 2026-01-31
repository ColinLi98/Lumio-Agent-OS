package com.lumi.keyboard

import android.content.Context
import android.util.AttributeSet
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.ProgressBar
import android.graphics.Color
import android.os.Handler
import android.os.Looper

/**
 * Lumi Keyboard View - Custom keyboard layout with Agent Mode
 */
class LumiKeyboardView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    // Callbacks
    var onKeyPress: ((String) -> Unit)? = null
    var onLongPressSpace: (() -> Unit)? = null
    var onAgentSubmit: ((String) -> Unit)? = null

    // UI Elements
    private lateinit var keyboardContainer: LinearLayout
    private lateinit var agentContainer: LinearLayout
    private lateinit var agentInputText: TextView
    private lateinit var draftsContainer: LinearLayout
    private lateinit var loadingIndicator: ProgressBar

    // State
    private var isAgentMode = false
    private var isShiftActive = false
    private var isNumberMode = false
    private var language = "EN" // EN or ZH

    // Key layouts
    private val qwertyRow1 = listOf("q", "w", "e", "r", "t", "y", "u", "i", "o", "p")
    private val qwertyRow2 = listOf("a", "s", "d", "f", "g", "h", "j", "k", "l")
    private val qwertyRow3 = listOf("z", "x", "c", "v", "b", "n", "m")
    private val numberRow1 = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "0")
    private val numberRow2 = listOf("-", "/", ":", ";", "(", ")", "$", "&", "@")
    private val numberRow3 = listOf(".", ",", "?", "!", "'", "#", "+", "=")

    private val handler = Handler(Looper.getMainLooper())
    private var spaceDownTime = 0L

    init {
        orientation = VERTICAL
        setBackgroundColor(Color.parseColor("#1e1b4b")) // Indigo dark
        setupKeyboard()
    }

    private fun setupKeyboard() {
        removeAllViews()

        // Agent mode container (hidden by default)
        agentContainer = LinearLayout(context).apply {
            orientation = VERTICAL
            visibility = View.GONE
            setBackgroundColor(Color.parseColor("#312e81"))
            setPadding(16, 16, 16, 16)
        }

        agentInputText = TextView(context).apply {
            text = "Lumi > "
            setTextColor(Color.WHITE)
            textSize = 16f
        }
        agentContainer.addView(agentInputText)

        loadingIndicator = ProgressBar(context).apply {
            visibility = View.GONE
        }
        agentContainer.addView(loadingIndicator)

        draftsContainer = LinearLayout(context).apply {
            orientation = VERTICAL
        }
        agentContainer.addView(draftsContainer)

        addView(agentContainer)

        // Main keyboard container
        keyboardContainer = LinearLayout(context).apply {
            orientation = VERTICAL
            setPadding(8, 8, 8, 8)
        }
        addView(keyboardContainer)

        renderKeyboard()
    }

    private fun renderKeyboard() {
        keyboardContainer.removeAllViews()

        if (isNumberMode) {
            addKeyRow(numberRow1)
            addKeyRow(numberRow2)
            addRow3WithSpecialKeys(numberRow3, isNumber = true)
        } else {
            addKeyRow(qwertyRow1)
            addKeyRow(qwertyRow2)
            addRow3WithSpecialKeys(qwertyRow3, isNumber = false)
        }
        addBottomRow()
    }

    private fun addKeyRow(keys: List<String>) {
        val row = LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, 4, 0, 4)
            }
        }

        keys.forEach { key ->
            val keyButton = createKeyButton(if (isShiftActive) key.uppercase() else key)
            row.addView(keyButton)
        }

        keyboardContainer.addView(row)
    }

    private fun addRow3WithSpecialKeys(keys: List<String>, isNumber: Boolean) {
        val row = LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, 4, 0, 4)
            }
        }

        // Shift or ABC key
        if (isNumber) {
            row.addView(createSpecialKeyButton("ABC", 1.5f))
        } else {
            row.addView(createSpecialKeyButton(if (isShiftActive) "⇧" else "⇧", 1.5f) {
                onKeyPress?.invoke("SHIFT")
            })
        }

        keys.forEach { key ->
            row.addView(createKeyButton(key))
        }

        // Delete key
        row.addView(createSpecialKeyButton("⌫", 1.5f) {
            onKeyPress?.invoke("DELETE")
        })

        keyboardContainer.addView(row)
    }

    private fun addBottomRow() {
        val row = LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, 4, 0, 4)
            }
        }

        // 123/ABC toggle
        row.addView(createSpecialKeyButton(if (isNumberMode) "ABC" else "123", 1.5f) {
            onKeyPress?.invoke(if (isNumberMode) "ABC" else "123")
        })

        // Language toggle
        row.addView(createSpecialKeyButton(language, 1f) {
            toggleLanguage()
        })

        // Space bar with long press for Agent Mode
        val spaceButton = Button(context).apply {
            text = if (isAgentMode) "Hold to Exit" else "Space"
            setBackgroundColor(Color.parseColor("#4338ca"))
            setTextColor(Color.WHITE)
            layoutParams = LayoutParams(0, 100, 4f).apply {
                setMargins(4, 0, 4, 0)
            }

            setOnClickListener {
                onKeyPress?.invoke("SPACE")
            }

            setOnLongClickListener {
                if (isAgentMode) {
                    (context as? LumiIME)?.exitAgentMode()
                } else {
                    onLongPressSpace?.invoke()
                }
                true
            }
        }
        row.addView(spaceButton)

        // Enter/Go key
        row.addView(createSpecialKeyButton(if (isAgentMode) "↑" else "Go", 1.5f) {
            onKeyPress?.invoke("ENTER")
        })

        keyboardContainer.addView(row)
    }

    private fun createKeyButton(key: String): Button {
        return Button(context).apply {
            text = key
            setBackgroundColor(Color.parseColor("#3730a3"))
            setTextColor(Color.WHITE)
            textSize = 18f
            isAllCaps = false
            layoutParams = LayoutParams(0, 100, 1f).apply {
                setMargins(2, 0, 2, 0)
            }
            setOnClickListener {
                onKeyPress?.invoke(key)
            }
        }
    }

    private fun createSpecialKeyButton(text: String, weight: Float, onClick: (() -> Unit)? = null): Button {
        return Button(context).apply {
            this.text = text
            setBackgroundColor(Color.parseColor("#1e1b4b"))
            setTextColor(Color.parseColor("#a5b4fc"))
            textSize = 14f
            isAllCaps = false
            layoutParams = LayoutParams(0, 100, weight).apply {
                setMargins(2, 0, 2, 0)
            }
            setOnClickListener {
                onClick?.invoke() ?: onKeyPress?.invoke(text)
            }
        }
    }

    fun setAgentMode(enabled: Boolean) {
        isAgentMode = enabled
        agentContainer.visibility = if (enabled) View.VISIBLE else View.GONE
        agentInputText.text = "Lumi > "
        draftsContainer.removeAllViews()
        renderKeyboard()
    }

    fun setShiftState(shifted: Boolean) {
        isShiftActive = shifted
        renderKeyboard()
    }

    fun setNumberMode(numbers: Boolean) {
        isNumberMode = numbers
        renderKeyboard()
    }

    fun toggleLanguage() {
        language = if (language == "EN") "ZH" else "EN"
        renderKeyboard()
    }

    fun updateAgentInput(text: String) {
        agentInputText.text = "Lumi > $text"
    }

    fun showLoading() {
        loadingIndicator.visibility = View.VISIBLE
        draftsContainer.visibility = View.GONE
    }

    fun hideLoading() {
        loadingIndicator.visibility = View.GONE
        draftsContainer.visibility = View.VISIBLE
    }

    fun showDrafts(drafts: List<Draft>) {
        draftsContainer.removeAllViews()

        drafts.forEachIndexed { index, draft ->
            val draftButton = Button(context).apply {
                text = "${index + 1}. ${draft.text}"
                setBackgroundColor(Color.parseColor("#4338ca"))
                setTextColor(Color.WHITE)
                textSize = 14f
                isAllCaps = false
                layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                    setMargins(0, 8, 0, 0)
                }
                setOnClickListener {
                    (context as? LumiIME)?.commitDraft(draft.text)
                }
            }
            draftsContainer.addView(draftButton)
        }
    }
}

data class Draft(val text: String, val tone: String = "casual")
