package com.lumi.keyboard

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.provider.Settings
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Settings activity for Lumi IME + backend host.
 */
class SettingsActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var chineseImeStatusText: TextView
    private lateinit var lexiconStatusText: TextView
    private lateinit var agentBackendStatusText: TextView
    private lateinit var developerModeStatusText: TextView
    private var isEngineeringBuild: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        isEngineeringBuild = UiModePreferences.isEngineeringBuild(this)

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#1e1b4b"))
            setPadding(48, 48, 48, 48)
        }

        val titleText = TextView(this).apply {
            text = "✨ Lumi Intelligent Keyboard Settings"
            textSize = 24f
            setTextColor(Color.WHITE)
            setPadding(0, 0, 0, 36)
        }
        layout.addView(titleText)

        statusText = TextView(this).apply {
            text = "⚠️ Keyboard not enabled"
            textSize = 16f
            setTextColor(Color.parseColor("#fbbf24"))
            setPadding(0, 0, 0, 24)
        }
        layout.addView(statusText)

        val enableButton = Button(this).apply {
            text = "1️⃣ Enable Lumi Keyboard"
            setBackgroundColor(Color.parseColor("#4338ca"))
            setTextColor(Color.WHITE)
            textSize = 16f
            setPadding(32, 24, 32, 24)
            setOnClickListener { openInputMethodSettings() }
        }
        layout.addView(enableButton)

        layout.addView(spacer(12))

        val selectButton = Button(this).apply {
            text = "2️⃣ Select Lumi as input method"
            setBackgroundColor(Color.parseColor("#4338ca"))
            setTextColor(Color.WHITE)
            textSize = 16f
            setPadding(32, 24, 32, 24)
            setOnClickListener { showInputMethodPicker() }
        }
        layout.addView(selectButton)

        layout.addView(spacer(24))

        val chineseImeTitle = TextView(this).apply {
            text = "Open-source Chinese IME bridge (Fcitx5 preferred by default)"
            textSize = 14f
            setTextColor(Color.parseColor("#a5b4fc"))
            setPadding(0, 0, 0, 8)
        }
        layout.addView(chineseImeTitle)

        chineseImeStatusText = TextView(this).apply {
            textSize = 12f
            setTextColor(Color.parseColor("#93c5fd"))
            setPadding(0, 0, 0, 8)
        }
        layout.addView(chineseImeStatusText)

        val preferFcitxButton = Button(this).apply {
            text = "Set as Fcitx5 (recommended)"
            setBackgroundColor(Color.parseColor("#0f766e"))
            setTextColor(Color.WHITE)
            textSize = 13f
            setOnClickListener {
                setPreferredChineseImePackage(FCITX_PACKAGE)
                updateChineseImeStatus()
            }
        }
        layout.addView(preferFcitxButton)

        layout.addView(spacer(6))

        val preferTrimeButton = Button(this).apply {
            text = "Set as Trime (Rime)"
            setBackgroundColor(Color.parseColor("#0f766e"))
            setTextColor(Color.WHITE)
            textSize = 13f
            setOnClickListener {
                setPreferredChineseImePackage(TRIME_PACKAGE)
                updateChineseImeStatus()
            }
        }
        layout.addView(preferTrimeButton)

        layout.addView(spacer(6))

        val switchNowButton = Button(this).apply {
            text = "Switch input method now"
            setBackgroundColor(Color.parseColor("#4338ca"))
            setTextColor(Color.WHITE)
            textSize = 13f
            setOnClickListener { showInputMethodPicker() }
        }
        layout.addView(switchNowButton)

        layout.addView(spacer(24))

        val lexiconTitle = TextView(this).apply {
            text = "gboard Chinese lexicon (built-in by default)"
            textSize = 14f
            setTextColor(Color.parseColor("#a5b4fc"))
            setPadding(0, 0, 0, 8)
        }
        layout.addView(lexiconTitle)

        lexiconStatusText = TextView(this).apply {
            textSize = 12f
            setTextColor(Color.parseColor("#93c5fd"))
            setPadding(0, 0, 0, 8)
        }
        layout.addView(lexiconStatusText)

        val lexiconNote = TextView(this).apply {
            text = "High-frequency gboard-style Chinese lexicon is bundled by default; no download required."
            textSize = 12f
            setTextColor(Color.parseColor("#c7d2fe"))
        }
        layout.addView(lexiconNote)

        layout.addView(spacer(24))

        val backendLabel = TextView(this).apply {
            text = "App internal backend core"
            textSize = 14f
            setTextColor(Color.parseColor("#a5b4fc"))
            setPadding(0, 0, 0, 8)
        }
        layout.addView(backendLabel)

        agentBackendStatusText = TextView(this).apply {
            textSize = 12f
            setTextColor(Color.parseColor("#93c5fd"))
            setPadding(0, 0, 0, 8)
        }
        layout.addView(agentBackendStatusText)

        val backendNote = TextView(this).apply {
            text = "Keyboard is frontend-only; all complex tasks run through the app internal backend service."
            textSize = 12f
            setTextColor(Color.parseColor("#c7d2fe"))
        }
        layout.addView(backendNote)

        layout.addView(spacer(18))

        val uiModeLabel = TextView(this).apply {
            text = "User Interface Mode"
            textSize = 14f
            setTextColor(Color.parseColor("#a5b4fc"))
            setPadding(0, 0, 0, 8)
        }
        layout.addView(uiModeLabel)

        developerModeStatusText = TextView(this).apply {
            textSize = 12f
            setTextColor(Color.parseColor("#93c5fd"))
            setPadding(0, 0, 0, 8)
        }
        layout.addView(developerModeStatusText)

        if (isEngineeringBuild) {
            val toggleDeveloperButton = Button(this).apply {
                text = "Toggle Developer Mode"
                setBackgroundColor(Color.parseColor("#334155"))
                setTextColor(Color.WHITE)
                textSize = 13f
                setOnClickListener {
                    val current = UiModePreferences.isDeveloperModeEnabled(this@SettingsActivity)
                    UiModePreferences.setDeveloperModeEnabled(this@SettingsActivity, !current)
                    updateDeveloperModeStatus()
                }
            }
            layout.addView(toggleDeveloperButton)
        }

        val instructions = TextView(this).apply {
            text = """
                
                📱 Usage:
                1. Enable and select Lumi Keyboard
                2. Switch to ZH and type pinyin directly (default lexicon is bundled)
                3. Tap "Open IME" on keyboard to quickly switch to Fcitx5/Trime
                4. Long press Space for Agent Mode, then launch app for complex tasks
            """.trimIndent()
            textSize = 13f
            setTextColor(Color.parseColor("#a5b4fc"))
            setPadding(0, 28, 0, 0)
        }
        layout.addView(instructions)

        setContentView(layout)

        checkKeyboardStatus()
        updateChineseImeStatus()
        updateLexiconStatus()
        updateAgentBackendStatus()
        updateDeveloperModeStatus()
    }

    override fun onResume() {
        super.onResume()
        checkKeyboardStatus()
        updateChineseImeStatus()
        updateLexiconStatus()
        updateAgentBackendStatus()
        updateDeveloperModeStatus()
    }

    private fun spacer(height: Int): TextView {
        return TextView(this).apply { setPadding(0, height, 0, 0) }
    }

    private fun openInputMethodSettings() {
        startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
    }

    private fun showInputMethodPicker() {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
        imm.showInputMethodPicker()
    }

    private fun checkKeyboardStatus() {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as? InputMethodManager
        val enabled = runCatching {
            imm?.enabledInputMethodList?.any { info ->
                info.packageName == packageName
            } == true
        }.getOrDefault(false)

        if (enabled) {
            statusText.text = "✅ Lumi Keyboard enabled"
            statusText.setTextColor(Color.parseColor("#22c55e"))
        } else {
            statusText.text = "⚠️ Please enable Lumi Keyboard first"
            statusText.setTextColor(Color.parseColor("#fbbf24"))
        }
    }

    private fun updateChineseImeStatus() {
        val preferred = getPreferredChineseImePackage()
        val preferredLabel = when (preferred) {
            FCITX_PACKAGE -> "Fcitx5"
            TRIME_PACKAGE -> "Trime"
            else -> preferred
        }
        val fcitxInstalled = isPackageInstalled(FCITX_PACKAGE)
        val trimeInstalled = isPackageInstalled(TRIME_PACKAGE)
        chineseImeStatusText.text =
            "Current preference: $preferredLabel | Fcitx5: ${if (fcitxInstalled) "Installed" else "Not installed"} | Trime: ${if (trimeInstalled) "Installed" else "Not installed"}"
    }

    private fun updateLexiconStatus() {
        lexiconStatusText.text = "Lexicon status: built-in high-frequency gboard entries + local learning"
    }

    private fun updateAgentBackendStatus() {
        agentBackendStatusText.text = "Run mode: App internal backend core (Binder + Foreground Service)"
    }

    private fun updateDeveloperModeStatus() {
        if (!isEngineeringBuild) {
            developerModeStatusText.text = "Current mode: User mode (fixed, result-only)"
            return
        }
        val enabled = UiModePreferences.isDeveloperModeEnabled(this)
        developerModeStatusText.text = if (enabled) {
            "Current mode: Developer mode (shows task track, evidence, trace)"
        } else {
            "Current mode: User mode (result-only)"
        }
    }

    private fun isPackageInstalled(packageName: String): Boolean {
        return runCatching {
            @Suppress("DEPRECATION")
            packageManager.getPackageInfo(packageName, 0)
            true
        }.getOrDefault(false)
    }

    private fun getPreferredChineseImePackage(): String {
        return getSharedPreferences(PREF_NAME, MODE_PRIVATE)
            .getString(KEY_PREFERRED_CHINESE_IME_PACKAGE, FCITX_PACKAGE)
            ?.trim()
            .takeUnless { it.isNullOrBlank() }
            ?: FCITX_PACKAGE
    }

    private fun setPreferredChineseImePackage(packageName: String) {
        getSharedPreferences(PREF_NAME, MODE_PRIVATE)
            .edit()
            .putString(KEY_PREFERRED_CHINESE_IME_PACKAGE, packageName)
            .apply()
    }

    companion object {
        private const val PREF_NAME = "lumi_ime_prefs"
        private const val KEY_PREFERRED_CHINESE_IME_PACKAGE = "preferred_chinese_ime_package"

        private const val FCITX_PACKAGE = "org.fcitx.fcitx5.android"
        private const val TRIME_PACKAGE = "com.osfans.trime"
    }
}
