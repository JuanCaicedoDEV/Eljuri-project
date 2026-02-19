"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { useSimulation } from '../hooks/useSimulation';
import { Send, Clock, DollarSign, Zap, AlertTriangle, CheckCircle, Mic, MicOff, MoreHorizontal, Workflow, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import FlowEditor from './FlowEditor';

export default function SimulationConsole({ sessionId }: { sessionId: string }) {
    const [viewMode, setViewMode] = useState<'simulation' | 'design'>('simulation');
    const [input, setInput] = useState('');
    const { messages, metrics, isCallActive } = useSimulationStore();
    const { sendMessage, toggleCall } = useSimulation(sessionId);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        sendMessage(input);
        setInput('');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-40px)] max-w-[1800px] mx-auto w-full p-6 gap-6">

            {/* View Toggle */}
            <div className="flex justify-center">
                <div className="bg-zinc-100/50 p-1 rounded-full border border-zinc-200 backdrop-blur-sm flex gap-1">
                    <Button
                        variant="ghost"
                        onClick={() => setViewMode('simulation')}
                        className={`rounded-full px-6 text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'simulation' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
                    >
                        <MessageSquare className="w-4 h-4 mr-2" /> Simulation
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setViewMode('design')}
                        className={`rounded-full px-6 text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'design' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
                    >
                        <Workflow className="w-4 h-4 mr-2" /> Flow Builder
                    </Button>
                </div>
            </div>

            {viewMode === 'simulation' ? (
                <div className="flex gap-8 h-full">
                    {/* Left Panel: Chat Section */}
                    <Card className="flex-1 flex flex-col border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] bg-white/50 backdrop-blur-sm overflow-hidden rounded-[2rem]">
                        <CardHeader className="px-8 py-6 border-b bg-white/50 flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-3">
                                    <div className="p-2 bg-primary/5 rounded-lg">
                                        <Mic className="text-primary w-5 h-5" strokeWidth={1.5} />
                                    </div>
                                    Live Simulation
                                </CardTitle>
                                <CardDescription className="text-xs font-medium uppercase tracking-widest mt-1 opacity-60">
                                    Neural Stream Status: {isCallActive ? 'Active' : 'Standby'}
                                </CardDescription>
                            </div>
                            <Button
                                onClick={toggleCall}
                                variant={isCallActive ? "destructive" : "default"}
                                className="rounded-full px-6 font-bold uppercase text-[10px] tracking-widest h-10 shadow-lg shadow-primary/10 transition-all active:scale-95"
                            >
                                {isCallActive ? <><MicOff className="mr-2 w-4 h-4" /> End Call</> : <><Mic className="mr-2 w-4 h-4" /> Start Stream</>}
                            </Button>
                        </CardHeader>

                        <ScrollArea className="flex-1 px-8">
                            <div className="py-8 space-y-6">
                                <AnimatePresence initial={false}>
                                    {messages.map((msg) => (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[80%] group`}>
                                                <div className={`px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                    : 'bg-white border text-foreground rounded-tl-none'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                                <div className={`flex items-center gap-2 mt-2 px-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tighter">
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </span>
                                                    <Badge variant="outline" className="text-[8px] h-4 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-black tracking-widest">
                                                        {msg.role}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </ScrollArea>

                        <div className="p-8 border-t bg-white/50 backdrop-blur-md">
                            <div className="flex gap-3 relative">
                                <Input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Interject into stream..."
                                    className="h-14 px-6 rounded-2xl border-none bg-zinc-100/80 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm font-medium"
                                />
                                <Button
                                    onClick={handleSend}
                                    size="icon"
                                    className="h-14 w-14 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
                                >
                                    <Send className="w-5 h-5" strokeWidth={1.5} />
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Right Panel: Analytics/Status */}
                    <div className="w-[380px] space-y-8 h-full flex flex-col">
                        {/* Status Indicator Card */}
                        <Card className={`border-none shadow-xl overflow-hidden rounded-[2rem] transition-colors duration-500 ${metrics.profitabilityStatus === 'CRITICAL' ? 'bg-destructive/5' : 'bg-emerald-500/5'
                            }`}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Profitability Status</span>
                                    {metrics.profitabilityStatus === 'CRITICAL' ? (
                                        <AlertTriangle className="text-destructive w-4 h-4" />
                                    ) : (
                                        <CheckCircle className="text-emerald-500 w-4 h-4" />
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className={`text-5xl font-black italic tracking-tighter mb-4 ${metrics.profitabilityStatus === 'CRITICAL' ? 'text-destructive' : 'text-emerald-600'
                                    }`}>
                                    {metrics.profitabilityStatus}.
                                </div>
                                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                                    {metrics.profitabilityStatus === 'CRITICAL'
                                        ? 'Costs have exceeded the defined $0.045/min threshold. Immediate intervention required.'
                                        : 'Operations are currently within optimal fiscal boundaries.'}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Metrics Grid */}
                        <Card className="flex-1 border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] bg-white/50 backdrop-blur-sm rounded-[2rem] flex flex-col">
                            <CardHeader className="border-b border-zinc-50 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Session Analytics</CardTitle>
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground/40" />
                            </CardHeader>
                            <CardContent className="p-8 space-y-8 flex-1 overflow-y-auto">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                        <Clock className="text-indigo-500 w-5 h-5" strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Stream Duration</p>
                                        <p className="text-2xl font-black tracking-tight">{Math.floor(metrics.duration / 60)}:{(metrics.duration % 60).toString().padStart(2, '0')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                        <DollarSign className="text-emerald-500 w-5 h-5" strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Accumulated Cost</p>
                                        <p className="text-2xl font-black tracking-tight">${metrics.totalCost.toFixed(4)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                                        <Zap className="text-blue-500 w-5 h-5" strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Current CPM</p>
                                        <p className="text-2xl font-black tracking-tight">${metrics.currentCPM.toFixed(4)}<span className="text-xs text-muted-foreground/40 font-bold ml-1">/MIN</span></p>
                                    </div>
                                </div>

                                <Separator className="bg-zinc-100" />

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Neural Token Usage</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl border bg-white/50">
                                            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase mb-1">Input</p>
                                            <p className="text-xl font-black font-mono">{metrics.tokenUsage.input}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl border bg-white/50">
                                            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase mb-1">Output</p>
                                            <p className="text-xl font-black font-mono">{metrics.tokenUsage.output}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-300">
                    <Card className="flex-1 border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] bg-white/50 backdrop-blur-sm overflow-hidden rounded-[2rem] flex flex-col">
                        <CardHeader className="px-8 py-6 border-b bg-white/50 flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/5 rounded-lg">
                                        <Workflow className="text-indigo-500 w-5 h-5" strokeWidth={1.5} />
                                    </div>
                                    Flow Builder
                                </CardTitle>
                                <CardDescription className="text-xs font-medium uppercase tracking-widest mt-1 opacity-60">
                                    Design Conversation Logic
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 relative">
                            <FlowEditor />
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
