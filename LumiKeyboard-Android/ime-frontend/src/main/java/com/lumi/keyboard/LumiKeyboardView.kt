package com.lumi.keyboard

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.util.AttributeSet
import android.view.Gravity
import android.view.View
import android.view.animation.AlphaAnimation
import android.view.animation.AnimationSet
import android.view.animation.TranslateAnimation
import android.widget.Button
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.ModulePayload
import com.lumi.coredomain.contract.PrivacyAction

/**
 * Lumi Keyboard View - thin IME frontend with Agent mode preview.
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
    var onLanguageChanged: ((String) -> Unit)? = null
    var onChineseCandidateSelected: ((String) -> Unit)? = null
    var onOpenSourceChineseIme: (() -> Unit)? = null
    var onOpenAppDeeplink: ((String) -> Unit)? = null
    var onAgentModeToggle: (() -> Unit)? = null
    var onQuickActionSelected: ((String) -> Unit)? = null

    // UI Elements
    private lateinit var keyboardContainer: LinearLayout
    private lateinit var agentContainer: LinearLayout
    private lateinit var quickActionBar: HorizontalScrollView
    private lateinit var quickActionRow: LinearLayout
    private lateinit var agentIndicatorBar: View
    private lateinit var chineseComposeContainer: LinearLayout
    private lateinit var chinesePinyinText: TextView
    private lateinit var chineseCandidatesRow: LinearLayout
    private lateinit var agentInputText: TextView
    internal lateinit var agentSummaryText: TextView
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

    init {
        orientation = VERTICAL
        setBackgroundColor(Color.parseColor("#1e1b4b"))
        setupKeyboard()
    }

    private fun setupKeyboard() {
        removeAllViews()

        agentContainer = LinearLayout(context).apply {
            orientation = VERTICAL
            visibility = View.GONE
            setBackgroundColor(Color.parseColor("#312e81"))
            setPadding(16, 16, 16, 16)
        }

        agentInputText = TextView(context).apply {
            text = "Lumi >"
            setTextColor(Color.WHITE)
            textSize = 15f
        }
        agentContainer.addView(agentInputText)

        agentSummaryText = TextView(context).apply {
            text = "Long press Space for Agent Mode"
            setTextColor(Color.parseColor("#c7d2fe"))
            textSize = 13f
            setPadding(0, 4, 0, 6)
        }
        agentContainer.addView(agentSummaryText)

        loadingIndicator = ProgressBar(context).apply {
            visibility = View.GONE
        }
        agentContainer.addView(loadingIndicator)

        draftsContainer = LinearLayout(context).apply {
            orientation = VERTICAL
        }
        agentContainer.addView(draftsContainer)

        addView(agentContainer)

        // Agent mode indicator bar (breathing gradient)
        agentIndicatorBar = View(context).apply {
            val gradient = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(Color.parseColor("#6366f1"), Color.parseColor("#06b6d4"))
            )
            background = gradient
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, 3)
            visibility = View.GONE
        }
        addView(agentIndicatorBar)

        // Quick action toolbar
        quickActionRow = LinearLayout(context).apply {
            orientation = HORIZONTAL
            setPadding(8, 4, 8, 4)
        }
        quickActionBar = HorizontalScrollView(context).apply {
            setBackgroundColor(Color.parseColor("#1e1b4b"))
            isHorizontalScrollBarEnabled = false
            addView(quickActionRow)
            visibility = View.GONE
        }
        addView(quickActionBar)

        chineseComposeContainer = LinearLayout(context).apply {
            orientation = VERTICAL
            visibility = View.GONE
            setBackgroundColor(Color.parseColor("#27235a"))
            setPadding(12, 8, 12, 8)
        }

        chinesePinyinText = TextView(context).apply {
            text = "Pinyin:"
            setTextColor(Color.parseColor("#a5b4fc"))
            textSize = 13f
        }
        chineseComposeContainer.addView(chinesePinyinText)

        chineseCandidatesRow = LinearLayout(context).apply {
            orientation = HORIZONTAL
            setPadding(0, 6, 0, 0)
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
        }
        chineseComposeContainer.addView(chineseCandidatesRow)
        addView(chineseComposeContainer)

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

        if (isNumber) {
            row.addView(createSpecialKeyButton("ABC", 1.5f))
        } else {
            row.addView(createSpecialKeyButton("⇧", 1.5f) {
                onKeyPress?.invoke("SHIFT")
            })
        }

        keys.forEach { key ->
            row.addView(createKeyButton(key))
        }

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

        row.addView(createSpecialKeyButton(if (isNumberMode) "ABC" else "123", 1.4f) {
            onKeyPress?.invoke(if (isNumberMode) "ABC" else "123")
        })

        row.addView(createSpecialKeyButton(language, 1f) {
            toggleLanguage()
        })

        if (!isAgentMode && language == "ZH") {
            row.addView(createSpecialKeyButton("Open IME", 1.3f) {
                onOpenSourceChineseIme?.invoke()
            })
        }

        val spaceButton = Button(context).apply {
            text = when {
                isAgentMode -> "Hold to Exit"
                language == "ZH" -> "Space"
                else -> "Space"
            }
            setBackgroundColor(Color.parseColor("#4338ca"))
            setTextColor(Color.WHITE)
            layoutParams = LayoutParams(0, 100, 3.5f).apply {
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

        // Agent mode toggle button — always visible
        val agentToggle = Button(context).apply {
            text = if (isAgentMode) "✕" else "✨"
            setBackgroundColor(if (isAgentMode) Color.parseColor("#dc2626") else Color.parseColor("#7c3aed"))
            setTextColor(Color.WHITE)
            textSize = 16f
            layoutParams = LayoutParams(0, 100, 1f).apply {
                setMargins(2, 0, 4, 0)
            }
            setOnClickListener {
                onAgentModeToggle?.invoke()
            }
        }
        row.addView(agentToggle)

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
        agentIndicatorBar.visibility = if (enabled) View.VISIBLE else View.GONE
        agentInputText.text = "Lumi >"
        agentSummaryText.text = "Commands only generate drafts; nothing is sent automatically"
        draftsContainer.removeAllViews()

        if (enabled) {
            refreshQuickActions()
            quickActionBar.visibility = View.VISIBLE
            // Slide-in animation for agent container
            val slideIn = AnimationSet(true).apply {
                addAnimation(TranslateAnimation(0f, 0f, -50f, 0f).apply { duration = 200 })
                addAnimation(AlphaAnimation(0f, 1f).apply { duration = 200 })
            }
            agentContainer.startAnimation(slideIn)
        } else {
            quickActionBar.visibility = View.GONE
        }

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
        if (language != "ZH") {
            clearChineseComposition()
        }
        onLanguageChanged?.invoke(language)
        renderKeyboard()
    }

    fun updateAgentInput(text: String) {
        agentInputText.text = "Lumi > $text"
    }

    fun showLoading(message: String = "Calling App internal backend...") {
        loadingIndicator.visibility = View.VISIBLE
        draftsContainer.visibility = View.GONE
        agentSummaryText.text = message
        agentSummaryText.setTextColor(Color.parseColor("#c7d2fe"))
    }

    fun hideLoading() {
        loadingIndicator.visibility = View.GONE
        draftsContainer.visibility = View.VISIBLE
    }

    fun showHandoffPending(moduleLabel: String) {
        setAgentMode(true)
        showLoading("Switching to Lumi App for $moduleLabel; results will return to the draft area")
    }

    fun showAgentResponse(response: AgentResponse) {
        draftsContainer.removeAllViews()
        val summary = response.summary ?: "Draft generated"
        agentSummaryText.text = "$summary · ${response.status.name.lowercase()}"

        if (response.privacyAction == PrivacyAction.SHIELD_UP) {
            agentSummaryText.setTextColor(Color.parseColor("#fbbf24"))
        } else {
            agentSummaryText.setTextColor(Color.parseColor("#c7d2fe"))
        }

        draftsContainer.addView(
            TextView(context).apply {
                text = "Reply Manager · ${response.traceId.take(8)}"
                setTextColor(Color.parseColor("#93c5fd"))
                textSize = 12f
                setPadding(0, 6, 0, 2)
            }
        )

        val taskTrack = (response.payload as? ModulePayload.ChatPayload)?.taskTrack
        if (taskTrack != null) {
            val trackView = TextView(context).apply {
                text = "Task Track: ${taskTrack.phase} ${(taskTrack.progress * 100).toInt()}%"
                setTextColor(Color.parseColor("#93c5fd"))
                textSize = 12f
                setPadding(0, 4, 0, 0)
            }
            draftsContainer.addView(trackView)
            taskTrack.steps.take(2).forEach { step ->
                draftsContainer.addView(
                    TextView(context).apply {
                        text = "• ${step.title} (${step.status.name.lowercase()})"
                        setTextColor(Color.parseColor("#cbd5e1"))
                        textSize = 11f
                        setPadding(0, 2, 0, 0)
                    }
                )
            }
        }

        if (response.drafts.isNotEmpty()) {
            draftsContainer.addView(
                TextView(context).apply {
                    text = "Candidate drafts (tap to insert)"
                    setTextColor(Color.parseColor("#cbd5e1"))
                    textSize = 11f
                    setPadding(0, 6, 0, 0)
                }
            )
        }

        response.drafts.take(3).forEachIndexed { index, draft ->
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

        if (response.cards.isNotEmpty()) {
            draftsContainer.addView(
                TextView(context).apply {
                    text = "Evidence Cards"
                    setTextColor(Color.parseColor("#cbd5e1"))
                    textSize = 11f
                    setPadding(0, 8, 0, 0)
                }
            )
        }

        response.cards.take(2).forEach { card ->
            val cardButton = Button(context).apply {
                text = "${card.title}: ${card.summary}"
                setBackgroundColor(Color.parseColor("#312e81"))
                setTextColor(Color.parseColor("#dbeafe"))
                textSize = 12f
                isAllCaps = false
                layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                    setMargins(0, 6, 0, 0)
                }
                setOnClickListener {
                    card.deeplink?.let { link -> onOpenAppDeeplink?.invoke(link) }
                }
            }
            draftsContainer.addView(cardButton)
        }

        response.appDeeplink?.let { deeplink ->
            val openButton = Button(context).apply {
                text = "Open Lumi App for Deep Processing"
                setBackgroundColor(Color.parseColor("#0f766e"))
                setTextColor(Color.WHITE)
                textSize = 13f
                isAllCaps = false
                layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                    setMargins(0, 10, 0, 0)
                }
                setOnClickListener {
                    onOpenAppDeeplink?.invoke(deeplink)
                }
            }
            draftsContainer.addView(openButton)
        }

        if (response.drafts.isEmpty() && response.cards.isEmpty()) {
            draftsContainer.addView(
                TextView(context).apply {
                    text = "No directly submittable content yet. Continue asking or open Lumi App."
                    setTextColor(Color.parseColor("#cbd5e1"))
                    textSize = 12f
                    setPadding(0, 8, 0, 0)
                }
            )
        }
    }

    fun showChineseCandidates(pinyin: String, candidates: List<String>) {
        if (language != "ZH") return
        chineseComposeContainer.visibility = View.VISIBLE
        chinesePinyinText.text = "Pinyin: $pinyin"
        chineseCandidatesRow.removeAllViews()
        candidates.take(3).forEach { candidate ->
            val button = Button(context).apply {
                text = candidate
                textSize = 14f
                isAllCaps = false
                setBackgroundColor(Color.parseColor("#312e81"))
                setTextColor(Color.WHITE)
                layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f).apply {
                    setMargins(4, 0, 4, 0)
                }
                setOnClickListener { onChineseCandidateSelected?.invoke(candidate) }
            }
            chineseCandidatesRow.addView(button)
        }
    }

    fun clearChineseComposition() {
        if (!::chineseComposeContainer.isInitialized) return
        chineseCandidatesRow.removeAllViews()
        chinesePinyinText.text = "Pinyin:"
        chineseComposeContainer.visibility = View.GONE
    }

    /**
     * Populate quick-action chips from OpenClaw capability hints.
     * Data comes from OpenClawCapabilityMapper (core-agent layer),
     * not from direct HTTP calls.
     */
    private fun refreshQuickActions() {
        quickActionRow.removeAllViews()

        // Quick actions derived from architect-approved capability map
        val actions = listOf(
            "✨ LIX Dispatch" to "Find the best plan for me:",
            "✈️ Travel" to "Find a travel plan for me:",
            "💼 Hiring" to "Find a hiring plan for me:",
            "✏️ Rewrite" to "Rewrite this for me:",
            "🔒 Privacy" to "Please anonymize this:",
            "🧠 Reasoning" to "Help me analyze this decision:"
        )

        actions.forEach { (label, prefix) ->
            val chip = Button(context).apply {
                text = label
                textSize = 12f
                isAllCaps = false
                setBackgroundColor(Color.parseColor("#312e81"))
                setTextColor(Color.parseColor("#c7d2fe"))
                setPadding(24, 8, 24, 8)
                layoutParams = LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT).apply {
                    setMargins(4, 2, 4, 2)
                }
                setOnClickListener {
                    onQuickActionSelected?.invoke(prefix)
                }
            }
            quickActionRow.addView(chip)
        }
    }

    /**
     * Show streaming progress with phase label.
     */
    fun showProgress(phase: String, percent: Int = -1) {
        loadingIndicator.visibility = View.VISIBLE
        draftsContainer.visibility = View.GONE
        val progressText = if (percent >= 0) "$phase ($percent%)" else phase
        agentSummaryText.text = progressText
        agentSummaryText.setTextColor(Color.parseColor("#a5b4fc"))
    }
}
