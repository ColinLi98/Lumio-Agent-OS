package com.lumi.keyboard

import android.content.Context
import android.net.Uri
import android.util.Log
import java.io.BufferedReader
import java.io.InputStreamReader

class ChineseLexiconEngine(private val context: Context) {

    data class ImportResult(
        val totalLines: Int,
        val importedEntries: Int,
        val duplicateEntries: Int,
        val invalidLines: Int,
        val error: String? = null
    )

    companion object {
        private const val TAG = "ChineseLexiconEngine"
        private const val USER_LEXICON_FILE = "gboard_zh_lexicon.tsv"
        private const val SEED_LEXICON_ASSET = "fcitx_gboard_seed.tsv"
        private val CJK_REGEX = Regex("[\\u4e00-\\u9fff]+")

        internal data class ParsedEntry(
            val pinyin: String,
            val word: String,
            val weight: Int
        )

        internal fun normalizePinyin(raw: String): String {
            if (raw.isBlank()) return ""
            return raw.lowercase()
                .replace(Regex("[^a-z]"), "")
        }

        internal fun parseImportLine(rawLine: String): ParsedEntry? {
            val line = rawLine.trim()
            if (line.isEmpty() || line.startsWith("#") || line.startsWith("//")) return null

            val tokens = line.split(',', '\t', ' ')
                .map { it.trim() }
                .filter { it.isNotEmpty() }
            if (tokens.size < 2) return null

            var detectedWord: String? = null
            val pinyinParts = mutableListOf<String>()
            var weight = 100

            for (token in tokens) {
                if (detectedWord == null && CJK_REGEX.containsMatchIn(token)) {
                    detectedWord = token
                    continue
                }
                val numeric = token.toIntOrNull()
                if (numeric != null) {
                    weight = numeric.coerceAtLeast(1)
                    continue
                }
                val normalized = normalizePinyin(token)
                if (normalized.isNotEmpty()) {
                    pinyinParts.add(normalized)
                }
            }

            val pinyin = pinyinParts.joinToString("")
            val word = detectedWord?.trim().orEmpty()
            if (pinyin.isEmpty() || word.isEmpty()) return null
            if (!CJK_REGEX.containsMatchIn(word)) return null
            return ParsedEntry(pinyin = pinyin, word = word, weight = weight)
        }

        internal fun parseStoredLine(rawLine: String): ParsedEntry? {
            val parts = rawLine.split('\t')
            if (parts.size < 2) return null
            val pinyin = normalizePinyin(parts[0])
            val word = parts[1].trim()
            val weight = parts.getOrNull(2)?.toIntOrNull()?.coerceAtLeast(1) ?: 100
            if (pinyin.isEmpty() || word.isEmpty()) return null
            return ParsedEntry(pinyin, word, weight)
        }
    }

    private val lock = Any()
    private val baseDict: MutableMap<String, MutableMap<String, Int>> = linkedMapOf()
    private val userDict: MutableMap<String, MutableMap<String, Int>> = linkedMapOf()

    init {
        loadBaseDictionary()
        loadUserDictionary()
    }

    fun queryCandidates(rawPinyin: String, limit: Int = 8): List<String> {
        val normalized = normalizePinyin(rawPinyin)
        if (normalized.isEmpty()) return emptyList()

        val scores = linkedMapOf<String, Int>()
        synchronized(lock) {
            addExactCandidates(scores, userDict, normalized, 200_000)
            addExactCandidates(scores, baseDict, normalized, 100_000)
            addPrefixCandidates(scores, userDict, normalized, 50_000)
            addPrefixCandidates(scores, baseDict, normalized, 10_000)
        }

        if (scores.isEmpty()) return listOf(normalized)

        return scores.entries
            .sortedWith(
                compareByDescending<Map.Entry<String, Int>> { it.value }
                    .thenBy { it.key.length }
                    .thenBy { it.key }
            )
            .map { it.key }
            .take(limit)
    }

    fun learnSelection(rawPinyin: String, selectedWord: String) {
        val pinyin = normalizePinyin(rawPinyin)
        val word = selectedWord.trim()
        if (pinyin.isEmpty() || word.isEmpty()) return
        synchronized(lock) {
            val bucket = userDict.getOrPut(pinyin) { linkedMapOf() }
            bucket[word] = (bucket[word] ?: 0) + 5
            persistUserDictionary()
        }
    }

    fun importFromUri(uri: Uri): ImportResult {
        return runCatching {
            context.contentResolver.openInputStream(uri)?.use { input ->
                BufferedReader(InputStreamReader(input)).use { reader ->
                    importFromReader(reader)
                }
            } ?: ImportResult(
                totalLines = 0,
                importedEntries = 0,
                duplicateEntries = 0,
                invalidLines = 0,
                error = "Unable to read lexicon file"
            )
        }.getOrElse { error ->
            Log.e(TAG, "Failed to import lexicon", error)
            ImportResult(
                totalLines = 0,
                importedEntries = 0,
                duplicateEntries = 0,
                invalidLines = 0,
                error = error.message ?: "Lexicon import failed"
            )
        }
    }

    fun getLexiconSummary(): String {
        val baseCount = synchronized(lock) { countEntries(baseDict) }
        val userCount = synchronized(lock) { countEntries(userDict) }
        return "Built-in entries $baseCount | Imported entries $userCount"
    }

    private fun importFromReader(reader: BufferedReader): ImportResult {
        var total = 0
        var imported = 0
        var duplicated = 0
        var invalid = 0

        synchronized(lock) {
            reader.forEachLine { line ->
                total += 1
                val parsed = parseImportLine(line)
                if (parsed == null) {
                    invalid += 1
                    return@forEachLine
                }
                val bucket = userDict.getOrPut(parsed.pinyin) { linkedMapOf() }
                val existing = bucket[parsed.word]
                if (existing == null) {
                    bucket[parsed.word] = parsed.weight
                    imported += 1
                } else {
                    bucket[parsed.word] = maxOf(existing, parsed.weight)
                    duplicated += 1
                }
            }
            persistUserDictionary()
        }

        return ImportResult(
            totalLines = total,
            importedEntries = imported,
            duplicateEntries = duplicated,
            invalidLines = invalid
        )
    }

    private fun addExactCandidates(
        scores: MutableMap<String, Int>,
        source: Map<String, Map<String, Int>>,
        pinyin: String,
        boost: Int
    ) {
        source[pinyin]?.forEach { (word, weight) ->
            val score = boost + weight
            val existing = scores[word]
            if (existing == null || existing < score) {
                scores[word] = score
            }
        }
    }

    private fun addPrefixCandidates(
        scores: MutableMap<String, Int>,
        source: Map<String, Map<String, Int>>,
        pinyin: String,
        boost: Int
    ) {
        if (scores.size >= 8) return
        source.entries
            .asSequence()
            .filter { (key, _) -> key.startsWith(pinyin) && key != pinyin }
            .sortedBy { (key, _) -> key.length }
            .take(12)
            .forEach { (key, words) ->
                val penalty = (key.length - pinyin.length) * 10
                words.forEach { (word, weight) ->
                    val score = boost + weight - penalty
                    val existing = scores[word]
                    if (existing == null || existing < score) {
                        scores[word] = score
                    }
                }
            }
    }

    private fun loadBaseDictionary() {
        baseDict.clear()
        runCatching {
            context.assets.open(SEED_LEXICON_ASSET).use { input ->
                BufferedReader(InputStreamReader(input)).use { reader ->
                    reader.forEachLine { line ->
                        val parsed = parseStoredLine(line) ?: return@forEachLine
                        val bucket = baseDict.getOrPut(parsed.pinyin) { linkedMapOf() }
                        val existing = bucket[parsed.word]
                        bucket[parsed.word] = if (existing == null) {
                            parsed.weight
                        } else {
                            maxOf(existing, parsed.weight)
                        }
                    }
                }
            }
        }.onFailure { error ->
            Log.w(TAG, "Failed to load base dictionary", error)
        }
    }

    private fun loadUserDictionary() {
        synchronized(lock) {
            userDict.clear()
            val file = context.filesDir.resolve(USER_LEXICON_FILE)
            if (!file.exists()) return
            runCatching {
                file.inputStream().use { input ->
                    BufferedReader(InputStreamReader(input)).use { reader ->
                        reader.forEachLine { line ->
                            val parsed = parseStoredLine(line) ?: return@forEachLine
                            val bucket = userDict.getOrPut(parsed.pinyin) { linkedMapOf() }
                            val existing = bucket[parsed.word]
                            bucket[parsed.word] = if (existing == null) {
                                parsed.weight
                            } else {
                                maxOf(existing, parsed.weight)
                            }
                        }
                    }
                }
            }.onFailure { error ->
                Log.w(TAG, "Failed to load user dictionary", error)
            }
        }
    }

    private fun persistUserDictionary() {
        val file = context.filesDir.resolve(USER_LEXICON_FILE)
        runCatching {
            file.outputStream().bufferedWriter().use { writer ->
                userDict.entries
                    .sortedBy { it.key }
                    .forEach { (pinyin, words) ->
                        words.entries
                            .sortedByDescending { it.value }
                            .forEach { (word, weight) ->
                                writer.append(pinyin)
                                    .append('\t')
                                    .append(word)
                                    .append('\t')
                                    .append(weight.toString())
                                    .append('\n')
                            }
                    }
            }
        }.onFailure { error ->
            Log.w(TAG, "Failed to persist user dictionary", error)
        }
    }

    private fun countEntries(dict: Map<String, Map<String, Int>>): Int {
        return dict.values.sumOf { it.size }
    }
}
