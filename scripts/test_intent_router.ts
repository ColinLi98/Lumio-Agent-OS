/**
 * Quick CLI test for Intent Router
 * Run: npx tsx scripts/test_intent_router.ts
 */

import { routeIntent, testRouting } from '../services/intentRouterService';

console.log('\n===== Intent Router Test Suite =====\n');

const testCases = [
    // Ticketing
    '帮我买北京到上海明天的火车票',
    '周末去成都的机票',
    '演唱会门票',
    '12306买票',

    // Commerce
    'iPhone 16 Pro Max 多少钱',
    '买个便宜的耳机',
    '淘宝搜索华为手机',

    // Travel 
    '订个酒店',
    '办理日本签证',

    // Food
    '点外卖',
    '美团订餐',

    // Local Service
    '找个保洁阿姨',
    '搬家公司联系方式',

    // Talent
    '找个设计师做logo',
    '程序员帮我写代码',

    // Mixed (should prefer higher priority)
    '买火车票价格对比',  // ticketing > commerce
];

const results = testRouting(testCases);

console.log('Query'.padEnd(40) + 'Domain'.padEnd(15) + 'Subtype'.padEnd(20) + 'Confidence'.padEnd(12) + 'Blocklist');
console.log('-'.repeat(100));

for (const result of results) {
    console.log(
        result.query.slice(0, 38).padEnd(40) +
        result.domain.padEnd(15) +
        result.subtype.padEnd(20) +
        result.confidence.toFixed(2).padEnd(12) +
        result.blocklist.join(', ')
    );
}

console.log('\n===== Test Complete =====\n');

// Summary
const domainCounts: Record<string, number> = {};
for (const r of results) {
    domainCounts[r.domain] = (domainCounts[r.domain] || 0) + 1;
}

console.log('Domain Distribution:');
for (const [domain, count] of Object.entries(domainCounts)) {
    console.log(`  ${domain}: ${count}`);
}

// Check ticketing blocklist
const ticketingResults = results.filter(r => r.domain === 'ticketing');
const allBlockEcommerce = ticketingResults.every(r => r.blocklist.includes('ecommerce'));
console.log(`\nTicketing intents block ecommerce: ${allBlockEcommerce ? '✅ YES' : '❌ NO'}`);
