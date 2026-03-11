Place digital-twin edge model files here.

Runtime lookup rules:
- BuildConfig `DIGITAL_TWIN_EDGE_MODEL_VERSION` = `foo` -> loads `models/foo.tflite`
- BuildConfig `DIGITAL_TWIN_EDGE_MODEL_VERSION` = `foo.tflite` -> loads `models/foo.tflite`
- BuildConfig `DIGITAL_TWIN_EDGE_MODEL_VERSION` = `path/to/foo.tflite` -> loads that asset path directly

Current default version:
- `twin-lite-heuristic-v1` (if missing, runtime returns null and orchestration falls back to rules)
