package com.lumi.keyboard

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.LinearLayout
import android.graphics.Color
import androidx.appcompat.app.AppCompatActivity

/**
 * Settings Activity for Lumi Keyboard
 * Allows users to configure API key and enable the keyboard
 */
class SettingsActivity : AppCompatActivity() {

    private lateinit var apiKeyInput: EditText
    private lateinit var enableButton: Button
    private lateinit var selectButton: Button
    private lateinit var statusText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Build UI programmatically
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#1e1b4b"))
            setPadding(48, 48, 48, 48)
        }

        // Title
        val titleText = TextView(this).apply {
            text = "✨ Lumi 智能键盘 设置"
            textSize = 24f
            setTextColor(Color.WHITE)
            setPadding(0, 0, 0, 48)
        }
        layout.addView(titleText)

        // Status indicator
        statusText = TextView(this).apply {
            text = "⚠️ 键盘未启用"
            textSize = 16f
            setTextColor(Color.parseColor("#fbbf24"))
            setPadding(0, 0, 0, 32)
        }
        layout.addView(statusText)

        // Enable keyboard button
        enableButton = Button(this).apply {
            text = "1️⃣ 启用 Lumi 键盘"
            setBackgroundColor(Color.parseColor("#4338ca"))
            setTextColor(Color.WHITE)
            textSize = 16f
            setPadding(32, 24, 32, 24)
            setOnClickListener {
                openInputMethodSettings()
            }
        }
        layout.addView(enableButton)

        // Spacer
        layout.addView(TextView(this).apply {
            setPadding(0, 16, 0, 16)
        })

        // Select keyboard button
        selectButton = Button(this).apply {
            text = "2️⃣ 选择 Lumi 作为输入法"
            setBackgroundColor(Color.parseColor("#4338ca"))
            setTextColor(Color.WHITE)
            textSize = 16f
            setPadding(32, 24, 32, 24)
            setOnClickListener {
                showInputMethodPicker()
            }
        }
        layout.addView(selectButton)

        // Spacer
        layout.addView(TextView(this).apply {
            setPadding(0, 32, 0, 16)
        })

        // API Key section
        val apiLabel = TextView(this).apply {
            text = "Gemini API Key (可选，用于 AI 功能)"
            textSize = 14f
            setTextColor(Color.parseColor("#a5b4fc"))
            setPadding(0, 0, 0, 8)
        }
        layout.addView(apiLabel)

        apiKeyInput = EditText(this).apply {
            hint = "输入您的 API Key..."
            setTextColor(Color.WHITE)
            setHintTextColor(Color.parseColor("#6366f1"))
            setBackgroundColor(Color.parseColor("#312e81"))
            setPadding(24, 24, 24, 24)
        }
        layout.addView(apiKeyInput)

        // Save button
        val saveButton = Button(this).apply {
            text = "保存 API Key"
            setBackgroundColor(Color.parseColor("#22c55e"))
            setTextColor(Color.WHITE)
            textSize = 14f
            setOnClickListener {
                saveApiKey()
            }
        }
        layout.addView(saveButton)

        // Instructions
        val instructions = TextView(this).apply {
            text = """
                
                📱 使用说明：
                
                1. 点击"启用 Lumi 键盘"
                2. 在设置中打开 Lumi 开关
                3. 返回后点击"选择 Lumi 作为输入法"
                4. 在任意输入框打字即可使用
                
                💡 Agent Mode：
                长按空格键进入 AI 助手模式
            """.trimIndent()
            textSize = 14f
            setTextColor(Color.parseColor("#a5b4fc"))
            setPadding(0, 48, 0, 0)
        }
        layout.addView(instructions)

        setContentView(layout)
        
        // Load saved API key
        loadApiKey()
        checkKeyboardStatus()
    }

    override fun onResume() {
        super.onResume()
        checkKeyboardStatus()
    }

    private fun openInputMethodSettings() {
        startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
    }

    private fun showInputMethodPicker() {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
        imm.showInputMethodPicker()
    }

    private fun saveApiKey() {
        val key = apiKeyInput.text.toString().trim()
        getSharedPreferences("lumi_prefs", MODE_PRIVATE)
            .edit()
            .putString("api_key", key)
            .apply()
        
        LumiAgent.setApiKey(key)
        
        // Show confirmation
        statusText.text = "✅ API Key 已保存"
        statusText.setTextColor(Color.parseColor("#22c55e"))
    }

    private fun loadApiKey() {
        val key = getSharedPreferences("lumi_prefs", MODE_PRIVATE)
            .getString("api_key", "") ?: ""
        
        apiKeyInput.setText(key)
        LumiAgent.setApiKey(key)
    }

    private fun checkKeyboardStatus() {
        val enabledInputMethods = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_INPUT_METHODS
        ) ?: ""

        val isEnabled = enabledInputMethods.contains(packageName)
        
        if (isEnabled) {
            statusText.text = "✅ Lumi 键盘已启用"
            statusText.setTextColor(Color.parseColor("#22c55e"))
        } else {
            statusText.text = "⚠️ 请先启用 Lumi 键盘"
            statusText.setTextColor(Color.parseColor("#fbbf24"))
        }
    }
}
