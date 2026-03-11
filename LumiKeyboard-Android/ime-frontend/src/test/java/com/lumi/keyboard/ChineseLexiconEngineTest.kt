package com.lumi.keyboard

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ChineseLexiconEngineTest {

    @Test
    fun parseImportLine_parsesWordFirstFormat() {
        val parsed = ChineseLexiconEngine.parseImportLine("你好 ni hao 520")
        requireNotNull(parsed)
        assertEquals("你好", parsed.word)
        assertEquals("nihao", parsed.pinyin)
        assertEquals(520, parsed.weight)
    }

    @Test
    fun parseImportLine_parsesPinyinFirstFormat() {
        val parsed = ChineseLexiconEngine.parseImportLine("zhongguo,中国,900")
        requireNotNull(parsed)
        assertEquals("中国", parsed.word)
        assertEquals("zhongguo", parsed.pinyin)
        assertEquals(900, parsed.weight)
    }

    @Test
    fun parseImportLine_rejectsInvalidLine() {
        assertNull(ChineseLexiconEngine.parseImportLine("hello world"))
        assertNull(ChineseLexiconEngine.parseImportLine("# comment"))
    }

    @Test
    fun normalizePinyin_stripsNonLetters() {
        assertEquals("nihao", ChineseLexiconEngine.normalizePinyin("Ni-Hao3"))
        assertEquals("shijie", ChineseLexiconEngine.normalizePinyin("shi'jie"))
    }
}
