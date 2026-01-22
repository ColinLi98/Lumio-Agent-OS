package com.lumi.keyboard

import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import java.io.IOException

/**
 * Lumi Agent - AI-powered input assistant
 * Handles processing of user requests and generating draft responses
 */
object LumiAgent {

    private val client = OkHttpClient()
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO)

    // Gemini API configuration
    private var apiKey: String = ""
    private const val GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

    fun setApiKey(key: String) {
        apiKey = key
    }

    fun process(input: String, callback: (AgentResult) -> Unit) {
        scope.launch {
            try {
                val result = processInput(input)
                withContext(Dispatchers.Main) {
                    callback(result)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    callback(getOfflineFallback(input))
                }
            }
        }
    }

    private suspend fun processInput(input: String): AgentResult {
        // If no API key, use offline fallback
        if (apiKey.isBlank()) {
            return getOfflineFallback(input)
        }

        // Prepare Gemini API request
        val prompt = buildPrompt(input)
        val requestBody = GeminiRequest(
            contents = listOf(Content(parts = listOf(Part(text = prompt))))
        )

        val request = Request.Builder()
            .url("$GEMINI_URL?key=$apiKey")
            .post(gson.toJson(requestBody).toRequestBody("application/json".toMediaType()))
            .build()

        return suspendCancellableCoroutine { continuation ->
            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    continuation.resume(getOfflineFallback(input)) {}
                }

                override fun onResponse(call: Call, response: Response) {
                    try {
                        val body = response.body?.string() ?: ""
                        val geminiResponse = gson.fromJson(body, GeminiResponse::class.java)
                        val generatedText = geminiResponse.candidates?.firstOrNull()
                            ?.content?.parts?.firstOrNull()?.text ?: ""

                        val drafts = parseDrafts(generatedText)
                        continuation.resume(AgentResult(drafts = drafts)) {}
                    } catch (e: Exception) {
                        continuation.resume(getOfflineFallback(input)) {}
                    }
                }
            })
        }
    }

    private fun buildPrompt(input: String): String {
        return """
            你是 Lumi，一个智能输入助手。用户输入了以下内容：
            "$input"
            
            请生成 3 个不同风格的回复草稿，格式如下：
            1. [专业] 回复内容
            2. [轻松] 回复内容
            3. [简洁] 回复内容
            
            每个回复应该简短（不超过 50 字），自然，适合即时通讯场景。
        """.trimIndent()
    }

    private fun parseDrafts(text: String): List<Draft> {
        val drafts = mutableListOf<Draft>()
        val lines = text.split("\n").filter { it.isNotBlank() }

        for (line in lines) {
            val cleanLine = line.trim()
                .removePrefix("1.")
                .removePrefix("2.")
                .removePrefix("3.")
                .trim()

            val tone = when {
                cleanLine.contains("[专业]") -> "professional"
                cleanLine.contains("[轻松]") -> "casual"
                cleanLine.contains("[简洁]") -> "concise"
                else -> "casual"
            }

            val content = cleanLine
                .replace("[专业]", "")
                .replace("[轻松]", "")
                .replace("[简洁]", "")
                .trim()

            if (content.isNotBlank()) {
                drafts.add(Draft(content, tone))
            }
        }

        return if (drafts.isNotEmpty()) drafts.take(3) else getOfflineFallback("").drafts
    }

    private fun getOfflineFallback(input: String): AgentResult {
        val text = input.lowercase()

        val drafts = when {
            text.contains("拒绝") || text.contains("decline") -> listOf(
                Draft("不好意思，这次可能去不了了，下次一定！", "casual"),
                Draft("很抱歉，我有其他安排，下次再约", "professional"),
                Draft("不行，去不了", "concise")
            )
            text.contains("感谢") || text.contains("谢谢") || text.contains("thanks") -> listOf(
                Draft("非常感谢你的帮助！", "warm"),
                Draft("Thanks a lot!", "casual"),
                Draft("谢谢！", "concise")
            )
            text.contains("确认") || text.contains("收到") || text.contains("confirm") -> listOf(
                Draft("好的，收到！", "concise"),
                Draft("没问题，我确认了", "casual"),
                Draft("已确认，谢谢通知", "professional")
            )
            else -> listOf(
                Draft("好的，我明白了。", "casual"),
                Draft("收到，谢谢", "concise"),
                Draft("了解，稍后回复你", "professional")
            )
        }

        return AgentResult(drafts = drafts)
    }
}

// Data classes for Gemini API
data class AgentResult(val drafts: List<Draft>)

data class GeminiRequest(val contents: List<Content>)
data class Content(val parts: List<Part>)
data class Part(val text: String)

data class GeminiResponse(
    val candidates: List<Candidate>?
)

data class Candidate(
    val content: ContentResponse?
)

data class ContentResponse(
    val parts: List<PartResponse>?
)

data class PartResponse(
    val text: String?
)
