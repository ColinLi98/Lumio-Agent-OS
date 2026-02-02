/**
 * ConfirmationGate - Budget confirmation modal for high-value intents
 * 
 * v0.2 Thresholds:
 * - Budget >= ¥5000: Standard confirmation (modal)
 * - Budget >= ¥20000: Biometric/PIN required
 */

import React, { useState } from 'react';
import {
    AlertTriangle, Shield, Check, X,
    Fingerprint, Eye, Lock, Zap
} from 'lucide-react';
import { ProofOfIntent } from '../services/proofOfIntentService';

// ============================================================================
// Types
// ============================================================================

export interface ConfirmationGateProps {
    visible: boolean;
    intentDescription: string;
    category: string;
    budget?: number;
    proof?: ProofOfIntent;
    onConfirm: () => void;
    onCancel: () => void;
}

// ============================================================================
// Design Tokens
// ============================================================================

const colors = {
    bg: '#0F172A',
    bgCard: '#1E293B',
    bgHighlight: '#334155',
    primary: '#a78bfa',
    primaryMuted: 'rgba(167, 139, 250, 0.15)',
    warning: '#fbbf24',
    warningMuted: 'rgba(251, 191, 36, 0.15)',
    danger: '#ef4444',
    dangerMuted: 'rgba(239, 68, 68, 0.15)',
    success: '#34d399',
    text1: '#F8FAFC',
    text2: '#94A3B8',
    text3: '#64748B',
    border: 'rgba(148, 163, 184, 0.15)',
};

// ============================================================================
// v0.2 Threshold Configuration
// ============================================================================

const THRESHOLDS = {
    CONFIRM_REQUIRED: 5000,     // v0.2: ¥5000+ requires modal confirmation
    HIGH_VALUE_WARNING: 5000,   // Same as confirmation threshold
    BIOMETRIC_REQUIRED: 20000,  // v0.2: ¥20000+ requires biometric/PIN
};

// ============================================================================
// Component
// ============================================================================

export const ConfirmationGate: React.FC<ConfirmationGateProps> = ({
    visible,
    intentDescription,
    category,
    budget,
    proof,
    onConfirm,
    onCancel
}) => {
    const [confirmed, setConfirmed] = useState(false);
    const [biometricPassed, setBiometricPassed] = useState(false);

    if (!visible) return null;

    const isHighValue = budget && budget >= THRESHOLDS.HIGH_VALUE_WARNING;
    const requiresBiometric = budget && budget >= THRESHOLDS.BIOMETRIC_REQUIRED;

    const getCategoryLabel = (cat: string) => {
        const labels: Record<string, string> = {
            purchase: '购买意图',
            service: '服务意图',
            job: '求职意图',
            collaboration: '合作意图'
        };
        return labels[cat] || '意图';
    };

    const handleBiometricSimulation = () => {
        // Simulate biometric verification (placeholder)
        setTimeout(() => {
            setBiometricPassed(true);
        }, 500);
    };

    const handleConfirm = () => {
        if (requiresBiometric && !biometricPassed) {
            handleBiometricSimulation();
            return;
        }
        onConfirm();
    };

    const canConfirm = confirmed && (!requiresBiometric || biometricPassed);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
        }}>
            <div style={{
                width: '100%',
                maxWidth: 400,
                backgroundColor: colors.bgCard,
                borderRadius: 16,
                border: `1px solid ${colors.border}`,
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    background: isHighValue
                        ? `linear-gradient(135deg, ${colors.dangerMuted} 0%, ${colors.warningMuted} 100%)`
                        : colors.primaryMuted,
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }}>
                    {isHighValue ? (
                        <AlertTriangle size={24} color={colors.danger} />
                    ) : (
                        <Shield size={24} color={colors.primary} />
                    )}
                    <div>
                        <h3 style={{
                            color: colors.text1,
                            fontSize: 16,
                            fontWeight: 600,
                            margin: 0
                        }}>
                            {isHighValue ? '高价值意图确认' : '确认发布意图'}
                        </h3>
                        <p style={{
                            color: colors.text3,
                            fontSize: 12,
                            margin: '4px 0 0'
                        }}>
                            {getCategoryLabel(category)}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: 20 }}>
                    {/* High Value Warning */}
                    {isHighValue && (
                        <div style={{
                            padding: 12,
                            backgroundColor: colors.warningMuted,
                            borderRadius: 10,
                            marginBottom: 16,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10
                        }}>
                            <AlertTriangle size={16} color={colors.warning} style={{ flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <p style={{ color: colors.warning, fontSize: 13, margin: 0, fontWeight: 500 }}>
                                    高价值交易提醒
                                </p>
                                <p style={{ color: colors.text2, fontSize: 12, margin: '4px 0 0' }}>
                                    此意图涉及较高金额，请仔细确认后再发布
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Intent Details */}
                    <div style={{
                        padding: 14,
                        backgroundColor: colors.bgHighlight,
                        borderRadius: 10,
                        marginBottom: 16
                    }}>
                        <p style={{
                            color: colors.text1,
                            fontSize: 14,
                            margin: 0,
                            lineHeight: 1.5
                        }}>
                            "{intentDescription}"
                        </p>
                        {budget && (
                            <div style={{
                                marginTop: 12,
                                paddingTop: 12,
                                borderTop: `1px solid ${colors.border}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ color: colors.text3, fontSize: 12 }}>预算上限</span>
                                <span style={{
                                    color: isHighValue ? colors.warning : colors.primary,
                                    fontSize: 18,
                                    fontWeight: 700
                                }}>
                                    ¥{budget.toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Proof Info */}
                    {proof && (
                        <div style={{
                            padding: 10,
                            backgroundColor: 'rgba(52, 211, 153, 0.1)',
                            borderRadius: 8,
                            marginBottom: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <Lock size={14} color={colors.success} />
                            <span style={{ color: colors.success, fontSize: 11 }}>
                                意图已签名 · 有效期 {Math.floor(proof.ttl / 60)} 分钟
                            </span>
                        </div>
                    )}

                    {/* Biometric Section */}
                    {requiresBiometric && (
                        <div style={{
                            padding: 16,
                            backgroundColor: biometricPassed ? 'rgba(52, 211, 153, 0.1)' : colors.bgHighlight,
                            borderRadius: 10,
                            marginBottom: 16,
                            textAlign: 'center'
                        }}>
                            {biometricPassed ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <Check size={20} color={colors.success} />
                                    <span style={{ color: colors.success, fontSize: 14 }}>身份验证通过</span>
                                </div>
                            ) : (
                                <>
                                    <Fingerprint size={32} color={colors.text3} style={{ marginBottom: 8 }} />
                                    <p style={{ color: colors.text2, fontSize: 12, margin: 0 }}>
                                        高价值交易需要验证身份
                                    </p>
                                    <button
                                        onClick={handleBiometricSimulation}
                                        style={{
                                            marginTop: 12,
                                            padding: '8px 16px',
                                            backgroundColor: colors.primaryMuted,
                                            color: colors.primary,
                                            border: 'none',
                                            borderRadius: 8,
                                            fontSize: 13,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            margin: '12px auto 0'
                                        }}
                                    >
                                        <Eye size={14} />
                                        验证身份
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Confirmation Checkbox */}
                    <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        cursor: 'pointer',
                        marginBottom: 20
                    }}>
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(e) => setConfirmed(e.target.checked)}
                            style={{
                                width: 18,
                                height: 18,
                                accentColor: colors.primary,
                                flexShrink: 0,
                                marginTop: 2
                            }}
                        />
                        <span style={{ color: colors.text2, fontSize: 13, lineHeight: 1.5 }}>
                            我确认发布此意图，了解报价将来自第三方服务商，Lumi 仅提供匹配服务
                        </span>
                    </label>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={onCancel}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                backgroundColor: colors.bgHighlight,
                                color: colors.text2,
                                border: 'none',
                                borderRadius: 10,
                                fontSize: 14,
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                            }}
                        >
                            <X size={16} />
                            取消
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!canConfirm}
                            style={{
                                flex: 2,
                                padding: '12px 16px',
                                backgroundColor: canConfirm ? colors.primary : colors.bgHighlight,
                                color: canConfirm ? '#fff' : colors.text3,
                                border: 'none',
                                borderRadius: 10,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: canConfirm ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                            }}
                        >
                            <Zap size={16} />
                            确认并发布
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationGate;
