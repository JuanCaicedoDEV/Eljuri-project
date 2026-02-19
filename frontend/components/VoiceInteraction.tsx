"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { useSimulation } from '../hooks/useSimulation';
import { VoiceLiveClient } from '../lib/VoiceLiveClient';
import { Mic, MicOff, X, Zap, Activity, Info, TrendingUp, BarChart3, Clock, DollarSign, BrainCircuit, ArrowRight, Layers, ShieldCheck, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function VoiceInteraction({ sessionId, onClose, isReadOnly = false }: { sessionId: string, onClose: () => void, isReadOnly?: boolean }) {
    const { getSession, updateSessionStatus, setCallActiveForSession } = useSimulationStore();
    const isTerminating = useRef(false);

    // ========== LIVE MODE (Gemini 2.5 Native Audio) ==========
    const [useLiveMode, setUseLiveMode] = useState(true); // Default to Live mode
    const liveClientRef = useRef<VoiceLiveClient | null>(null);
    const [liveConnected, setLiveConnected] = useState(false);
    const [liveStreaming, setLiveStreaming] = useState(false);
    const [liveTranscripts, setLiveTranscripts] = useState<string[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
    const [currentVoice, setCurrentVoice] = useState<string>('Kore');
    const [language, setLanguage] = useState<'es' | 'en'>('es');
    const [accent, setAccent] = useState<string>('ecuadorian');

    // Reset accent when language changes
    useEffect(() => {
        if (language === 'es') setAccent('ecuadorian');
        else setAccent('american');

        // Reconnect if connected? Or wait for next session? 
        // For smoother UX, maybe we don't auto-reconnect just on language change unless user speaks.
        // But the system instruction needs to update.
        // Let's assume user changes settings before connecting or we force a reconnect.
        if (liveClientRef.current) {
            handleConfigChange();
        }
    }, [language]);

    useEffect(() => {
        if (liveClientRef.current) {
            handleConfigChange();
        }
    }, [accent]);

    const handleConfigChange = () => {
        if (liveClientRef.current) {
            liveClientRef.current.disconnect();
            liveClientRef.current = null;
        }
        setLiveConnected(false);
        // Effect [useLiveMode, selectedVoice, language, accent] will pick this up if added to dependency array
    };

    // Initialize Live client
    useEffect(() => {
        if (useLiveMode && !liveClientRef.current && !isReadOnly) {
            const client = new VoiceLiveClient({
                voiceName: selectedVoice,
                language: language,
                accent: accent,
                sessionId: sessionId
            });

            client.onConnected = (voice: string) => {
                console.log('[VoiceInteraction] 🎙️ Live mode connected with voice:', voice);
                setLiveConnected(true);
                setCurrentVoice(voice);
            };

            client.onDisconnected = () => {
                console.log('[VoiceInteraction] Live mode disconnected');
                setLiveConnected(false);
                setLiveStreaming(false);
            };

            client.onTranscript = (text: string) => {
                setLiveTranscripts(prev => [...prev.slice(-4), text]); // Keep last 5
                setIsSpeaking(true);
            };

            client.onTurnComplete = () => {
                setIsSpeaking(false);
            };

            client.onError = (error: string) => {
                console.error('[VoiceInteraction] Live error:', error);
            };

            liveClientRef.current = client;

            // Auto-connect
            client.connect().catch(console.error);
        }

        return () => {
            if (liveClientRef.current) {
                liveClientRef.current.disconnect();
                liveClientRef.current = null;
            }
        };
    }, [useLiveMode, selectedVoice]);

    // Live mode: Start/Stop streaming
    const toggleLiveStreaming = async () => {
        if (!liveClientRef.current || !liveConnected) return;

        if (liveStreaming) {
            liveClientRef.current.stopStreaming();
            setLiveStreaming(false);
            setIsListening(false);
        } else {
            await liveClientRef.current.startStreaming();
            setLiveStreaming(true);
            setIsListening(true);
        }
    };

    // Function to change voice (requires reconnect)
    const changeVoice = (newVoice: string) => {
        if (newVoice !== selectedVoice) {
            // Disconnect current session
            if (liveClientRef.current) {
                liveClientRef.current.disconnect();
                liveClientRef.current = null;
            }
            setLiveConnected(false);
            setSelectedVoice(newVoice);
            // The useEffect will reconnect with new voice
        }
    };

    // Auto-terminate session on cleanup/close
    useEffect(() => {
        return () => {
            if (!isTerminating.current) {
                console.log(`[VoiceInteraction] Auto-terminating session ${sessionId}`);
                isTerminating.current = true;
                fetch(`http://localhost:3008/api/sessions/${sessionId}/terminate`, {
                    method: 'POST',
                    keepalive: true
                }).catch(e => console.error("Termination failed", e));
                setCallActiveForSession(sessionId, false);
            }
        };
    }, [sessionId, setCallActiveForSession]);

    const handleClose = () => {
        isTerminating.current = true;
        if (liveClientRef.current) {
            liveClientRef.current.disconnect();
        }
        fetch(`http://localhost:3008/api/sessions/${sessionId}/terminate`, {
            method: 'POST'
        });
        setCallActiveForSession(sessionId, false);
        onClose();
    };

    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [sentiment, setSentiment] = useState<'Positive' | 'Neutral' | 'Negative'>('Neutral');

    // Get session-specific data
    const session = getSession(sessionId);
    const messages = session?.messages || [];
    const metrics = session?.metrics || {
        duration: 0,
        totalCost: 0,
        tokenUsage: { input: 0, output: 0, total: 0 },
        currentCPM: 0,
        profitabilityStatus: 'PROFITABLE'
    };

    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const audioQueue = useRef<string[]>([]);
    const isProcessingQueue = useRef(false);

    const playNextInQueue = () => {
        if (audioQueue.current.length === 0) {
            isProcessingQueue.current = false;
            setIsSpeaking(false);
            setAudioElement(null);
            return;
        }

        isProcessingQueue.current = true;
        setIsSpeaking(true);
        const nextChunk = audioQueue.current.shift();

        if (nextChunk) {
            const audio = new Audio(`data:audio/mp3;base64,${nextChunk}`);
            setAudioElement(audio);

            audio.onended = () => {
                playNextInQueue();
            };

            audio.onerror = (e) => {
                console.error("Audio chunk playback failed", e);
                playNextInQueue();
            }

            audio.play().catch(e => {
                console.error("Audio play failed", e);
                playNextInQueue();
            });
        }
    };

    const queueAudioChunk = (audioBase64: string) => {
        audioQueue.current.push(audioBase64);
        if (!isProcessingQueue.current) {
            playNextInQueue();
        }
    };

    const { sendMessage } = useSimulation(sessionId, queueAudioChunk);

    // Unified recording functions
    const startRecording = toggleLiveStreaming;
    const stopRecording = toggleLiveStreaming;

    // Sentiment Analysis Logic
    useEffect(() => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1].content.toLowerCase();
            if (lastMsg.includes('cost') || lastMsg.includes('limit') || lastMsg.includes('error')) setSentiment('Negative');
            else if (lastMsg.includes('great') || lastMsg.includes('help') || lastMsg.includes('thanks')) setSentiment('Positive');
            else setSentiment('Neutral');
        }
    }, [messages]);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioElement) audioElement.pause();
        };
    }, [audioElement]);

    const handleToggle = () => {
        if (isListening) {
            stopRecording();
            updateSessionStatus(sessionId, 'completed');
            setShowReport(true);
        } else {
            startRecording();
        }
    };

    if (showReport) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-white px-6 overflow-y-auto pt-20 pb-20"
            >
                <div className="max-w-4xl w-full">
                    <header className="mb-20 text-center">
                        <Badge variant="outline" className="mb-8 font-black uppercase tracking-[0.3em] px-4 py-1.5 border-primary/20 text-primary">Session Finalized</Badge>
                        <h2 className="text-7xl font-black text-zinc-950 tracking-tighter mb-4 italic">Analysis.</h2>
                        <p className="text-zinc-400 text-xs font-mono tracking-widest uppercase">Encrypted Session ID: {sessionId.slice(-12)}</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-100 border border-zinc-100 rounded-[3rem] overflow-hidden mb-16 shadow-2xl shadow-zinc-200">
                        {[
                            { label: 'Time Stream', val: `${Math.floor(metrics.duration / 60)}:${(metrics.duration % 60).toString().padStart(2, '0')}`, icon: Clock },
                            { label: 'Fiscal Burn', val: `$${metrics.totalCost.toFixed(4)}`, icon: DollarSign, intense: true },
                            { label: 'Engagement', val: sentiment, icon: TrendingUp },
                            { label: 'Neural Status', val: metrics.profitabilityStatus, icon: BrainCircuit }
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-16 bg-white flex flex-col items-center justify-center text-center group"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <stat.icon className="text-zinc-400 group-hover:text-primary" strokeWidth={1.5} size={24} />
                                </div>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">{stat.label}</p>
                                <p className={`text-4xl font-black italic tracking-tighter ${stat.intense ? 'text-primary' : 'text-zinc-900'}`}>{stat.val}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="flex justify-center flex-col items-center gap-6">
                        <Button
                            onClick={() => { onClose(); }}
                            size="lg"
                            className="bg-zinc-950 text-white px-16 py-8 rounded-full font-black text-[10px] uppercase tracking-[0.3em] hover:bg-primary transition-all shadow-2xl active:scale-95 flex items-center gap-4"
                        >
                            Close Analysis <ArrowRight size={18} strokeWidth={1.5} />
                        </Button>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Protocol purging will begin immediately</p>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="fixed inset-0 z-[90] bg-white overflow-hidden flex flex-col hero-gradient">
            {/* Immersive Header */}
            <header className="px-12 py-10 flex justify-between items-center relative z-20">
                <div className="flex items-center gap-5">
                    <div className={`p-3.5 rounded-2xl shadow-xl transition-all duration-500 ${isSpeaking ? 'bg-primary shadow-primary/30' : 'bg-zinc-900 shadow-zinc-200'}`}>
                        {isSpeaking ?
                            <Activity className="text-white animate-pulse" size={20} strokeWidth={1.5} /> :
                            <Layers className="text-white" size={20} strokeWidth={1.5} />
                        }
                    </div>
                    <div>
                        <h3 className="text-zinc-900 font-black text-lg tracking-tighter italic leading-none mb-1.5">Neural Stream</h3>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full animate-ping ${isSpeaking ? 'bg-primary' : liveConnected ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                {isSpeaking ? 'Agent Broadcasting' : liveConnected ? `Voice: ${currentVoice}` : 'Connecting...'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Voice Selector */}
                <div className="flex items-center gap-4">
                    <div className="flex bg-zinc-50 rounded-full border border-zinc-100 p-1 mr-4">
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
                            className="bg-transparent text-[10px] font-bold text-zinc-600 focus:outline-none cursor-pointer px-3 py-1 uppercase tracking-wider"
                        >
                            <option value="es">ESP</option>
                            <option value="en">ENG</option>
                        </select>
                        <div className="w-[1px] bg-zinc-200" />
                        <select
                            value={accent}
                            onChange={(e) => setAccent(e.target.value)}
                            className="bg-transparent text-[10px] font-bold text-zinc-600 focus:outline-none cursor-pointer px-3 py-1 uppercase tracking-wider max-w-[100px]"
                        >
                            {language === 'es' ? (
                                <>
                                    <option value="ecuadorian">Ecuatoriano</option>
                                    <option value="neutral">Neutro</option>
                                    <option value="mexican">Mexicano</option>
                                    <option value="colombian">Colombiano</option>
                                    <option value="argentine">Argentino</option>
                                    <option value="spain">Español (España)</option>
                                </>
                            ) : (
                                <>
                                    <option value="american">American</option>
                                    <option value="british">British</option>
                                    <option value="australian">Australian</option>
                                    <option value="indian">Indian</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div className="flex items-center gap-3 bg-zinc-50 rounded-full px-4 py-2 border border-zinc-100">
                        <Radio size={14} className="text-zinc-400" />
                        <select
                            value={selectedVoice}
                            onChange={(e) => changeVoice(e.target.value)}
                            disabled={liveStreaming}
                            className="bg-transparent text-xs font-bold text-zinc-700 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="Kore">Kore (Femenina - Cálida)</option>
                            <option value="Aoede">Aoede (Femenina - Formal)</option>
                            <option value="Puck">Puck (Neutro - Juguetón)</option>
                            <option value="Charon">Charon (Masculina - Profunda)</option>
                            <option value="Fenrir">Fenrir (Masculina - Rápida)</option>
                        </select>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClose}
                        className="w-14 h-14 rounded-full border border-zinc-100 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50 shadow-sm"
                    >
                        <X size={20} strokeWidth={1.5} />
                    </Button>
                </div>
            </header>

            {/* Main Cinema Content */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                {/* Visual grid background subtle */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />

                {/* Expansive Visualizer Orb */}
                <div className="relative mb-20 flex items-center justify-center">
                    <AnimatePresence>
                        {(isListening || isSpeaking) && (
                            <>
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{
                                        scale: isSpeaking ? 2 : 1.5,
                                        opacity: 1,
                                        borderColor: isSpeaking ? 'oklch(0.205 0 0)' : 'oklch(0.205 0 0 / 0.1)'
                                    }}
                                    exit={{ scale: 2, opacity: 0 }}
                                    className={`absolute w-[400px] h-[400px] rounded-full border ${isSpeaking ? 'border-primary/20' : 'border-primary/10'}`}
                                    transition={{ duration: isSpeaking ? 1 : 2, repeat: Infinity, ease: "easeOut" }}
                                />
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: isSpeaking ? 2.2 : 1.8, opacity: 0.5 }}
                                    exit={{ scale: 2.5, opacity: 0 }}
                                    className={`absolute w-[400px] h-[400px] rounded-full border ${isSpeaking ? 'border-primary/10' : 'border-primary/5'}`}
                                    transition={{ duration: isSpeaking ? 1 : 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                                />
                                <motion.div
                                    animate={{
                                        scale: [1, isSpeaking ? 1.1 : 1.05, 1],
                                        opacity: [0.1, isSpeaking ? 0.3 : 0.15, 0.1],
                                    }}
                                    transition={{ duration: isSpeaking ? 2 : 4, repeat: Infinity }}
                                    className="absolute w-[600px] h-[600px] bg-primary/10 blur-[100px] rounded-full"
                                />
                            </>
                        )}
                    </AnimatePresence>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleToggle}
                        className={`relative w-72 h-72 rounded-full flex items-center justify-center z-10 transition-all duration-700 bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-zinc-100 overflow-hidden group`}
                    >
                        <div className={`absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isListening ? 'listening' : isSpeaking ? 'speaking' : 'idle'}
                                initial={{ opacity: 0, scale: 0.8, rotate: -20 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 1.2, rotate: 20 }}
                                className="z-10"
                            >
                                {isSpeaking ?
                                    <Activity className="text-primary" size={64} strokeWidth={1.5} /> :
                                    isListening ?
                                        <Mic className="text-primary" size={64} strokeWidth={1.5} /> :
                                        <MicOff className="text-zinc-300 group-hover:text-primary transition-colors" size={64} strokeWidth={1.5} />
                                }
                            </motion.div>
                        </AnimatePresence>
                    </motion.button>
                </div>

                <div className="text-center space-y-5 max-w-2xl px-12 z-10">
                    <motion.h2
                        animate={{ opacity: isListening || isSpeaking ? 1 : 0.4 }}
                        className="text-8xl font-black italic tracking-tighter text-zinc-950"
                    >
                        {isSpeaking ? "Broadcasting." : isListening ? "Receiving." : "Standby."}
                    </motion.h2>
                    <p className="text-zinc-400 text-xs font-black uppercase tracking-[0.5em] transition-all duration-700 font-mono">
                        {isSpeaking ? "Neural Synthesis: ACTIVE" : isListening ? "Frequency Analysis: ACTIVE" : "Link protocol initialized"}
                    </p>
                </div>
            </div>

            {/* Immersive Footer Controls */}
            <footer className="px-16 py-12 flex items-end justify-between relative z-20">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full transition-all duration-500 ${sentiment === 'Positive' ? 'bg-primary shadow-[0_0_20px_rgba(37,99,235,0.5)]' :
                            sentiment === 'Negative' ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)]' :
                                'bg-zinc-200'
                            }`} />
                        <span className="text-4xl font-black text-zinc-950 italic tracking-tighter">{sentiment}</span>
                    </div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-7">Engagement Metric</p>
                </div>

                <Card className="border-none bg-white-70 backdrop-blur-3xl shadow-2xl shadow-zinc-200/50 rounded-[2.5rem] p-4 border border-zinc-100/50">
                    <div className="flex items-center gap-12 px-10 py-5">
                        <div className="text-center">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Stream Burn</p>
                            <p className="text-3xl font-black text-zinc-950 tracking-tight">${metrics.totalCost.toFixed(4)}</p>
                        </div>
                        <Separator orientation="vertical" className="h-10 bg-zinc-100" />
                        <div className="text-center">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">CPM Factor</p>
                            <p className={`text-xl font-black italic tracking-tighter ${metrics.profitabilityStatus === 'PROFITABLE' ? 'text-primary' : 'text-rose-500'}`}>{metrics.profitabilityStatus}</p>
                        </div>
                    </div>
                </Card>

                <div className="text-right flex items-center gap-8">
                    <div className="text-zinc-300 font-mono text-[10px] tracking-widest uppercase leading-snug">
                        Intelligence Terminal <br />
                        <span className="text-zinc-400">v1.2.0-ELJURI</span>
                    </div>
                    <Button variant="outline" size="icon" className="w-12 h-12 rounded-full border-zinc-100 text-zinc-300 hover:text-zinc-950 shadow-sm">
                        <ShieldCheck size={18} strokeWidth={1.5} />
                    </Button>
                </div>
            </footer>
        </div>
    );
}
