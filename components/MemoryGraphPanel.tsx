/**
 * MemoryGraphPanel - 记忆图谱可视化
 *
 * 展示知识节点和关联关系的简化可视化
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    Brain, Lightbulb, Tag, Link2, RefreshCw, Plus, Trash2,
    ZoomIn, ZoomOut, Move
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface MemoryNode {
    id: string;
    label: string;
    type: 'topic' | 'fact' | 'preference' | 'skill' | 'person';
    weight: number;  // 0-1 importance
    x?: number;
    y?: number;
}

export interface MemoryEdge {
    source: string;
    target: string;
    relation: string;
    strength: number;  // 0-1
}

// ============================================================================
// Sample Data
// ============================================================================

const SAMPLE_NODES: MemoryNode[] = [
    { id: 'tech', label: '技术', type: 'topic', weight: 0.9 },
    { id: 'coffee', label: '咖啡', type: 'preference', weight: 0.7 },
    { id: 'morning', label: '早晨', type: 'topic', weight: 0.5 },
    { id: 'coding', label: '编程', type: 'skill', weight: 0.85 },
    { id: 'music', label: '音乐', type: 'preference', weight: 0.6 },
    { id: 'work', label: '工作', type: 'topic', weight: 0.75 },
    { id: 'ai', label: 'AI', type: 'fact', weight: 0.95 },
    { id: 'design', label: '设计', type: 'skill', weight: 0.65 },
];

const SAMPLE_EDGES: MemoryEdge[] = [
    { source: 'tech', target: 'coding', relation: '包含', strength: 0.9 },
    { source: 'tech', target: 'ai', relation: '相关', strength: 0.85 },
    { source: 'coffee', target: 'morning', relation: '联想', strength: 0.7 },
    { source: 'work', target: 'coding', relation: '需要', strength: 0.8 },
    { source: 'music', target: 'work', relation: '伴随', strength: 0.5 },
    { source: 'design', target: 'tech', relation: '结合', strength: 0.6 },
    { source: 'ai', target: 'coding', relation: '应用', strength: 0.75 },
];

// ============================================================================
// Node Colors
// ============================================================================

const NODE_COLORS: Record<string, string> = {
    topic: '#3b82f6',
    fact: '#22c55e',
    preference: '#f59e0b',
    skill: '#a855f7',
    person: '#ec4899',
};

// ============================================================================
// Node Component
// ============================================================================

interface NodeProps {
    node: MemoryNode;
    selected: boolean;
    onClick: () => void;
}

const NodeComponent: React.FC<NodeProps> = ({ node, selected, onClick }) => {
    const color = NODE_COLORS[node.type];
    const size = 20 + node.weight * 20;

    return (
        <g
            transform={`translate(${node.x || 0}, ${node.y || 0})`}
            onClick={onClick}
            className="cursor-pointer"
        >
            <circle
                r={size}
                fill={`${color}30`}
                stroke={color}
                strokeWidth={selected ? 3 : 2}
                className="transition-all"
            />
            <text
                dy={4}
                textAnchor="middle"
                fill="white"
                fontSize={10}
                className="pointer-events-none"
            >
                {node.label}
            </text>
        </g>
    );
};

// ============================================================================
// Main Panel
// ============================================================================

interface MemoryGraphPanelProps {
    onLog?: (message: string) => void;
}

export const MemoryGraphPanel: React.FC<MemoryGraphPanelProps> = ({ onLog }) => {
    const [nodes, setNodes] = useState<MemoryNode[]>([]);
    const [edges, setEdges] = useState<MemoryEdge[]>([]);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const svgRef = useRef<SVGSVGElement>(null);

    // Initialize with sample data and layout
    useEffect(() => {
        const width = 280;
        const height = 200;
        const centerX = width / 2;
        const centerY = height / 2;

        // Simple circular layout
        const layoutNodes = SAMPLE_NODES.map((node, i) => {
            const angle = (i / SAMPLE_NODES.length) * Math.PI * 2;
            const radius = 70 + Math.random() * 20;
            return {
                ...node,
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
            };
        });

        setNodes(layoutNodes);
        setEdges(SAMPLE_EDGES);
    }, []);

    const getNodeById = (id: string) => nodes.find((n) => n.id === id);

    const selectedNodeData = selectedNode ? getNodeById(selectedNode) : null;
    const connectedEdges = selectedNode
        ? edges.filter((e) => e.source === selectedNode || e.target === selectedNode)
        : [];

    const handleAddNode = () => {
        const newNode: MemoryNode = {
            id: `node_${Date.now()}`,
            label: '新节点',
            type: 'topic',
            weight: 0.5,
            x: 140 + Math.random() * 40 - 20,
            y: 100 + Math.random() * 40 - 20,
        };
        setNodes([...nodes, newNode]);
        onLog?.('新增记忆节点');
    };

    const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2));
    const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain size={18} className="text-purple-400" />
                    <span className="font-semibold text-white">记忆图谱</span>
                    <span className="text-xs text-slate-500">({nodes.length} 节点)</span>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={handleZoomOut}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    >
                        <ZoomOut size={14} />
                    </button>
                    <button
                        onClick={handleZoomIn}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    >
                        <ZoomIn size={14} />
                    </button>
                    <button
                        onClick={handleAddNode}
                        className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-colors"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2">
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1 text-[10px]">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                        <span className="text-slate-400">{type}</span>
                    </div>
                ))}
            </div>

            {/* Graph */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                <svg
                    ref={svgRef}
                    width="100%"
                    height={200}
                    viewBox={`0 0 280 200`}
                    className="block"
                >
                    <g transform={`scale(${zoom})`}>
                        {/* Edges */}
                        {edges.map((edge, i) => {
                            const source = getNodeById(edge.source);
                            const target = getNodeById(edge.target);
                            if (!source || !target) return null;

                            const isHighlighted =
                                selectedNode === edge.source || selectedNode === edge.target;

                            return (
                                <line
                                    key={i}
                                    x1={source.x}
                                    y1={source.y}
                                    x2={target.x}
                                    y2={target.y}
                                    stroke={isHighlighted ? '#ffffff' : '#475569'}
                                    strokeWidth={isHighlighted ? 2 : 1}
                                    strokeOpacity={isHighlighted ? 0.8 : 0.3}
                                    strokeDasharray={edge.strength < 0.5 ? '4,4' : undefined}
                                />
                            );
                        })}

                        {/* Nodes */}
                        {nodes.map((node) => (
                            <NodeComponent
                                key={node.id}
                                node={node}
                                selected={selectedNode === node.id}
                                onClick={() =>
                                    setSelectedNode(selectedNode === node.id ? null : node.id)
                                }
                            />
                        ))}
                    </g>
                </svg>
            </div>

            {/* Selected Node Info */}
            {selectedNodeData && (
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: NODE_COLORS[selectedNodeData.type] }}
                        />
                        <span className="font-medium text-white">{selectedNodeData.label}</span>
                        <span className="text-xs text-slate-500">{selectedNodeData.type}</span>
                    </div>

                    <div className="text-xs text-slate-400 mb-2">
                        重要度: {Math.round(selectedNodeData.weight * 100)}%
                    </div>

                    {connectedEdges.length > 0 && (
                        <div>
                            <div className="text-xs text-slate-400 mb-1">关联:</div>
                            <div className="space-y-1">
                                {connectedEdges.map((edge, i) => {
                                    const otherId =
                                        edge.source === selectedNode ? edge.target : edge.source;
                                    const other = getNodeById(otherId);
                                    return (
                                        <div
                                            key={i}
                                            className="flex items-center gap-1.5 text-xs text-slate-300"
                                        >
                                            <Link2 size={10} className="text-slate-500" />
                                            <span>{edge.relation}</span>
                                            <span className="text-purple-400">{other?.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MemoryGraphPanel;
