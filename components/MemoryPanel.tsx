import React, { useState, useEffect } from 'react';
import { Brain, Trash2, Calendar, CheckSquare, FileText, Link, User, Sparkles, RefreshCw, Download } from 'lucide-react';

interface MemoryItem {
    id: string;
    type: 'event' | 'task' | 'note' | 'link' | 'contact' | 'interest';
    title: string;
    content: string;
    createdAt: number;
    source: string;
}

interface MemoryPanelProps {
    onLog?: (message: string) => void;
}

/**
 * Memory Panel - Local memory graph panel
 * Shows saved memories, category stats, and export actions
 */
export const MemoryPanel: React.FC<MemoryPanelProps> = ({ onLog }) => {
    const [memories, setMemories] = useState<MemoryItem[]>([]);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const loadMemories = () => {
        const stored = localStorage.getItem('lumi_memory_graph');
        if (stored) {
            try {
                setMemories(JSON.parse(stored));
            } catch {
                setMemories([]);
            }
        }
    };

    useEffect(() => {
        loadMemories();
        // Listen for storage changes
        const handleStorage = () => loadMemories();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const handleClear = () => {
        if (confirm('Clear all memories? This action cannot be undone.')) {
            localStorage.removeItem('lumi_memory_graph');
            localStorage.removeItem('lumi_calendar_events');
            localStorage.removeItem('lumi_reminders');
            setMemories([]);
            onLog?.('Memory graph cleared');
        }
    };

    const handleDeleteItem = (id: string) => {
        const updated = memories.filter(m => m.id !== id);
        localStorage.setItem('lumi_memory_graph', JSON.stringify(updated));
        setMemories(updated);
        onLog?.(`Memory deleted: ${id}`);
    };

    // Export to JSON
    const handleExportJSON = () => {
        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            source: 'Lumi Knowledge Graph',
            memories: memories
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lumi-memories-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
        onLog?.('Memories exported as JSON');
    };

    // Export to Markdown
    const handleExportMarkdown = () => {
        const typeLabels: Record<string, string> = {
            event: '📅 Event', task: '✅ Task', note: '📝 Note',
            link: '🔗 Link', contact: '👤 Contact', interest: '💡 Interest'
        };

        const grouped = memories.reduce((acc, m) => {
            if (!acc[m.type]) acc[m.type] = [];
            acc[m.type].push(m);
            return acc;
        }, {} as Record<string, MemoryItem[]>);

        let md = `# Lumi Memory Graph Export\n\n`;
        md += `Exported at: ${new Date().toLocaleString()}\n`;
        md += `Total memories: ${memories.length}\n\n---\n\n`;

        for (const [type, items] of Object.entries(grouped)) {
            md += `## ${typeLabels[type] || type}\n\n`;
            for (const item of items) {
                md += `### ${item.title}\n`;
                md += `- Content: ${item.content}\n`;
                md += `- Source: ${item.source}\n`;
                md += `- Time: ${new Date(item.createdAt).toLocaleString()}\n\n`;
            }
        }

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lumi-memories-${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
        onLog?.('Memories exported as Markdown');
    };

    const typeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
        event: { icon: <Calendar size={14} />, label: 'Event', color: 'bg-orange-500' },
        task: { icon: <CheckSquare size={14} />, label: 'Task', color: 'bg-green-500' },
        note: { icon: <FileText size={14} />, label: 'Note', color: 'bg-blue-500' },
        link: { icon: <Link size={14} />, label: 'Link', color: 'bg-purple-500' },
        contact: { icon: <User size={14} />, label: 'Contact', color: 'bg-pink-500' },
        interest: { icon: <Sparkles size={14} />, label: 'Interest', color: 'bg-yellow-500' }
    };

    // Count by type
    const typeCounts = memories.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Filter by selected type
    const filteredMemories = selectedType
        ? memories.filter(m => m.type === selectedType)
        : memories;

    // Sort by creation time (newest first)
    const sortedMemories = [...filteredMemories].sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Brain size={18} className="text-cyan-400" />
                    <span className="font-semibold text-white">Memory Graph</span>
                    <span className="text-xs text-slate-400">({memories.length} memories)</span>
                </div>
                <div className="flex gap-2 relative">
                    <button
                        onClick={loadMemories}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={14} />
                    </button>
                    {memories.length > 0 && (
                        <>
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                                title="Export data"
                            >
                                <Download size={14} />
                            </button>
                            {showExportMenu && (
                                <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 z-10 min-w-[120px]">
                                    <button
                                        onClick={handleExportJSON}
                                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                                    >
                                        <span>📄</span> JSON
                                    </button>
                                    <button
                                        onClick={handleExportMarkdown}
                                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                                    >
                                        <span>📝</span> Markdown
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={handleClear}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                title="Clear all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>


            {/* Type Filter Pills */}
            <div className="flex flex-wrap gap-1.5 mb-4">
                <button
                    onClick={() => setSelectedType(null)}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${selectedType === null
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                >
                    All ({memories.length})
                </button>
                {Object.entries(typeConfig).map(([type, config]) => {
                    const count = typeCounts[type] || 0;
                    if (count === 0) return null;
                    return (
                        <button
                            key={type}
                            onClick={() => setSelectedType(type === selectedType ? null : type)}
                            className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-colors ${selectedType === type
                                ? `${config.color} text-white`
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            {config.icon}
                            <span>{config.label}</span>
                            <span className="opacity-75">({count})</span>
                        </button>
                    );
                })}
            </div>

            {/* Memory List */}
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
                {sortedMemories.length === 0 ? (
                    <div className="text-center py-6 text-slate-500">
                        <Brain size={24} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No memories yet</p>
                        <p className="text-xs mt-1">Use "Help me remember" to save information</p>
                    </div>
                ) : (
                    sortedMemories.slice(0, 10).map(memory => {
                        const config = typeConfig[memory.type] || typeConfig.note;
                        return (
                            <div
                                key={memory.id}
                                className="group flex items-start gap-2 p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <div className={`p-1.5 rounded ${config.color}`}>
                                    {config.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">
                                        {memory.title}
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center gap-2">
                                        <span>{config.label}</span>
                                        <span>·</span>
                                        <span>{new Date(memory.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteItem(memory.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-opacity"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        );
                    })
                )}
                {sortedMemories.length > 10 && (
                    <div className="text-center text-xs text-slate-500 py-1">
                        {sortedMemories.length - 10} more memories...
                    </div>
                )}
            </div>

            {/* Stats Footer */}
            {memories.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Local storage</span>
                        <span>Data stays on your device only</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemoryPanel;
