package com.lumi.keyboard

import com.lumi.appbackend.BuildConfig

object FeatureFlags {
    val imeBackendV2Enabled: Boolean = BuildConfig.IME_BACKEND_V2_ENABLED
    val appFullFeatureParityEnabled: Boolean = BuildConfig.APP_FULL_FEATURE_PARITY_ENABLED
    val digitalTwinCloudSyncEnabled: Boolean = BuildConfig.DIGITAL_TWIN_CLOUD_SYNC_ENABLED
    val digitalTwinEdgeModelMode: String = BuildConfig.DIGITAL_TWIN_EDGE_MODEL_MODE
    val digitalTwinEdgeModelVersion: String = BuildConfig.DIGITAL_TWIN_EDGE_MODEL_VERSION
    val cloudAdapterFallbackEnabled: Boolean = BuildConfig.CLOUD_ADAPTER_FALLBACK_ENABLED
}
