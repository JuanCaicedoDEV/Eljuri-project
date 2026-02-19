'use client';

import React, { useCallback } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    BackgroundVariant,
    useReactFlow
} from '@xyflow/react';
import { MessageSquare, Mic } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import { useSimulationStore } from '../store/useSimulationStore';
import { StartNode, EndNode, SpeakNode, ListenNode } from './flows/CustomNodes';
import PropertiesPanel from './flows/PropertiesPanel';

const initialNodes: Node[] = [
    { id: '1', position: { x: 100, y: 100 }, data: { label: 'Start Call' }, type: 'input' },
    { id: '2', position: { x: 100, y: 200 }, data: { label: 'Speak: Hola, ¿cómo estás?' } },
    { id: '3', position: { x: 100, y: 300 }, data: { label: 'Listen for: "Bien" / "Mal"' } },
    { id: '4', position: { x: 300, y: 400 }, data: { label: 'End Call' }, type: 'output' },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
];

export default function FlowEditor() {
    const [selectedNode, setSelectedNode] = React.useState<Node | null>(null);

    return (
        <div className="relative w-full h-full border border-zinc-100 rounded-3xl overflow-hidden bg-zinc-50/30">
            <ReactFlowProvider>
                <FlowEditorContent
                    selectedNode={selectedNode}
                    setSelectedNode={setSelectedNode}
                />
            </ReactFlowProvider>
        </div>
    );
}

// Inner component to use ReactFlow hooks if needed, or just to structure the provider
function FlowEditorContent({ selectedNode, setSelectedNode }: { selectedNode: Node | null, setSelectedNode: (node: Node | null) => void }) {
    const { setFlowData, flowData } = useSimulationStore();

    // Initialize state
    const [nodes, setNodes, onNodesChange] = useNodesState(flowData.nodes.length > 0 ? flowData.nodes : [
        { id: '1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
        { id: '2', type: 'speak', position: { x: 200, y: 150 }, data: { label: 'Speak: Hola, ¿cómo estás?' } },
        { id: '3', type: 'listen', position: { x: 200, y: 300 }, data: { label: 'Listen for: "Bien" / "Mal"' } },
        { id: '4', type: 'end', position: { x: 250, y: 450 }, data: { label: 'End' } },
    ]);
    const [edges, setEdges, onEdgesChange] = useEdgesState(flowData.edges.length > 0 ? flowData.edges : [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
    ]);

    const { screenToFlowPosition } = useReactFlow();

    const onAddNode = useCallback((type: string) => {
        const id = `${type}-${Date.now()}`;
        const newNode: Node = {
            id,
            type,
            position: screenToFlowPosition({ x: 400, y: 300 }), // Default to somewhat center, ideally relative to view
            data: {
                label: type === 'speak' ? 'Speak: New Message' : type === 'listen' ? 'Listen for: ...' : 'End Call'
            },
        };
        setNodes((nds) => nds.concat(newNode));
    }, [screenToFlowPosition, setNodes]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    // Sync to store
    React.useEffect(() => {
        setFlowData({ nodes, edges });
    }, [nodes, edges, setFlowData]);

    // Handle selection
    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    const nodeTypes = React.useMemo(() => ({
        start: StartNode,
        end: EndNode,
        speak: SpeakNode,
        listen: ListenNode,
    }), []);

    return (
        <>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#e4e4e7', strokeWidth: 2 }
                }}
            >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e4e4e7" />
                <Controls className="bg-white border border-zinc-100 shadow-xl rounded-xl p-1 [&>button]:border-none [&>button]:bg-transparent hover:[&>button]:bg-zinc-50" />
            </ReactFlow>

            {/* Node Creation Palette */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 bg-white/90 backdrop-blur-md p-2 rounded-2xl border border-zinc-200/50 shadow-xl z-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center mb-1">Add Node</p>
                <button
                    onClick={() => onAddNode('speak')}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 rounded-xl border border-zinc-100 shadow-sm transition-all text-xs font-bold text-zinc-700"
                >
                    <div className="p-1 bg-blue-100 rounded-md text-blue-600"><MessageSquare size={14} /></div>
                    Speak
                </button>
                <button
                    onClick={() => onAddNode('listen')}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 rounded-xl border border-zinc-100 shadow-sm transition-all text-xs font-bold text-zinc-700"
                >
                    <div className="p-1 bg-purple-100 rounded-md text-purple-600"><Mic size={14} /></div>
                    Listen
                </button>
                <button
                    onClick={() => onAddNode('end')}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 rounded-xl border border-zinc-100 shadow-sm transition-all text-xs font-bold text-zinc-700"
                >
                    <div className="p-1 bg-zinc-100 rounded-md text-zinc-600"><div className="w-3.5 h-3.5 bg-zinc-900 rounded-sm" /></div>
                    End
                </button>
            </div>

            {selectedNode && (
                <PropertiesPanel
                    selectedNode={selectedNode}
                    onClose={() => setSelectedNode(null)}
                />
            )}
        </>
    );
}
