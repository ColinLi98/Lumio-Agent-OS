pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

// Disabled for local compatibility with Gradle 7.3.1 wrapper.
// We use an explicit local JDK (Android Studio JBR) instead of automatic toolchain resolution.
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "LumiKeyboard"
include(":app")
include(":ime-frontend")
include(":app-backend-host")
include(":core-agent")
include(":core-domain")
include(":cloud-adapters")
