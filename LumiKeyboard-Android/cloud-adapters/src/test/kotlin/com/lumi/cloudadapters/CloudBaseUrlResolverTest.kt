package com.lumi.cloudadapters

import kotlin.test.Test
import kotlin.test.assertEquals

class CloudBaseUrlResolverTest {

    @Test
    fun resolve_prefersExplicitValue() {
        val value = CloudBaseUrlResolver.resolve(
            explicit = "https://demo.example.com/",
            environment = emptyMap()
        )

        assertEquals("https://demo.example.com", value)
    }

    @Test
    fun resolve_fallsBackToEnv() {
        val value = CloudBaseUrlResolver.resolve(
            explicit = null,
            environment = mapOf("LUMI_BASE_URL" to "https://lumi.example.com")
        )

        assertEquals("https://lumi.example.com", value)
    }
}
