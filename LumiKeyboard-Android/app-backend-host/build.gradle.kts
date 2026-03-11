plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.kapt")
}

fun String.escapeForBuildConfig(): String = this
    .replace("\\", "\\\\")
    .replace("\"", "\\\"")

android {
    namespace = "com.lumi.appbackend"
    compileSdk = 34

    val configuredBaseUrl = (
        (project.findProperty("lumiBaseUrl") as String?)
            ?: System.getenv("LUMI_BASE_URL")
            ?: "https://lumi-agent-simulator.vercel.app"
        ).trim().trimEnd('/')
    val configuredEnvironmentKind = (
        (project.findProperty("lumiEnvironmentKind") as String?)
            ?: System.getenv("LUMI_ENVIRONMENT_KIND")
            ?: "SIMULATOR"
        ).trim()
    val configuredEnvironmentLabel = (
        (project.findProperty("lumiEnvironmentLabel") as String?)
            ?: System.getenv("LUMI_ENVIRONMENT_LABEL")
            ?: "Simulator workspace"
        ).trim()
    val configuredTenantId = (
        (project.findProperty("lumiTenantId") as String?)
            ?: System.getenv("LUMI_TENANT_ID")
            ?: ""
        ).trim()
    val configuredWorkspaceId = (
        (project.findProperty("lumiWorkspaceId") as String?)
            ?: System.getenv("LUMI_WORKSPACE_ID")
            ?: ""
        ).trim()
    val configuredRequesterActorId = (
        (project.findProperty("lumiRequesterActorId") as String?)
            ?: System.getenv("LUMI_REQUESTER_ACTOR_ID")
            ?: ""
        ).trim()
    val configuredRequesterActorLabel = (
        (project.findProperty("lumiRequesterActorLabel") as String?)
            ?: System.getenv("LUMI_REQUESTER_ACTOR_LABEL")
            ?: ""
        ).trim()
    val configuredOperatorActorId = (
        (project.findProperty("lumiOperatorActorId") as String?)
            ?: System.getenv("LUMI_OPERATOR_ACTOR_ID")
            ?: ""
        ).trim()
    val configuredOperatorActorLabel = (
        (project.findProperty("lumiOperatorActorLabel") as String?)
            ?: System.getenv("LUMI_OPERATOR_ACTOR_LABEL")
            ?: ""
        ).trim()
    val configuredTenantAdminActorId = (
        (project.findProperty("lumiTenantAdminActorId") as String?)
            ?: System.getenv("LUMI_TENANT_ADMIN_ACTOR_ID")
            ?: ""
        ).trim()
    val configuredTenantAdminActorLabel = (
        (project.findProperty("lumiTenantAdminActorLabel") as String?)
            ?: System.getenv("LUMI_TENANT_ADMIN_ACTOR_LABEL")
            ?: ""
        ).trim()
    val demoModeEnabled = ((project.findProperty("lumiDemoModeEnabled") as String?)
        ?: System.getenv("LUMI_DEMO_MODE_ENABLED")
        ?: "true").toBoolean()
    val configuredGeminiApiKey = (
        (project.findProperty("lumiGeminiApiKey") as String?)
            ?: System.getenv("LUMI_GEMINI_API_KEY")
            ?: System.getenv("GEMINI_API_KEY")
            ?: ""
        ).trim()

    val imeBackendV2Enabled = ((project.findProperty("imeBackendV2Enabled") as String?) ?: "true").toBoolean()
    val appFullFeatureParityEnabled = ((project.findProperty("appFullFeatureParityEnabled") as String?) ?: "true").toBoolean()
    val digitalTwinCloudSyncEnabled = ((project.findProperty("digitalTwinCloudSyncEnabled") as String?) ?: "true").toBoolean()
    val digitalTwinEdgeModelMode = (
        (project.findProperty("digitalTwinEdgeModelMode") as String?) ?: "heuristic"
        ).trim().lowercase()
    val digitalTwinEdgeModelVersion = (
        (project.findProperty("digitalTwinEdgeModelVersion") as String?) ?: "twin-lite-heuristic-v1"
        ).trim()
    val cloudAdapterFallbackEnabled = ((project.findProperty("cloudAdapterFallbackEnabled") as String?) ?: "true").toBoolean()
    val routingScoreConfigJson = (
        (project.findProperty("lumiRoutingScoreConfigJson") as String?)
            ?: System.getenv("LUMI_ROUTING_SCORE_CONFIG_JSON")
            ?: ""
        ).trim()

    defaultConfig {
        minSdk = 26
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "LUMI_BASE_URL", "\"$configuredBaseUrl\"")
        buildConfigField("String", "LUMI_ENVIRONMENT_KIND", "\"${configuredEnvironmentKind.escapeForBuildConfig()}\"")
        buildConfigField("String", "LUMI_ENVIRONMENT_LABEL", "\"${configuredEnvironmentLabel.escapeForBuildConfig()}\"")
        buildConfigField("String", "LUMI_TENANT_ID", "\"${configuredTenantId.escapeForBuildConfig()}\"")
        buildConfigField("String", "LUMI_WORKSPACE_ID", "\"${configuredWorkspaceId.escapeForBuildConfig()}\"")
        buildConfigField("String", "LUMI_REQUESTER_ACTOR_ID", "\"${configuredRequesterActorId.escapeForBuildConfig()}\"")
        buildConfigField("String", "LUMI_REQUESTER_ACTOR_LABEL", "\"${configuredRequesterActorLabel.escapeForBuildConfig()}\"")
        buildConfigField("String", "LUMI_OPERATOR_ACTOR_ID", "\"${configuredOperatorActorId.escapeForBuildConfig()}\"")
        buildConfigField("String", "LUMI_OPERATOR_ACTOR_LABEL", "\"${configuredOperatorActorLabel.escapeForBuildConfig()}\"")
        buildConfigField("String", "LUMI_TENANT_ADMIN_ACTOR_ID", "\"${configuredTenantAdminActorId.escapeForBuildConfig()}\"")
        buildConfigField("String", "LUMI_TENANT_ADMIN_ACTOR_LABEL", "\"${configuredTenantAdminActorLabel.escapeForBuildConfig()}\"")
        buildConfigField("boolean", "LUMI_DEMO_MODE_ENABLED", demoModeEnabled.toString())
        buildConfigField(
            "String",
            "LUMI_GEMINI_API_KEY",
            "\"${configuredGeminiApiKey.escapeForBuildConfig()}\""
        )
        buildConfigField("boolean", "IME_BACKEND_V2_ENABLED", imeBackendV2Enabled.toString())
        buildConfigField("boolean", "APP_FULL_FEATURE_PARITY_ENABLED", appFullFeatureParityEnabled.toString())
        buildConfigField("boolean", "DIGITAL_TWIN_CLOUD_SYNC_ENABLED", digitalTwinCloudSyncEnabled.toString())
        buildConfigField(
            "String",
            "DIGITAL_TWIN_EDGE_MODEL_MODE",
            "\"${digitalTwinEdgeModelMode.escapeForBuildConfig()}\""
        )
        buildConfigField(
            "String",
            "DIGITAL_TWIN_EDGE_MODEL_VERSION",
            "\"${digitalTwinEdgeModelVersion.escapeForBuildConfig()}\""
        )
        buildConfigField("boolean", "CLOUD_ADAPTER_FALLBACK_ENABLED", cloudAdapterFallbackEnabled.toString())
        buildConfigField(
            "String",
            "LUMI_ROUTING_SCORE_CONFIG_JSON",
            "\"${routingScoreConfigJson.escapeForBuildConfig()}\""
        )
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
        viewBinding = false
        compose = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.4"
    }
}

dependencies {
    implementation(project(":core-agent"))
    implementation(project(":core-domain"))
    implementation(project(":cloud-adapters"))

    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.activity:activity-compose:1.8.2")

    val composeBom = platform("androidx.compose:compose-bom:2024.02.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")
    implementation("net.zetetic:android-database-sqlcipher:4.5.4")
    implementation("androidx.sqlite:sqlite-ktx:2.4.0")
    implementation("org.tensorflow:tensorflow-lite:2.14.0")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")

    testImplementation("junit:junit:4.13.2")
    testImplementation("androidx.test:core:1.5.0")

    androidTestImplementation(composeBom)
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation("androidx.test.uiautomator:uiautomator:2.3.0")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
