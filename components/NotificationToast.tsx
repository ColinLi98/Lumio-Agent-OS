import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

// Toast Types
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

// Context
const ToastContext = createContext<ToastContextType | null>(null);

// Hook to use toast
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);

        // Auto remove
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};

// Toast Container
const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: number) => void }> = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map((toast, index) => (
                <ToastItem key={toast.id} toast={toast} index={index} onRemove={onRemove} />
            ))}
            <style>{`
                .toast-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
};

// Individual Toast
const ToastItem: React.FC<{ toast: Toast; index: number; onRemove: (id: number) => void }> = ({ toast, index, onRemove }) => {
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        const leaveTimer = setTimeout(() => {
            setIsLeaving(true);
        }, (toast.duration || 3000) - 300);

        return () => clearTimeout(leaveTimer);
    }, [toast.duration]);

    const icons = {
        success: <CheckCircle2 size={18} />,
        error: <XCircle size={18} />,
        info: <Info size={18} />,
        warning: <AlertTriangle size={18} />
    };

    const colors = {
        success: { bg: 'rgba(34, 197, 94, 0.95)', border: '#22c55e', icon: '#bbf7d0' },
        error: { bg: 'rgba(239, 68, 68, 0.95)', border: '#ef4444', icon: '#fecaca' },
        info: { bg: 'rgba(59, 130, 246, 0.95)', border: '#3b82f6', icon: '#bfdbfe' },
        warning: { bg: 'rgba(245, 158, 11, 0.95)', border: '#f59e0b', icon: '#fef3c7' }
    };

    const color = colors[toast.type];

    return (
        <div
            className={`toast-item ${isLeaving ? 'leaving' : ''}`}
            style={{
                '--toast-bg': color.bg,
                '--toast-border': color.border,
                '--toast-icon': color.icon,
                '--toast-index': index
            } as React.CSSProperties}
        >
            <span className="toast-icon">{icons[toast.type]}</span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => onRemove(toast.id)}>
                <X size={14} />
            </button>

            <style>{`
                .toast-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    background: var(--toast-bg);
                    border: 1px solid var(--toast-border);
                    border-radius: 10px;
                    color: white;
                    font-size: 14px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
                    backdrop-filter: blur(10px);
                    pointer-events: auto;
                    animation: toastIn 0.3s ease forwards;
                    transform-origin: right center;
                }

                .toast-item.leaving {
                    animation: toastOut 0.3s ease forwards;
                }

                @keyframes toastIn {
                    from {
                        opacity: 0;
                        transform: translateX(100%) scale(0.8);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                }

                @keyframes toastOut {
                    from {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100%) scale(0.8);
                    }
                }

                .toast-icon {
                    color: var(--toast-icon);
                    display: flex;
                    align-items: center;
                }

                .toast-message {
                    flex: 1;
                    font-weight: 500;
                }

                .toast-close {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    cursor: pointer;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                }

                .toast-close:hover {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
};

export default ToastProvider;
