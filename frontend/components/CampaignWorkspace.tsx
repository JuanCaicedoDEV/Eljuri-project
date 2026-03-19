"use client";

import React, { useState, useEffect } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { usePhoneNumberStore } from '../store/usePhoneNumberStore';
import { useSessionManager } from '../hooks/useSessionManager';
import { Terminal, LayoutGrid, Phone, Play, ArrowLeft, Save, ShieldCheck, Cpu, Code2, Sparkles, ChevronRight, Settings2, Users, PhoneCall, PhoneOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import FlowEditor from './FlowEditor';

import { getCampaignConfig } from '../store/campaignConfigs';

export default function CampaignWorkspace({ campaignId, onBack, onTest }: {
    campaignId: string,
    onBack: () => void,
    onTest: (sessionId: string) => void
}) {
    const { systemPrompt, setSystemPrompt, expectedOutput, setExpectedOutput, agentType, setAgentType, getSessionsByCampaign } = useSimulationStore();
    const { phoneNumbers, fetchPhoneNumbers } = usePhoneNumberStore();
    const { startSession } = useSessionManager();
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

    // Real call state
    const [realCallTarget, setRealCallTarget] = useState('');
    const [realCallStatus, setRealCallStatus] = useState<'idle' | 'dialing' | 'active' | 'ended' | 'error'>('idle');
    const [realCallSid, setRealCallSid] = useState<string | null>(null);
    const [realCallError, setRealCallError] = useState<string | null>(null);

    const campaignPhones = phoneNumbers.filter(pn => pn.campaignId === campaignId);
    const activeSessions = getSessionsByCampaign(campaignId);

    // Pre-load system prompt & schema for this campaign (if it has a known config)
    useEffect(() => {
        const config = getCampaignConfig(campaignId);
        if (config) {
            setSystemPrompt(config.systemPrompt);
            setExpectedOutput(config.expectedOutput);
        }
    }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchPhoneNumbers();
    }, [fetchPhoneNumbers]);

    const handleRealCall = async () => {
        if (!realCallTarget.trim()) return;
        setRealCallStatus('dialing');
        setRealCallError(null);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3008';
            const res = await fetch(`${backendUrl}/api/calls/outbound`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: realCallTarget.trim(),
                    campaignId,
                    systemInstruction: systemPrompt,
                    voiceName: 'Kore',
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al iniciar llamada');
            setRealCallSid(data.callSid);
            setRealCallStatus('active');
        } catch (err: any) {
            setRealCallError(err.message);
            setRealCallStatus('error');
        }
    };

    const handleEndCall = async () => {
        if (!realCallSid) return;
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3008';
            await fetch(`${backendUrl}/api/calls/${realCallSid}/end`, { method: 'POST' });
        } catch (_) {}
        setRealCallStatus('ended');
        setRealCallSid(null);
    };

    const handleRunSimulation = async () => {
        console.log("handleRunSimulation clicked! Campaign:", campaignId, "Phone:", selectedPhone);
        try {
            console.log("Calling startSession...");
            const session = await startSession(campaignId, selectedPhone || undefined);
            console.log("startSession returned:", session);
            onTest(session.sessionId);
            console.log("onTest called successfully.");
        } catch (error) {
            console.error("Failed to start session in Catch:", error);
            // Fallback to local test if backend fails
            onTest(`test-${campaignId}-${Date.now()}`);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen flex flex-col lg:flex-row bg-white overflow-x-hidden"
        >
            {/* ... Sidebar ... */}

            {/* 2. Main Content: Editor Area */}
            <main className="flex-1 flex flex-col relative bg-white min-h-[600px] lg:min-h-screen">
                <header className="h-24 px-12 border-b border-zinc-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
                    {/* ... Header content ... */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-[pulse_3s_infinite]" />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Logic Engine Ready</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1">
                    <div className="p-8 lg:p-12 space-y-8 max-w-5xl mx-auto">

                        {/* Logic Type Selector */}
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-black text-zinc-950 tracking-tighter italic">Agent Behavior Logic</h3>
                            <div className="bg-zinc-100 p-1 rounded-xl flex items-center">
                                <button
                                    onClick={() => setAgentType('prompt')}
                                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${agentType === 'prompt' ? 'bg-white shadow-sm text-primary' : 'text-zinc-400 hover:text-zinc-600'
                                        }`}
                                >
                                    Simple Prompt
                                </button>
                                <button
                                    onClick={() => setAgentType('flow')}
                                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${agentType === 'flow' ? 'bg-white shadow-sm text-primary' : 'text-zinc-400 hover:text-zinc-600'
                                        }`}
                                >
                                    Visual Flow
                                </button>
                            </div>
                        </div>

                        <Tabs defaultValue="prompt" className="w-full">
                            <TabsList className="bg-zinc-50 p-1.5 rounded-2xl h-auto mb-10 w-fit">
                                <TabsTrigger value="prompt" className="rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Logic Definition</TabsTrigger>
                                <TabsTrigger value="schema" className="rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Extraction Mapping</TabsTrigger>
                            </TabsList>

                            <TabsContent value="prompt" className="mt-0">
                                <Card className="border-zinc-100 shadow-2xl shadow-zinc-200/40 rounded-[2.5rem] overflow-hidden min-h-[600px]">
                                    <div className="bg-zinc-50/50 px-8 py-4 border-b border-zinc-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-zinc-200" />
                                            <div className="w-2 h-2 rounded-full bg-zinc-200" />
                                            <div className="w-2 h-2 rounded-full bg-zinc-200" />
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                                            {agentType === 'prompt' ? 'system_prompt.txt' : 'conversation_flow.json'}
                                        </span>
                                    </div>

                                    {agentType === 'prompt' ? (
                                        <textarea
                                            value={systemPrompt}
                                            onChange={(e) => setSystemPrompt(e.target.value)}
                                            className="w-full h-[600px] bg-transparent border-none p-10 font-mono text-sm leading-relaxed text-zinc-600 focus:ring-0 outline-none resize-none"
                                            placeholder="Initialize agent behavior protocol..."
                                        />
                                    ) : (
                                        <div className="w-full h-[600px] bg-white">
                                            <FlowEditor />
                                        </div>
                                    )}
                                </Card>
                            </TabsContent>

                            <TabsContent value="schema" className="mt-0">
                                <Card className="border-zinc-100 shadow-2xl shadow-zinc-200/40 rounded-[2.5rem] overflow-hidden">
                                    <div className="bg-zinc-50/50 px-8 py-4 border-b border-zinc-100 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">extraction_logic.json</span>
                                    </div>
                                    <textarea
                                        value={expectedOutput}
                                        onChange={(e) => setExpectedOutput(e.target.value)}
                                        className="w-full h-64 bg-transparent border-none p-10 font-mono text-sm leading-relaxed text-zinc-400 focus:ring-0 outline-none resize-none"
                                        placeholder="[ { 'field': 'intent', 'type': 'string' } ]"
                                    />
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </main>

            {/* 3. Right Panel: Action & Metrics */}
            <aside className="w-full lg:w-[450px] border-t lg:border-l lg:border-t-0 border-zinc-100 p-10 flex flex-col gap-10 bg-zinc-50/20">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Telephony Access</span>
                        <Badge variant="outline" className="text-[8px] uppercase font-black tracking-tighter px-2 py-0">
                            {campaignPhones.length} Numbers
                        </Badge>
                    </div>
                    <div className="space-y-3">
                        {campaignPhones.length > 0 ? (
                            campaignPhones.map((phone, idx) => (
                                <motion.button
                                    key={phone.id}
                                    whileHover={{ x: 4 }}
                                    onClick={() => setSelectedPhone(phone.phoneNumber)}
                                    className={`w-full p-5 rounded-[1.5rem] border transition-all flex items-center justify-between group ${selectedPhone === phone.phoneNumber
                                        ? 'bg-zinc-950 border-zinc-950 text-white shadow-2xl'
                                        : 'bg-white border-zinc-100 text-zinc-400 hover:border-primary/20 hover:bg-zinc-50/50 shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${phone.status === 'available' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-200'}`} />
                                        <span className="text-sm font-black tracking-tight">{phone.phoneNumber}</span>
                                    </div>
                                    <div className={`p-2 rounded-lg transition-colors ${selectedPhone === phone.phoneNumber ? 'bg-white/10' : 'bg-zinc-50 group-hover:bg-primary/5'}`}>
                                        <Phone size={14} strokeWidth={2} />
                                    </div>
                                </motion.button>
                            ))
                        ) : (
                            <div className="p-10 border-2 border-dashed border-zinc-100 rounded-[2.5rem] text-center space-y-2">
                                <Phone className="mx-auto text-zinc-200" size={24} />
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No numbers assigned</p>
                                <p className="text-[9px] text-zinc-300 italic">Assign numbers in the dashboard tabs.</p>
                            </div>
                        )}
                    </div>
                    {campaignPhones.length > 0 && (
                        <p className="text-[9px] text-zinc-400 font-medium italic text-center px-4">Select a neural entry point for the simulation.</p>
                    )}
                </div>

                {/* Active Sessions Mini-Monitor */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Active Channels</span>
                        <Badge variant="secondary" className="text-[8px] uppercase font-black tracking-tighter px-2 py-0">
                            {activeSessions.length} / 10
                        </Badge>
                    </div>
                    {activeSessions.length > 0 ? (
                        <div className="space-y-3">
                            {activeSessions.slice(0, 3).map((session) => (
                                <div key={session.sessionId} className="p-4 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-zinc-600 truncate max-w-[120px]">{session.sessionId}</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-zinc-400">${session.metrics.totalCost.toFixed(4)}</span>
                                </div>
                            ))}
                            {activeSessions.length > 3 && (
                                <p className="text-[9px] text-zinc-400 text-center font-bold uppercase tracking-widest">+ {activeSessions.length - 3} more channels</p>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 border border-zinc-100 rounded-[2rem] text-center space-y-1">
                            <Users className="mx-auto text-zinc-100" size={20} />
                            <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">No active calls</p>
                        </div>
                    )}
                </div>

                <div className="mt-10 lg:mt-auto">
                    <Card className="bg-primary p-10 rounded-[3rem] text-white space-y-8 shadow-[0_32px_64px_-16px_rgba(37,99,235,0.4)] relative overflow-hidden group border-none">
                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 blur-[80px] group-hover:scale-150 transition-transform duration-1000" />

                        <div className="relative z-10">
                            <Badge variant="outline" className="bg-white/10 text-white border-white/20 mb-6 font-black uppercase tracking-widest text-[9px] px-3 py-1">
                                Reality Distortion Check
                            </Badge>
                            <h4 className="text-4xl font-black leading-tight italic tracking-tighter mb-2">Neural Stream <br /> Protocol.</h4>
                            <p className="text-white/60 text-xs font-medium leading-relaxed">Validate your system prompt against real-time vocal patterns.</p>
                        </div>

                        <Button
                            onClick={handleRunSimulation}
                            size="lg"
                            className="w-full bg-white text-primary h-16 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-zinc-50 transition-all transform active:scale-95 shadow-white/10"
                        >
                            <Play fill="currentColor" size={16} className="mr-1" /> Run Simulation
                        </Button>
                        <div className="flex items-center justify-center gap-2 opacity-40">
                            <ShieldCheck size={12} strokeWidth={2} />
                            <span className="text-[8px] font-black uppercase tracking-widest">Encrypted Sandbox Environment</span>
                        </div>
                    </Card>
                </div>

                {/* ── Real Call Panel ─────────────────────────────────── */}
                <div className="border border-zinc-200 rounded-[2rem] p-6 space-y-4 bg-white shadow-sm">
                    <div className="flex items-center gap-2">
                        <PhoneCall size={14} strokeWidth={2.5} className="text-emerald-600" />
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Llamada Real</span>
                        <span className="ml-auto text-[8px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest">Colombia · Ecuador</span>
                    </div>

                    <input
                        type="tel"
                        value={realCallTarget}
                        onChange={(e) => setRealCallTarget(e.target.value)}
                        placeholder="+57300000000 o +593900000000"
                        disabled={realCallStatus === 'dialing' || realCallStatus === 'active'}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-mono text-zinc-700 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50 disabled:bg-zinc-50"
                    />

                    {realCallStatus === 'idle' || realCallStatus === 'ended' || realCallStatus === 'error' ? (
                        <button
                            onClick={handleRealCall}
                            disabled={!realCallTarget.trim()}
                            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <PhoneCall size={14} /> Iniciar Llamada
                        </button>
                    ) : realCallStatus === 'dialing' ? (
                        <button disabled className="w-full h-12 rounded-xl bg-zinc-100 text-zinc-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                            <Loader2 size={14} className="animate-spin" /> Marcando…
                        </button>
                    ) : (
                        <button
                            onClick={handleEndCall}
                            className="w-full h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 animate-pulse"
                        >
                            <PhoneOff size={14} /> Colgar
                        </button>
                    )}

                    {realCallStatus === 'active' && realCallSid && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-mono text-emerald-700 truncate">{realCallSid}</span>
                        </div>
                    )}

                    {realCallStatus === 'ended' && (
                        <p className="text-[9px] text-center text-zinc-400 font-bold uppercase tracking-widest">Llamada finalizada</p>
                    )}

                    {realCallStatus === 'error' && realCallError && (
                        <p className="text-[9px] text-red-500 font-bold text-center">{realCallError}</p>
                    )}

                    <p className="text-[8px] text-zinc-300 text-center leading-relaxed">
                        Requiere Twilio configurado en <span className="font-mono">.env</span> y ngrok activo.
                    </p>
                </div>
            </aside>
        </motion.div>
    );
}
