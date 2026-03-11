package com.lumi.cloudadapters

data class CloudAdapterConfig(
    val baseUrl: String,
    val geminiApiKey: String? = null,
    val connectTimeoutMs: Long = 10_000,
    val readTimeoutMs: Long = 0,
    val writeTimeoutMs: Long = 10_000,
    val callTimeoutMs: Long = 0
)

object CloudBaseUrlResolver {
    private const val DEFAULT_BASE_URL = "https://lumi-agent-simulator.vercel.app"

    fun resolve(
        explicit: String? = null,
        environment: Map<String, String> = System.getenv()
    ): String {
        val raw = explicit
            ?: environment["LUMI_BASE_URL"]
            ?: environment["VITE_LUMI_BASE_URL"]
            ?: DEFAULT_BASE_URL
        return raw.trim().trimEnd('/')
    }
}
