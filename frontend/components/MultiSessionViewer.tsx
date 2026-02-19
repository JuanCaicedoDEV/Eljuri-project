"use client";

import React, { useState } from 'react';
import { useSimulationStore, SessionState } from '../store/useSimulationStore';
import { X, Maximize2, Minimize2, Grid, Layout, Phone, Activity } from 'lucide-react';
import VoiceInteraction from './VoiceInteraction';
import { motion, AnimatePresence } from 'framer-motion';

export default function MultiSessionViewer({ onClose }: { onClose: () => void }) {
    const { sessions } = useSimulationStore();
    const activeSessions = Array.from(sessions.values()).filter(s => s.status === 'active' || s.status === 'idle');
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    // If a session is selected, we show it in "full screen" overlaying the grid
    // If not, we show a grid of minimized interaction views or just the cards

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                        <Grid size={20} />
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-sm tracking-tight">Multi-Session Command Center</h2>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{activeSessions.length} Live Channels</p>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                >
                    <X size={20} />
                </button>
            </header>

            {/* Grid Area */}
            <main className="flex-1 p-6 overflow-y-auto">
                {activeSessions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                        <Activity size={48} className="opacity-20 animate-pulse" />
                        <p className="text-sm font-medium">No active neural streams detected</p>
                        <p className="text-xs opacity-60">Initialize sessions from the Campaign Workspace to see them here.</p>
                    </div>
                ) : (
                    <div className={`grid gap-4 h-full ${activeSessions.length <= 1 ? 'grid-cols-1' :
                        activeSessions.length <= 4 ? 'grid-cols-2' :
                            'grid-cols-3'
                        }`}>
                        {activeSessions.map((session) => (
                            <motion.div
                                key={session.sessionId}
                                layoutId={session.sessionId}
                                className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col group relative shadow-2xl"
                            >
                                {/* Mini Header */}
                                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${session.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                        <span className="text-[10px] font-mono text-slate-400">{session.sessionId.slice(-8)}</span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedSessionId(session.sessionId)}
                                        className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Maximize2 size={14} />
                                    </button>
                                </div>

                                {/* Scaled Down Voice Interaction View */}
                                <div className="flex-1 relative overflow-hidden bg-white">
                                    <div className="scale-[0.4] origin-top absolute inset-0 w-[250%] h-[250%] pointer-events-none">
                                        <VoiceInteraction
                                            sessionId={session.sessionId}
                                            onClose={() => { }}
                                            isReadOnly={true}
                                        />
                                    </div>
                                    {/* Overlay to catch clicks and prevent full interaction in grid mode */}
                                    <div
                                        className="absolute inset-0 cursor-pointer hover:bg-black/10 transition-colors"
                                        onClick={() => setSelectedSessionId(session.sessionId)}
                                    />
                                </div>

                                {/* Footer Info */}
                                <div className="px-4 py-2 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{session.campaignId}</span>
                                    <span className="text-[9px] font-mono text-indigo-400">${session.metrics.totalCost.toFixed(4)}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Focused Session Overlay */}
            <AnimatePresence>
                {selectedSessionId && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="fixed inset-0 z-[60] bg-white flex flex-col"
                    >
                        <VoiceInteraction
                            sessionId={selectedSessionId}
                            onClose={() => setSelectedSessionId(null)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
