/**
 * Selector Policy
 * L.I.X. Provider Adapter Layer
 * 
 * DOM selectors for each provider (search + detail pages).
 * Config-driven, not hardcoded - update here when sites change.
 */

import type { ProviderId, SearchSelectors, DetailSelectors, ProviderConfig } from './providerTypes.js';

// ============================================================================
// JD.com Selectors
// ============================================================================

const JD_SELECTORS: ProviderConfig = {
    id: 'jd',
    name: '京东',
    domains_allowlist: [
        'jd.com',
        'www.jd.com',
        'item.jd.com',
        'search.jd.com',
        'm.jd.com',
        'so.m.jd.com'
    ],
    rate_limit_per_min: 20,
    max_concurrency: 2,
    search_url_template: 'https://search.jd.com/Search?keyword={keywords}&enc=utf-8',
    selectors: {
        search: {
            item_container: [
                '.gl-item',
                '.j-sku-item',
                '[data-sku]',
                '.goods-item'
            ],
            title: [
                '.p-name em',
                '.p-name a',
                '.goods-title',
                '.title-text'
            ],
            price: [
                '.p-price strong i',
                '.p-price .J_price',
                '.goods-price',
                '[data-price]'
            ],
            link: [
                '.p-name a',
                '.goods-img a',
                'a.goods-link'
            ],
            shop_label: [
                '.p-shop a',
                '.shop-name',
                '.goods-shop'
            ],
            image: [
                '.p-img img',
                '.goods-img img',
                'img.main-img'
            ]
        },
        detail: {
            final_price: [
                '.price .p-price',
                '.summary-price .dd',
                '#jd-price',
                '.J-summary-price'
            ],
            stock_status: [
                '#store-selector a',
                '.stock-state',
                '#init-store-msg'
            ],
            delivery_eta: [
                '.ftx-01',
                '.ld-expect',
                '.dd.store-msg'
            ],
            shop_name: [
                '.popbox-inner a',
                '.J-hove-wrap .name a',
                '.shop-name'
            ],
            sku_options: [
                '.dd-im a',
                '.item-color-item',
                '.item-option'
            ]
        }
    }
};

// ============================================================================
// Pinduoduo Selectors
// ============================================================================

const PDD_SELECTORS: ProviderConfig = {
    id: 'pdd',
    name: '拼多多',
    domains_allowlist: [
        'pinduoduo.com',
        'www.pinduoduo.com',
        'yangkeduo.com',
        'mobile.yangkeduo.com',
        'm.pinduoduo.com'
    ],
    rate_limit_per_min: 15,
    max_concurrency: 1,
    search_url_template: 'https://mobile.yangkeduo.com/search_result.html?search_key={keywords}',
    selectors: {
        search: {
            item_container: [
                '.goods-item',
                '.search-goods-item',
                '[data-goods-id]'
            ],
            title: [
                '.goods-name',
                '.title',
                '.goods-title'
            ],
            price: [
                '.goods-price',
                '.price-num',
                '.price'
            ],
            link: [
                'a.goods-link',
                '.goods-item a'
            ],
            shop_label: [
                '.shop-name',
                '.mall-name'
            ],
            image: [
                '.goods-img img',
                '.image img'
            ]
        },
        detail: {
            final_price: [
                '.price-num',
                '.goods-price .price',
                '[class*="price"]'
            ],
            stock_status: [
                '.stock-text',
                '.goods-stock'
            ],
            delivery_eta: [
                '.delivery-time',
                '.arrive-time'
            ],
            shop_name: [
                '.shop-name',
                '.mall-name'
            ],
            sku_options: [
                '.sku-item',
                '.spec-item'
            ]
        }
    }
};

// ============================================================================
// Taobao Selectors
// ============================================================================

const TAOBAO_SELECTORS: ProviderConfig = {
    id: 'taobao',
    name: '淘宝',
    domains_allowlist: [
        'taobao.com',
        'www.taobao.com',
        'item.taobao.com',
        's.taobao.com',
        'm.taobao.com',
        'h5.m.taobao.com',
        'tmall.com',
        'detail.tmall.com'
    ],
    rate_limit_per_min: 15,
    max_concurrency: 1,
    search_url_template: 'https://s.taobao.com/search?q={keywords}',
    selectors: {
        search: {
            item_container: [
                '.Content--content--1TEFxJZ',
                '.Card--doubleCardWrapper--L2XFE73',
                '.items .item',
                '[data-nid]'
            ],
            title: [
                '.Title--title--jCOPvpf',
                '.row-text',
                '.item-name'
            ],
            price: [
                '.Price--priceInt--ZlsSi_M',
                '.price strong',
                '.g_price'
            ],
            link: [
                'a.Card--doubleCardWrapper--L2XFE73',
                '.item a',
                'a[href*="item"]'
            ],
            shop_label: [
                '.ShopInfo--shopName--rg6mGmy',
                '.shop',
                '.seller-name'
            ],
            image: [
                '.MainPic--mainPic--rcLNaCJ img',
                '.J_ItemPic',
                '.pic img'
            ]
        },
        detail: {
            final_price: [
                '.Price--originPrice--hxDUbON',
                '#J_PromoPriceNum',
                '.tm-price'
            ],
            stock_status: [
                '.tb-sell .tb-amount-widget',
                '.J_Quantity',
                '.stock-tip'
            ],
            delivery_eta: [
                '.deliver-info',
                '.tb-deliverSelf'
            ],
            shop_name: [
                '.shop-name a',
                '.J_ShopName',
                '.header-shop-name'
            ],
            sku_options: [
                '.J_SKU',
                '.sku-item',
                'li[data-value]'
            ]
        }
    }
};

// ============================================================================
// Selector Registry
// ============================================================================

const SELECTOR_REGISTRY: Record<ProviderId, ProviderConfig> = {
    jd: JD_SELECTORS,
    pdd: PDD_SELECTORS,
    taobao: TAOBAO_SELECTORS
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Get config for a provider
 */
export function getProviderConfig(provider_id: ProviderId): ProviderConfig {
    const config = SELECTOR_REGISTRY[provider_id];
    if (!config) {
        throw new Error(`Unknown provider: ${provider_id}`);
    }
    return config;
}

/**
 * Get search selectors for a provider
 */
export function getSearchSelectors(provider_id: ProviderId): SearchSelectors {
    return getProviderConfig(provider_id).selectors.search;
}

/**
 * Get detail selectors for a provider
 */
export function getDetailSelectors(provider_id: ProviderId): DetailSelectors {
    return getProviderConfig(provider_id).selectors.detail;
}

/**
 * Get domain allowlist for a provider
 */
export function getDomainAllowlist(provider_id: ProviderId): string[] {
    return getProviderConfig(provider_id).domains_allowlist;
}

/**
 * Get search URL for a provider
 */
export function buildSearchUrl(provider_id: ProviderId, keywords: string[]): string {
    const config = getProviderConfig(provider_id);
    const encoded = encodeURIComponent(keywords.join(' '));
    return config.search_url_template.replace('{keywords}', encoded);
}

/**
 * Check if a domain is allowed for a provider
 */
export function isDomainAllowed(provider_id: ProviderId, domain: string): boolean {
    const allowlist = getDomainAllowlist(provider_id);
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

    return allowlist.some(allowed => {
        const normalizedAllowed = allowed.replace(/^\*\./, '').toLowerCase();
        return normalizedDomain === normalizedAllowed ||
            normalizedDomain.endsWith('.' + normalizedAllowed);
    });
}

/**
 * Try multiple selectors and return the first match
 */
export function trySelectors(
    document: Document,
    selectors: string[],
    context?: Element
): Element | null {
    const root = context || document;

    for (const selector of selectors) {
        try {
            const element = root.querySelector(selector);
            if (element) {
                return element;
            }
        } catch (e) {
            // Invalid selector, try next
            console.warn(`[selectorPolicy.invalid_selector] ${selector}`);
        }
    }

    return null;
}

/**
 * Try multiple selectors and return all matches
 */
export function trySelectorsAll(
    document: Document,
    selectors: string[],
    context?: Element
): Element[] {
    const root = context || document;

    for (const selector of selectors) {
        try {
            const elements = Array.from(root.querySelectorAll(selector));
            if (elements.length > 0) {
                return elements;
            }
        } catch (e) {
            console.warn(`[selectorPolicy.invalid_selector] ${selector}`);
        }
    }

    return [];
}
