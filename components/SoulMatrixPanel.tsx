/**
 * Soul Matrix Panel
 * Phase 2 Week 1-1: Editable Preference Cards
 * 
 * UI for viewing and editing soul traits with evidence chain.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    SoulTrait,
    TraitCategory,
    getCategoryDisplayName,
    getConfidenceLabel,
    getConfidenceColor,
} from '../services/soulTraitTypes';
import { getSoulMatrixStore } from '../services/soulMatrixStore';
import { getMemoryLedger } from '../services/memoryLedger';
import { Evidence, getEvidenceTypeIcon, getEvidenceTypeLabel } from '../services/evidenceTypes';

// ============================================================================
// Types
// ============================================================================

interface SoulMatrixPanelProps {
    onClose?: () => void;
    showHeader?: boolean;
}

interface TraitCardProps {
    trait: SoulTrait;
    onConfirm: () => void;
    onEdit: (value: any) => void;
    onReject: () => void;
    onDelete: () => void;
    onViewEvidence: (evidence_ids: string[]) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export const SoulMatrixPanel: React.FC<SoulMatrixPanelProps> = ({
    onClose,
    showHeader = true,
}) => {
    const [traits, setTraits] = useState<SoulTrait[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<TraitCategory | 'all'>('all');
    const [undoAction, setUndoAction] = useState<{ action_id: string; trait_key: string } | null>(null);
    const [evidenceModal, setEvidenceModal] = useState<{ evidence: Evidence[]; trait_key: string } | null>(null);
    const [editingTrait, setEditingTrait] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const store = getSoulMatrixStore();
    const ledger = getMemoryLedger();

    // Subscribe to trait changes
    useEffect(() => {
        setTraits(store.getTraits());
        return store.subscribe(setTraits);
    }, []);

    // Check for pending undos
    useEffect(() => {
        const pendingUndos = store.getPendingUndos();
        if (pendingUndos.length > 0) {
            const lastUndo = pendingUndos[pendingUndos.length - 1];
            const trait = store.getTrait(lastUndo.trait_id);
            setUndoAction({ action_id: lastUndo.action_id, trait_key: trait?.key || '' });

            // Auto-clear after 10s
            const timer = setTimeout(() => setUndoAction(null), 10000);
            return () => clearTimeout(timer);
        } else {
            setUndoAction(null);
        }
    }, [traits]);

    // Filter traits by category
    const filteredTraits = selectedCategory === 'all'
        ? traits
        : traits.filter(t => t.category === selectedCategory);

    // Category counts
    const categoryCounts = traits.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Handlers
    const handleConfirm = useCallback((trait_id: string) => {
        store.confirmTrait(trait_id);
    }, []);

    const handleEdit = useCallback((trait_id: string, value: any) => {
        store.editTrait(trait_id, value);
        setEditingTrait(null);
    }, []);

    const handleReject = useCallback((trait_id: string) => {
        store.rejectTrait(trait_id);
    }, []);

    const handleDelete = useCallback((trait_id: string) => {
        store.deleteTrait(trait_id);
    }, []);

    const handleUndo = useCallback(() => {
        if (undoAction) {
            store.undo(undoAction.action_id);
            setUndoAction(null);
        }
    }, [undoAction]);

    const handleViewEvidence = useCallback((evidence_ids: string[], trait_key: string) => {
        const evidence = evidence_ids
            .map(id => ledger.getEvidence(id))
            .filter((e): e is Evidence => e !== undefined);
        setEvidenceModal({ evidence, trait_key });
    }, []);

    // Categories
    const categories: (TraitCategory | 'all')[] = [
        'all', 'preference', 'behavior', 'value', 'constraint', 'goal', 'personality'
    ];

    return (
        <div className="h-full flex flex-col bg-gray-900">
            {/* Header */}
            {showHeader && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                    <h2 className="text-lg font-semibold text-white">我的分身认知</h2>
                    {onClose && (
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            ✕
                        </button>
                    )}
                </div>
            )}

            {/* Category Tabs */}
            <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-gray-800">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition ${selectedCategory === cat
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        {cat === 'all' ? '全部' : getCategoryDisplayName(cat)}
                        <span className="ml-1 opacity-60">
                            ({cat === 'all' ? traits.length : categoryCounts[cat] || 0})
                        </span>
                    </button>
                ))}
            </div>

            {/* Undo Toast */}
            {undoAction && (
                <div className="mx-4 mt-2 p-3 bg-yellow-900/50 border border-yellow-700 rounded-lg flex items-center justify-between">
                    <span className="text-yellow-200 text-sm">
                        已更改「{undoAction.trait_key}」
                    </span>
                    <button
                        onClick={handleUndo}
                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded"
                    >
                        撤销
                    </button>
                </div>
            )}

            {/* Traits List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredTraits.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <p className="text-4xl mb-2">🧠</p>
                        <p>暂无分身认知数据</p>
                        <p className="text-sm mt-1">与 Lumi 互动后会自动学习你的偏好</p>
                    </div>
                ) : (
                    filteredTraits.map(trait => (
                        <TraitCard
                            key={trait.trait_id}
                            trait={trait}
                            onConfirm={() => handleConfirm(trait.trait_id)}
                            onEdit={(value) => handleEdit(trait.trait_id, value)}
                            onReject={() => handleReject(trait.trait_id)}
                            onDelete={() => handleDelete(trait.trait_id)}
                            onViewEvidence={(ids) => handleViewEvidence(ids, trait.display_name)}
                        />
                    ))
                )}
            </div>

            {/* Evidence Modal */}
            {evidenceModal && (
                <EvidenceModal
                    evidence={evidenceModal.evidence}
                    trait_key={evidenceModal.trait_key}
                    onClose={() => setEvidenceModal(null)}
                />
            )}
        </div>
    );
};

// ============================================================================
// Trait Card Component
// ============================================================================

const TraitCard: React.FC<TraitCardProps> = ({
    trait,
    onConfirm,
    onEdit,
    onReject,
    onDelete,
    onViewEvidence,
}) => {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(String(trait.value));
    const [showActions, setShowActions] = useState(false);

    const handleSaveEdit = () => {
        // Convert back to original type
        let newValue: any = editValue;
        if (typeof trait.value === 'number') {
            newValue = parseFloat(editValue);
            if (isNaN(newValue)) return;
        } else if (typeof trait.value === 'boolean') {
            newValue = editValue === 'true';
        }
        onEdit(newValue);
        setEditing(false);
    };

    const formatValue = (value: any): string => {
        if (typeof value === 'number') {
            return `${Math.round(value * 100)}%`;
        }
        if (typeof value === 'boolean') {
            return value ? '是' : '否';
        }
        return String(value);
    };

    return (
        <div
            className={`p-4 rounded-xl border transition ${trait.user_confirmed
                    ? 'bg-green-900/20 border-green-700/50'
                    : 'bg-gray-800/50 border-gray-700'
                }`}
            onClick={() => setShowActions(!showActions)}
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{trait.display_name}</span>
                        {trait.user_confirmed && (
                            <span className="text-green-400 text-xs">✓ 已确认</span>
                        )}
                        {trait.user_edited && (
                            <span className="text-blue-400 text-xs">✏️ 已编辑</span>
                        )}
                    </div>
                    {trait.description && (
                        <p className="text-gray-500 text-sm mt-0.5">{trait.description}</p>
                    )}
                </div>
                <div className="text-right">
                    {editing ? (
                        <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="bg-gray-700 text-white px-2 py-1 rounded w-20 text-right"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') setEditing(false);
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="text-xl font-semibold text-white">
                            {formatValue(trait.value)}
                        </span>
                    )}
                </div>
            </div>

            {/* Confidence & Evidence */}
            <div className="flex items-center justify-between mt-3 text-sm">
                <div className="flex items-center gap-3">
                    <span className={getConfidenceColor(trait.confidence)}>
                        {getConfidenceLabel(trait.confidence)}
                    </span>
                    {trait.source_evidence.length > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewEvidence(trait.source_evidence);
                            }}
                            className="text-indigo-400 hover:text-indigo-300"
                        >
                            📎 {trait.source_evidence.length} 条证据
                        </button>
                    )}
                </div>
                <span className="text-gray-500 text-xs">
                    {new Date(trait.last_updated).toLocaleDateString('zh-CN')}
                </span>
            </div>

            {/* Action Buttons */}
            {showActions && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
                    {!trait.user_confirmed && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                            className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg"
                        >
                            ✓ 确认准确
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); setEditing(true); setEditValue(String(trait.value)); }}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg"
                    >
                        ✏️ 编辑
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onReject(); }}
                        className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg"
                    >
                        ✗ 不准
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="py-2 px-3 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg"
                    >
                        🗑
                    </button>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Evidence Modal
// ============================================================================

interface EvidenceModalProps {
    evidence: Evidence[];
    trait_key: string;
    onClose: () => void;
}

const EvidenceModal: React.FC<EvidenceModalProps> = ({ evidence, trait_key, onClose }) => {
    const ledger = getMemoryLedger();

    const handleDeleteEvidence = (evidence_id: string) => {
        ledger.deleteEvidence(evidence_id);
        // If all evidence deleted, close modal
        if (evidence.length <= 1) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <h3 className="text-lg font-semibold text-white">
                        「{trait_key}」的证据
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        ✕
                    </button>
                </div>

                {/* Evidence List */}
                <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
                    {evidence.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">暂无证据记录</p>
                    ) : (
                        evidence.map(e => (
                            <div key={e.evidence_id} className="p-3 bg-gray-800 rounded-lg">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span>{getEvidenceTypeIcon(e.type)}</span>
                                        <span className="text-gray-400 text-sm">
                                            {getEvidenceTypeLabel(e.type)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteEvidence(e.evidence_id)}
                                        className="text-red-400 hover:text-red-300 text-sm"
                                    >
                                        删除
                                    </button>
                                </div>
                                <p className="text-white mt-2 text-sm">{e.snippet_summary}</p>
                                <p className="text-gray-500 text-xs mt-2">
                                    {new Date(e.timestamp).toLocaleString('zh-CN')}
                                </p>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={onClose}
                        className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SoulMatrixPanel;
