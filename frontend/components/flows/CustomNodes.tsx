import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare, Mic, Play, StopCircle } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';

const HandleStyle = { width: 8, height: 8, background: '#a1a1aa' };

export const StartNode = memo(({ id, data, selected }: NodeProps) => {
    const activeNodeId = useSimulationStore((state) => state.activeNodeId);
    const isActive = activeNodeId === id;

    return (
        <div className={`px-4 py-2 shadow-md rounded-full bg-white border-2 transition-all 
            ${isActive ? 'border-emerald-500 ring-4 ring-emerald-500/20 scale-110' :
                selected ? 'border-primary ring-2 ring-primary/20' : 'border-emerald-100'}`}>
            <div className="flex items-center">
                <div className={`rounded-full p-1 mr-2 transition-colors ${isActive ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                    <Play size={12} fill="currentColor" />
                </div>
                <div className="text-xs font-bold text-zinc-900">Start</div>
            </div>
            <Handle type="source" position={Position.Bottom} style={HandleStyle} className="!bg-emerald-500" />
        </div>
    );
});

export const EndNode = memo(({ id, data, selected }: NodeProps) => {
    const activeNodeId = useSimulationStore((state) => state.activeNodeId);
    const isActive = activeNodeId === id;

    return (
        <div className={`px-4 py-2 shadow-md rounded-full bg-white border-2 transition-all 
             ${isActive ? 'border-rose-500 ring-4 ring-rose-500/20 scale-110' :
                selected ? 'border-primary ring-2 ring-primary/20' : 'border-rose-100'}`}>
            <Handle type="target" position={Position.Top} style={HandleStyle} className="!bg-rose-500" />
            <div className="flex items-center">
                <div className={`rounded-full p-1 mr-2 transition-colors ${isActive ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-600'}`}>
                    <StopCircle size={12} />
                </div>
                <div className="text-xs font-bold text-zinc-900">End</div>
            </div>
        </div>
    );
});

export const SpeakNode = memo(({ id, data, selected }: NodeProps) => {
    const activeNodeId = useSimulationStore((state) => state.activeNodeId);
    const isActive = activeNodeId === id;

    return (
        <div className={`w-[200px] shadow-lg rounded-xl bg-white border-2 transition-all 
            ${isActive ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-blue-500/20' :
                selected ? 'border-primary ring-4 ring-primary/10' : 'border-zinc-100'}`}>
            <Handle type="target" position={Position.Top} style={HandleStyle} />

            <div className={`p-3 border-b border-zinc-50 rounded-t-xl flex items-center gap-2 transition-colors
                ${isActive ? 'bg-blue-50/80' : 'bg-zinc-50/50'}`}>
                <MessageSquare size={14} className={isActive ? 'text-blue-600' : 'text-blue-500'} />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-blue-700' : 'text-zinc-500'}`}>
                    {isActive ? 'Speaking...' : 'Agent Speaks'}
                </span>
            </div>

            <div className="p-3">
                <p className="text-xs text-zinc-700 font-medium line-clamp-3">
                    {data.label ? (data.label as string).replace('Speak: ', '') : '...'}
                </p>
            </div>

            <Handle type="source" position={Position.Bottom} style={HandleStyle} />
        </div>
    );
});

export const ListenNode = memo(({ id, data, selected }: NodeProps) => {
    const activeNodeId = useSimulationStore((state) => state.activeNodeId);
    const isActive = activeNodeId === id;

    return (
        <div className={`w-[200px] shadow-lg rounded-xl bg-white border-2 transition-all 
            ${isActive ? 'border-purple-500 ring-4 ring-purple-500/20 shadow-purple-500/20' :
                selected ? 'border-primary ring-4 ring-primary/10' : 'border-zinc-100'}`}>
            <Handle type="target" position={Position.Top} style={HandleStyle} />

            <div className={`p-3 border-b border-zinc-50 rounded-t-xl flex items-center gap-2 transition-colors
                 ${isActive ? 'bg-purple-50/80' : 'bg-zinc-50/50'}`}>
                <Mic size={14} className={isActive ? 'text-purple-600' : 'text-purple-500'} />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-purple-700' : 'text-zinc-500'}`}>
                    {isActive ? 'Listening...' : 'User Says'}
                </span>
            </div>

            <div className="p-3">
                <p className="text-xs text-zinc-700 font-medium line-clamp-3">
                    {data.label ? (data.label as string).replace('Listen for: ', '') : '...'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-[9px] px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded-md border border-zinc-200">
                        Default path
                    </span>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} style={HandleStyle} />
        </div>
    );
});
