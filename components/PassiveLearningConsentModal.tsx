/**
 * Passive Learning Consent Modal
 * 
 * 首次启动时显示的用户同意对话框
 */

import React, { useState } from 'react';
import { getPassiveLearningService } from '../services/passiveLearningService';

interface ConsentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConsentGiven: () => void;
}

export const PassiveLearningConsentModal: React.FC<ConsentModalProps> = ({
    isOpen,
    onClose,
    onConsentGiven
}) => {
    const [step, setStep] = useState<'intro' | 'apps'>('intro');
    const [selectedApps, setSelectedApps] = useState<string[]>(['微信', '备忘录']);

    const availableApps = [
        { id: '微信', label: '微信', icon: '💬' },
        { id: '备忘录', label: '备忘录', icon: '📝' },
        { id: '邮件', label: '邮件', icon: '📧' },
        { id: '小红书', label: '小红书', icon: '📕' },
        { id: '抖音', label: '抖音', icon: '🎵' },
        { id: '淘宝', label: '淘宝', icon: '🛒' }
    ];

    const handleToggleApp = (appId: string) => {
        setSelectedApps(prev =>
            prev.includes(appId)
                ? prev.filter(id => id !== appId)
                : [...prev, appId]
        );
    };

    const handleConfirm = () => {
        const service = getPassiveLearningService();
        service.grantConsent();
        selectedApps.forEach(app => service.whitelistApp(app));
        onConsentGiven();
        onClose();
    };

    const handleDecline = () => {
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                {step === 'intro' ? (
                    <>
                        <div style={styles.header}>
                            <span style={styles.icon}>🧠</span>
                            <h2 style={styles.title}>让 Lumi 更懂你</h2>
                        </div>

                        <div style={styles.content}>
                            <p style={styles.description}>
                                启用<strong>智能学习</strong>后，Lumi 会在你日常打字时静默学习你的习惯和偏好，
                                让 AI 助手更加个性化。
                            </p>

                            <div style={styles.featureList}>
                                <div style={styles.feature}>
                                    <span style={styles.checkIcon}>✅</span>
                                    <span>了解你的回复速度偏好</span>
                                </div>
                                <div style={styles.feature}>
                                    <span style={styles.checkIcon}>✅</span>
                                    <span>识别你的活跃时段</span>
                                </div>
                                <div style={styles.feature}>
                                    <span style={styles.checkIcon}>✅</span>
                                    <span>优化联想词推荐</span>
                                </div>
                            </div>

                            <div style={styles.privacyBox}>
                                <span style={styles.lockIcon}>🔒</span>
                                <div>
                                    <strong>隐私承诺</strong>
                                    <p style={styles.privacyText}>
                                        所有数据仅存储在你的设备本地，不会上传到云端。
                                        我们只学习打字模式，不收集打字内容。
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={styles.actions}>
                            <button style={styles.declineButton} onClick={handleDecline}>
                                暂不开启
                            </button>
                            <button style={styles.confirmButton} onClick={() => setStep('apps')}>
                                选择 App →
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={styles.header}>
                            <span style={styles.icon}>📱</span>
                            <h2 style={styles.title}>选择学习场景</h2>
                        </div>

                        <div style={styles.content}>
                            <p style={styles.description}>
                                选择你希望 Lumi 学习的 App，你可以随时在设置中修改。
                            </p>

                            <div style={styles.appGrid}>
                                {availableApps.map(app => (
                                    <button
                                        key={app.id}
                                        style={{
                                            ...styles.appButton,
                                            ...(selectedApps.includes(app.id) ? styles.appButtonSelected : {})
                                        }}
                                        onClick={() => handleToggleApp(app.id)}
                                    >
                                        <span style={styles.appIcon}>{app.icon}</span>
                                        <span style={styles.appLabel}>{app.label}</span>
                                        {selectedApps.includes(app.id) && (
                                            <span style={styles.selectedCheck}>✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={styles.actions}>
                            <button style={styles.declineButton} onClick={() => setStep('intro')}>
                                ← 返回
                            </button>
                            <button
                                style={{
                                    ...styles.confirmButton,
                                    opacity: selectedApps.length === 0 ? 0.5 : 1
                                }}
                                onClick={handleConfirm}
                                disabled={selectedApps.length === 0}
                            >
                                开启智能学习
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
    },
    modal: {
        backgroundColor: '#1e1e2e',
        borderRadius: '20px',
        padding: '28px',
        maxWidth: '380px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    header: {
        textAlign: 'center' as const,
        marginBottom: '20px'
    },
    icon: {
        fontSize: '48px',
        display: 'block',
        marginBottom: '12px'
    },
    title: {
        color: '#ffffff',
        fontSize: '22px',
        fontWeight: '600',
        margin: 0
    },
    content: {
        marginBottom: '24px'
    },
    description: {
        color: '#a0a0b0',
        fontSize: '14px',
        lineHeight: '1.6',
        marginBottom: '16px'
    },
    featureList: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '10px',
        marginBottom: '16px'
    },
    feature: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: '#e0e0e0',
        fontSize: '14px'
    },
    checkIcon: {
        fontSize: '16px'
    },
    privacyBox: {
        display: 'flex',
        gap: '12px',
        backgroundColor: 'rgba(100, 200, 150, 0.1)',
        padding: '14px',
        borderRadius: '12px',
        border: '1px solid rgba(100, 200, 150, 0.2)'
    },
    lockIcon: {
        fontSize: '24px'
    },
    privacyText: {
        color: '#80c0a0',
        fontSize: '12px',
        margin: '4px 0 0 0',
        lineHeight: '1.5'
    },
    actions: {
        display: 'flex',
        gap: '12px'
    },
    declineButton: {
        flex: 1,
        padding: '14px',
        backgroundColor: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        color: '#a0a0b0',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer'
    },
    confirmButton: {
        flex: 1,
        padding: '14px',
        backgroundColor: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        border: 'none',
        borderRadius: '12px',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    appGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px'
    },
    appButton: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        padding: '14px 8px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '2px solid transparent',
        borderRadius: '12px',
        cursor: 'pointer',
        position: 'relative' as const,
        transition: 'all 0.2s'
    },
    appButtonSelected: {
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderColor: '#6366f1'
    },
    appIcon: {
        fontSize: '28px',
        marginBottom: '6px'
    },
    appLabel: {
        color: '#e0e0e0',
        fontSize: '12px'
    },
    selectedCheck: {
        position: 'absolute' as const,
        top: '6px',
        right: '6px',
        backgroundColor: '#6366f1',
        color: '#fff',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        fontSize: '11px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }
};

export default PassiveLearningConsentModal;
