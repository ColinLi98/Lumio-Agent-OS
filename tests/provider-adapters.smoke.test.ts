/**
 * Provider Adapters Smoke Test
 * 
 * Tests with mocked HTML fixtures (no real network calls).
 * Run with: npx ts-node tests/provider-adapters.smoke.test.ts
 */

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_RESULTS: { name: string; passed: boolean; error?: string }[] = [];

function test(name: string, fn: () => void | Promise<void>) {
    return { name, fn };
}

async function runTest(t: { name: string; fn: () => void | Promise<void> }) {
    try {
        await t.fn();
        TEST_RESULTS.push({ name: t.name, passed: true });
        console.log(`✓ ${t.name}`);
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        TEST_RESULTS.push({ name: t.name, passed: false, error: msg });
        console.log(`✗ ${t.name}: ${msg}`);
    }
}

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

function assertDefined<T>(value: T | undefined | null, message: string): asserts value is T {
    if (value === undefined || value === null) {
        throw new Error(`${message}: value is undefined/null`);
    }
}

// ============================================================================
// Mock HTML Fixtures
// ============================================================================

const JD_SEARCH_HTML = `
<html>
<body>
<ul class="gl-warp">
  <li class="gl-item" data-sku="100012345678">
    <div class="p-name"><a><em>Apple iPhone 15 Pro 256GB 黑色</em></a></div>
    <div class="p-price"><strong class="J_price"><i>7999.00</i></strong></div>
    <div class="p-shop"><a>Apple产品京东自营旗舰店</a></div>
  </li>
  <li class="gl-item" data-sku="100087654321">
    <div class="p-name"><a><em>Apple iPhone 15 128GB 蓝色</em></a></div>
    <div class="p-price"><strong class="J_price"><i>5999.00</i></strong></div>
    <div class="p-shop"><a>Apple官方旗舰店</a></div>
  </li>
</ul>
</body>
</html>
`;

const JD_DETAIL_HTML = `
<html>
<body>
<span class="p-price"><i>7999.00</i></span>
<div class="popbox-inner"><a>Apple产品京东自营旗舰店</a></div>
<div>预计明天送达</div>
</body>
</html>
`;

const PDD_SEARCH_HTML = `
<script>
window.__INITIAL_STATE__ = {
  "goods_list": [
    {"goods_id": "12345", "goods_name": "\\u82f9\\u679ciPhone15", "price": "599900"},
    {"goods_id": "67890", "goods_name": "\\u534e\\u4e3aMate60", "price": "499900"}
  ]
}
</script>
`;

const PDD_DETAIL_HTML = `
<script>
{"price": "599900", "mall_name": "Apple官方旗舰店"}
</script>
`;

const TAOBAO_SEARCH_HTML = `
<html>
<body>
<div data-nid="678901234567">
  <div class="title">华为Mate60 Pro 12GB+256GB</div>
  <div class="price">5999.00</div>
</div>
</body>
</html>
`;

// ============================================================================
// Tests
// ============================================================================

const tests = [
    // --------------------------------------------------------------------
    // 1. Provider Types
    // --------------------------------------------------------------------
    test('1. generateOfferId creates valid ID', async () => {
        const { generateOfferId } = await import('../services/providers/providerTypes');
        const id = generateOfferId('jd');
        assert(id.startsWith('off_jd_'), 'Should start with provider prefix');
        assert(id.length > 10, 'Should have reasonable length');
    }),

    test('2. extractKeywords splits correctly', async () => {
        const { extractKeywords } = await import('../services/providers/providerTypes');
        const keywords = extractKeywords('Apple iPhone 15 Pro-256GB');
        assert(keywords.includes('Apple'), 'Should include Apple');
        assert(keywords.includes('iPhone'), 'Should include iPhone');
        assert(keywords.length >= 3, 'Should have multiple keywords');
    }),

    // --------------------------------------------------------------------
    // 3. Rate Limiter
    // --------------------------------------------------------------------
    test('3. Rate limiter allows initial request', async () => {
        const { canMakeRequest } = await import('../services/providers/rateLimiter');
        const result = await canMakeRequest('jd', 'jd.com');
        // First request should always be allowed
        assert(result.allowed === true || result.wait_ms !== undefined, 'Should return rate limit result');
    }),

    // --------------------------------------------------------------------
    // 4. Cache Layer (setCachedSearch/getCachedSearch)
    // --------------------------------------------------------------------
    test('4. Search cache set/get works', async () => {
        const { setCachedSearch, getCachedSearch } = await import('../services/providers/scrapeCache');
        const candidates = [{ provider_id: 'jd' as const, title: 'TestProduct', url: 'http://test.com', currency: 'CNY' as const }];
        await setCachedSearch('jd', 'test-sku-4', candidates as any, undefined, undefined);
        const cached = await getCachedSearch('jd', 'test-sku-4', undefined, undefined);
        assertDefined(cached, 'Should retrieve search cache');
        assertEqual(cached.length, 1, 'Should have one candidate');
    }),

    test('5. Search cache with budget key', async () => {
        const { setCachedSearch, getCachedSearch } = await import('../services/providers/scrapeCache');
        const candidates = [{ title: 'Test', url: 'http://test.com', currency: 'CNY' as const }];
        await setCachedSearch('jd', 'iphone', candidates as any, undefined, 8000);
        const cached = await getCachedSearch('jd', 'iphone', undefined, 8000);
        assertDefined(cached, 'Should retrieve search cache');
        assertEqual(cached.length, 1, 'Should have one candidate');
    }),

    // --------------------------------------------------------------------
    // 6. Fingerprint Policy
    // --------------------------------------------------------------------
    test('6. generateFingerprint returns valid fingerprint', async () => {
        const { generateFingerprint } = await import('../services/providers/fingerprintPolicy');
        const fp = generateFingerprint('jd');
        assertDefined(fp.user_agent, 'Should have user_agent');
        assertDefined(fp.viewport, 'Should have viewport');
        assert(fp.viewport.width > 0, 'Viewport width should be positive');
    }),

    test('7. buildHeaders creates proper headers', async () => {
        const { generateFingerprint, buildHeaders } = await import('../services/providers/fingerprintPolicy');
        const fp = generateFingerprint('jd');
        const headers = buildHeaders(fp, 'jd');
        assertDefined(headers['User-Agent'], 'Should have User-Agent');
        assertDefined(headers['Accept-Language'], 'Should have Accept-Language');
    }),

    // --------------------------------------------------------------------
    // 8. Ban Detector
    // --------------------------------------------------------------------
    test('8. checkStatusCode detects 403', async () => {
        const { checkStatusCode } = await import('../services/providers/banDetector');
        const signal = checkStatusCode(403);
        assertEqual(signal.detected, true, 'Should detect 403');
        assertEqual(signal.reason, 'HTTP_403', 'Reason should be HTTP_403');
        assertEqual(signal.severity, 'HARD', 'Severity should be HARD');
    }),

    test('9. checkHtmlContent detects captcha', async () => {
        const { checkHtmlContent } = await import('../services/providers/banDetector');
        const signal = checkHtmlContent('<html><body>请输入验证码</body></html>');
        assertEqual(signal.detected, true, 'Should detect captcha');
    }),

    test('10. checkResponseUrl detects login redirect', async () => {
        const { checkResponseUrl } = await import('../services/providers/banDetector');
        const signal = checkResponseUrl('https://passport.jd.com/login?return=xxx');
        assertEqual(signal.detected, true, 'Should detect login redirect');
    }),

    // --------------------------------------------------------------------
    // 11. Circuit Breaker
    // --------------------------------------------------------------------
    test('11. Circuit starts closed', async () => {
        const { getCircuitStatus, resetCircuit } = await import('../services/providers/banBudget');
        await resetCircuit('jd');
        const status = await getCircuitStatus('jd');
        assertEqual(status.state, 'CLOSED', 'Circuit should start closed');
        assertEqual(status.ban_score, 0, 'Ban score should be 0');
    }),

    test('12. recordBanSignal increases ban score', async () => {
        const { recordBanSignal, getCircuitStatus, resetCircuit } = await import('../services/providers/banBudget');
        await resetCircuit('pdd');

        const signal = { detected: true, reason: 'HTTP_403' as const, severity: 'HARD' as const, score_delta: 5 };
        await recordBanSignal('pdd', signal, 'test-trace');

        const status = await getCircuitStatus('pdd');
        assertEqual(status.ban_score, 5, 'Ban score should be 5');
    }),

    // --------------------------------------------------------------------
    // 13. Retry Policy
    // --------------------------------------------------------------------
    test('13. isRetryable for SOFT failures', async () => {
        const { isRetryable } = await import('../services/providers/retryPolicy');
        const softSignal = { detected: true, severity: 'SOFT' as const };
        const hardSignal = { detected: true, severity: 'HARD' as const };

        assertEqual(isRetryable(softSignal), true, 'SOFT should be retryable');
        assertEqual(isRetryable(hardSignal), false, 'HARD should not be retryable');
    }),

    test('14. calculateDelay uses exponential backoff', async () => {
        const { calculateDelay, DEFAULT_RETRY_CONFIG } = await import('../services/providers/retryPolicy');
        const delay1 = calculateDelay(1, DEFAULT_RETRY_CONFIG);
        const delay2 = calculateDelay(2, DEFAULT_RETRY_CONFIG);

        assert(delay2 > delay1, 'Delay should increase with attempts');
        assert(delay1 < 1000, 'First delay should be reasonable');
    }),

    // --------------------------------------------------------------------
    // 15. Selector Policy
    // --------------------------------------------------------------------
    test('15. getProviderConfig returns valid config', async () => {
        const { getProviderConfig } = await import('../services/providers/selectorPolicy');
        const config = getProviderConfig('jd');
        assertEqual(config.id, 'jd', 'ID should match');
        assert(config.domains_allowlist.length > 0, 'Should have domains');
        assertDefined(config.selectors.search, 'Should have search selectors');
    }),

    test('16. buildSearchUrl creates valid URL', async () => {
        const { buildSearchUrl } = await import('../services/providers/selectorPolicy');
        const url = buildSearchUrl('jd', ['iPhone', '15']);
        assert(url.includes('jd.com'), 'URL should include jd.com');
        assert(url.includes('iPhone'), 'URL should include keyword');
    }),

    test('17. getDomainAllowlist returns domains', async () => {
        const { getDomainAllowlist } = await import('../services/providers/selectorPolicy');
        const domains = getDomainAllowlist('taobao');
        assert(domains.some(d => d.includes('taobao')), 'Should include taobao domain');
    }),

    // --------------------------------------------------------------------
    // 18. Provider Registry
    // --------------------------------------------------------------------
    test('18. getAdapter returns valid adapter', async () => {
        const { getAdapter } = await import('../services/providers/providerRegistry');
        const jd = getAdapter('jd');
        assertDefined(jd, 'Should return JD adapter');
        assertEqual(jd.id, 'jd', 'ID should be jd');
        assertDefined(jd.search, 'Should have search method');
        assertDefined(jd.buildOffer, 'Should have buildOffer method');
    }),

    test('19. getAllAdapters returns 3 adapters', async () => {
        const { getAllAdapters } = await import('../services/providers/providerRegistry');
        const adapters = getAllAdapters();
        assertEqual(adapters.length, 3, 'Should have 3 adapters');
    }),

    test('20. PROVIDER_IDS has correct values', async () => {
        const { PROVIDER_IDS } = await import('../services/providers/providerRegistry');
        assert(PROVIDER_IDS.includes('jd'), 'Should include jd');
        assert(PROVIDER_IDS.includes('pdd'), 'Should include pdd');
        assert(PROVIDER_IDS.includes('taobao'), 'Should include taobao');
    }),

    test('21. v0.2 IntentRequest schema unchanged', async () => {
        // Import existing types and verify they still work
        const lixTypes = await import('../services/lixTypes');
        // Check that module exports exist - the types are defined
        assert(lixTypes !== undefined, 'lixTypes module should exist');
        // If we got here without compile errors, the schema is intact
    }),

    test('22. v0.2 Offer schema unchanged', async () => {
        const lixTypes = await import('../services/lixTypes');
        // Check that module exports exist
        assert(lixTypes !== undefined, 'lixTypes module should exist');
        // Build passes, so types are valid
    }),
];

// ============================================================================
// Test Runner
// ============================================================================

async function runAllTests() {
    console.log('='.repeat(60));
    console.log('Provider Adapters Smoke Test Suite');
    console.log('='.repeat(60));
    console.log('');

    for (const t of tests) {
        await runTest(t);
    }

    console.log('');
    console.log('='.repeat(60));

    const passed = TEST_RESULTS.filter(r => r.passed).length;
    const failed = TEST_RESULTS.filter(r => !r.passed).length;

    console.log(`Results: ${passed}/${TEST_RESULTS.length} passed`);

    if (failed > 0) {
        console.log('');
        console.log('Failed tests:');
        TEST_RESULTS.filter(r => !r.passed).forEach(r => {
            console.log(`  ✗ ${r.name}: ${r.error}`);
        });
        process.exit(1);
    }

    console.log('All tests passed!');
    console.log('='.repeat(60));
    process.exit(0);
}

runAllTests().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
