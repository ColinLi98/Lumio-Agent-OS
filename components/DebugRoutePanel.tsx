/**
 * Debug Route Panel Component
 * Shows routing decisions for debugging (token-gated, desensitized)
 * 
 * Access: ?debug=route&token=lumi_route_debug_2026
 */

import React, { useEffect, useState } from 'react';
import type { DebugRouteInfo } from '../services/intentRouterTypes';
import { DEBUG_ROUTE_TOKEN } from '../services/intentRouterTypes';

interface DebugRoutePanelProps {
    debugInfo: DebugRouteInfo;
}

// Check if debug mode is enabled via query params
// P0-2: Debug panel is COMPLETELY DISABLED in production
export function isDebugModeEnabled(): boolean {
    if (typeof window === 'undefined') return false;

    // P0-2: Production Gate - NO debug access in production, period
    const isProduction = process.env.NODE_ENV === 'production' ||
        window.location.hostname === 'lumi.ai' ||
        window.location.hostname.endsWith('.vercel.app');

    if (isProduction) {
        console.log('[DebugPanel] P0-2: Debug panel disabled in production');
        return false;
    }

    const params = new URLSearchParams(window.location.search);
    const debug = params.get('debug');
    const token = params.get('token');

    return debug === 'route' && token === DEBUG_ROUTE_TOKEN;
}

// Desensitize data for display
function desensitize(text: string): string {
    // Remove potential PII, keep only first/last chars of sensitive strings
    if (!text) return '';
    if (text.length <= 4) return text;

    // Check if looks like ID or token
    if (/^[a-zA-Z0-9_-]{20,}$/.test(text)) {
        return `${text.slice(0, 4)}...${text.slice(-4)}`;
    }
    return text;
}

export const DebugRoutePanel: React.FC<DebugRoutePanelProps> = ({ debugInfo }) => {
    const [isEnabled, setIsEnabled] = useState(false);

    useEffect(() => {
        setIsEnabled(isDebugModeEnabled());
    }, []);

    if (!isEnabled) {
        return null;
    }

    const { route_summary, provider_stats, offer_stats, timestamp } = debugInfo;

    return (
        <div className="debug-route-panel">
            <style>{`
                .debug-route-panel {
                    font-family: 'SF Mono', 'Consolas', monospace;
                    font-size: 11px;
                    background: #1E1E1E;
                    color: #D4D4D4;
                    border-radius: 8px;
                    padding: 12px;
                    margin: 8px 0;
                    border: 1px solid #333;
                }

                .debug-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #333;
                }

                .debug-title {
                    color: #569CD6;
                    font-weight: 600;
                    font-size: 12px;
                }

                .debug-timestamp {
                    color: #6A9955;
                    font-size: 10px;
                }

                .debug-section {
                    margin-bottom: 10px;
                }

                .debug-section-title {
                    color: #DCDCAA;
                    font-size: 10px;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                }

                .debug-row {
                    display: flex;
                    gap: 8px;
                    margin: 2px 0;
                }

                .debug-key {
                    color: #9CDCFE;
                    min-width: 100px;
                }

                .debug-value {
                    color: #CE9178;
                }

                .debug-value.number {
                    color: #B5CEA8;
                }

                .debug-value.success {
                    color: #4EC9B0;
                }

                .debug-value.error {
                    color: #F14C4C;
                }

                .debug-value.warning {
                    color: #CCA700;
                }

                .debug-badge {
                    display: inline-block;
                    padding: 1px 4px;
                    border-radius: 3px;
                    font-size: 9px;
                    font-weight: 600;
                }

                .debug-badge.domain {
                    background: #264F78;
                    color: #9CDCFE;
                }

                .debug-badge.blocked {
                    background: #5A1D1D;
                    color: #F48771;
                }

                .debug-badge.allowed {
                    background: #1D3823;
                    color: #89D185;
                }
            `}</style>

            <div className="debug-header">
                <span className="debug-title">🔍 Route Debug Info (INTERNAL)</span>
                <span className="debug-timestamp">
                    {new Date(timestamp).toLocaleTimeString()}
                </span>
            </div>

            {/* Route Summary */}
            <div className="debug-section">
                <div className="debug-section-title">Route Summary</div>
                <div className="debug-row">
                    <span className="debug-key">domain:</span>
                    <span className="debug-badge domain">{route_summary.domain}</span>
                </div>
                <div className="debug-row">
                    <span className="debug-key">subtype:</span>
                    <span className="debug-value">{route_summary.subtype}</span>
                </div>
                <div className="debug-row">
                    <span className="debug-key">confidence:</span>
                    <span className={`debug-value number ${route_summary.confidence >= 0.7 ? 'success' : 'warning'}`}>
                        {(route_summary.confidence * 100).toFixed(0)}%
                    </span>
                </div>
                <div className="debug-row">
                    <span className="debug-key">reason:</span>
                    <span className="debug-value">{desensitize(route_summary.reason)}</span>
                </div>
            </div>

            {/* Provider Stats */}
            <div className="debug-section">
                <div className="debug-section-title">Provider Filtering</div>
                <div className="debug-row">
                    <span className="debug-key">total:</span>
                    <span className="debug-value number">{provider_stats.total_providers}</span>
                </div>
                <div className="debug-row">
                    <span className="debug-key">allowed:</span>
                    <span className="debug-value number success">{provider_stats.allowed_providers}</span>
                </div>
                <div className="debug-row">
                    <span className="debug-key">blocked:</span>
                    <span className={`debug-value number ${provider_stats.blocked_providers > 0 ? 'error' : ''}`}>
                        {provider_stats.blocked_providers}
                    </span>
                </div>
                {provider_stats.blocked_groups.length > 0 && (
                    <div className="debug-row">
                        <span className="debug-key">blocked_groups:</span>
                        <span>
                            {provider_stats.blocked_groups.map(g => (
                                <span key={g} className="debug-badge blocked" style={{ marginRight: 4 }}>
                                    {g}
                                </span>
                            ))}
                        </span>
                    </div>
                )}
            </div>

            {/* Offer Stats */}
            <div className="debug-section">
                <div className="debug-section-title">Offer Validation</div>
                <div className="debug-row">
                    <span className="debug-key">received:</span>
                    <span className="debug-value number">{offer_stats.total_received}</span>
                </div>
                <div className="debug-row">
                    <span className="debug-key">passed:</span>
                    <span className="debug-value number success">{offer_stats.passed_validation}</span>
                </div>
                <div className="debug-row">
                    <span className="debug-key">domain_mismatch:</span>
                    <span className={`debug-value number ${offer_stats.rejected_domain_mismatch > 0 ? 'error' : ''}`}>
                        {offer_stats.rejected_domain_mismatch}
                    </span>
                </div>
                <div className="debug-row">
                    <span className="debug-key">other_rejected:</span>
                    <span className="debug-value number">{offer_stats.rejected_other}</span>
                </div>
            </div>
        </div>
    );
};

export default DebugRoutePanel;
