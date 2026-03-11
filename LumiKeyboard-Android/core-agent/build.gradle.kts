plugins {
    kotlin("jvm")
    kotlin("plugin.serialization")
}

val jvmToolchainVersion = if (
    org.gradle.api.JavaVersion.current().isCompatibleWith(org.gradle.api.JavaVersion.VERSION_21)
) {
    21
} else {
    17
}

dependencies {
    implementation(project(":core-domain"))
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")

    testImplementation(kotlin("test"))
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
}

kotlin {
    jvmToolchain(jvmToolchainVersion)
}
