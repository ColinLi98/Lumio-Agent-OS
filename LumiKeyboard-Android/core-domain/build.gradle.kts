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
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
    testImplementation(kotlin("test"))
}

kotlin {
    jvmToolchain(jvmToolchainVersion)
}
