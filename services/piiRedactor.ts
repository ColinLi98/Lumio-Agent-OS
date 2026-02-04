/**
 * PII Redactor
 * Phase 3.2 Security: Redacts personally identifiable information
 * 
 * MUST be called before sending any user text to external search APIs.
 * Never sends raw private documents to web search.
 */

// ============================================================================
// Types
// ============================================================================

export interface RedactionResult {
    /** Redacted text safe for external APIs */
    redacted_text: string;
    /** Original text (for logging, NOT for external use) */
    original_text: string;
    /** Number of redactions made */
    redaction_count: number;
    /** Types of PII found */
    pii_types_found: PIIType[];
    /** Whether any PII was found */
    has_pii: boolean;
}

export type PIIType =
    | 'phone'
    | 'email'
    | 'id_card'
    | 'bank_card'
    | 'address'
    | 'name'
    | 'passport';

// ============================================================================
// Redaction Patterns
// ============================================================================

const PII_PATTERNS: Array<{
    type: PIIType;
    pattern: RegExp;
    replacement: string;
}> = [
        // Phone numbers (China mobile)
        {
            type: 'phone',
            pattern: /1[3-9]\d{9}/g,
            replacement: '[电话已隐藏]',
        },
        // Phone with separators
        {
            type: 'phone',
            pattern: /1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/g,
            replacement: '[电话已隐藏]',
        },
        // Landline
        {
            type: 'phone',
            pattern: /0\d{2,3}[-\s]?\d{7,8}/g,
            replacement: '[座机已隐藏]',
        },
        // Email addresses
        {
            type: 'email',
            pattern: /[\w.-]+@[\w.-]+\.\w{2,}/gi,
            replacement: '[邮箱已隐藏]',
        },
        // China ID card (18 digits)
        {
            type: 'id_card',
            pattern: /\d{17}[\dXx]/g,
            replacement: '[身份证号已隐藏]',
        },
        // China ID card (15 digits, old format)
        {
            type: 'id_card',
            pattern: /\d{15}/g,
            replacement: '[身份证号已隐藏]',
        },
        // Bank card (16-19 digits)
        {
            type: 'bank_card',
            pattern: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4,7}/g,
            replacement: '[银行卡号已隐藏]',
        },
        // Passport (G/E/S/P + 8 digits for China)
        {
            type: 'passport',
            pattern: /[GESP]\d{8}/gi,
            replacement: '[护照号已隐藏]',
        },
    ];

/**
 * Common address keywords for detection
 */
const ADDRESS_KEYWORDS = [
    '省', '市', '区', '县', '镇', '乡', '村',
    '街道', '路', '号', '栋', '单元', '室',
    '小区', '公寓', '大厦', '广场',
];

// ============================================================================
// Main Redactor
// ============================================================================

/**
 * Redact PII from text before sending to external APIs
 */
export function redactPII(text: string): RedactionResult {
    let redactedText = text;
    const piiTypesFound: PIIType[] = [];
    let redactionCount = 0;

    // Apply each pattern
    for (const { type, pattern, replacement } of PII_PATTERNS) {
        const matches = redactedText.match(pattern);
        if (matches && matches.length > 0) {
            redactionCount += matches.length;
            if (!piiTypesFound.includes(type)) {
                piiTypesFound.push(type);
            }
            redactedText = redactedText.replace(pattern, replacement);
        }
    }

    // Check for potential addresses (heuristic)
    const addressKeywordCount = ADDRESS_KEYWORDS.filter(kw =>
        redactedText.includes(kw)
    ).length;

    // If text has many address keywords + numbers, it might be an address
    if (addressKeywordCount >= 3 && /\d+/.test(redactedText)) {
        // Don't redact the entire thing, but flag it
        if (!piiTypesFound.includes('address')) {
            piiTypesFound.push('address');
        }
        // Log warning but don't redact (might break legitimate queries like "北京市朝阳区酒店")
        console.log('[PIIRedactor] Warning: Potential address detected, proceeding with caution');
    }

    return {
        redacted_text: redactedText,
        original_text: text,
        redaction_count: redactionCount,
        pii_types_found: piiTypesFound,
        has_pii: redactionCount > 0,
    };
}

/**
 * Check if text contains sensitive document content
 * (should NOT be sent to web search)
 */
export function containsSensitiveDocument(text: string): boolean {
    const sensitiveIndicators = [
        // Document types
        '合同', '协议', '保密', '机密',
        '工资单', '薪资', '银行流水',
        '病历', '诊断', '处方',
        '身份证正面', '身份证反面', '证件照',
        // Financial
        '账户余额', '转账记录', '交易明细',
        // Legal
        '判决书', '起诉书', '律师函',
    ];

    const matchCount = sensitiveIndicators.filter(ind =>
        text.includes(ind)
    ).length;

    // If multiple sensitive indicators found, consider it a document
    return matchCount >= 2;
}

/**
 * Sanitize query for external search
 * Returns null if query should NOT be sent externally
 */
export function sanitizeForExternalSearch(query: string): string | null {
    // Check for sensitive documents first
    if (containsSensitiveDocument(query)) {
        console.log('[PIIRedactor] BLOCKED: Query contains sensitive document content');
        return null;
    }

    // Redact PII
    const result = redactPII(query);

    // If too many redactions, query might be useless
    if (result.redaction_count > 3) {
        console.log('[PIIRedactor] Warning: Heavy redaction, query may not be useful');
    }

    return result.redacted_text;
}

// ============================================================================
// Exports
// ============================================================================

export default {
    redactPII,
    containsSensitiveDocument,
    sanitizeForExternalSearch,
};
