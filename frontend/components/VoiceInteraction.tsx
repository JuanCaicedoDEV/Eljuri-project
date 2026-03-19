"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { useSimulation } from '../hooks/useSimulation';
import { VoiceLiveClient } from '../lib/VoiceLiveClient';
import { flowToPrompt, advanceFlow } from '../lib/flowToPrompt';
import { Mic, MicOff, X, Zap, Activity, Info, TrendingUp, BarChart3, Clock, DollarSign, BrainCircuit, ArrowRight, Layers, ShieldCheck, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function VoiceInteraction({ sessionId, onClose, isReadOnly = false }: { sessionId: string, onClose: () => void, isReadOnly?: boolean }) {
    const { getSession, updateSessionStatus, setCallActiveForSession, systemPrompt, agentType, flowData, activeNodeId, setActiveNode, expectedOutput } = useSimulationStore();
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

    // Full conversation transcript
    const [conversationLog, setConversationLog] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);

    // Cost controls (configurable per-session)
    const [maxBudgetUSD, setMaxBudgetUSD] = useState<number>(0.10);
    const [budgetWarning, setBudgetWarning] = useState<string | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);

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
            // Compute system instruction based on agent type
            const systemInstruction = agentType === 'flow' && flowData.nodes.length > 0
                ? flowToPrompt(flowData)
                : (systemPrompt || undefined);

            const client = new VoiceLiveClient({
                voiceName: selectedVoice,
                language: language,
                accent: accent,
                sessionId: sessionId,
                systemInstruction,
                maxBudgetUSD
            });

            // Reset conversation log for fresh session
            setConversationLog([]);
            setBudgetWarning(null);
            setConnectionError(null);

            // Activate the first speak/listen node when flow mode starts
            if (agentType === 'flow' && flowData.nodes.length > 0) {
                const firstActive = flowData.nodes.find(n => n.type === 'speak' || n.type === 'listen');
                if (firstActive) setActiveNode(firstActive.id);
            }

            client.onConnected = (voice: string) => {
                console.log('[VoiceInteraction] 🎙️ Live mode connected with voice:', voice);
                setLiveConnected(true);
                setCurrentVoice(voice);
                // Auto-start streaming as soon as Gemini is ready
                client.startStreaming().then(() => {
                    setLiveStreaming(true);
                    setIsListening(true);
                    console.log('[VoiceInteraction] 🎤 Auto-streaming started');
                }).catch((err) => {
                    console.error('[VoiceInteraction] Auto-stream failed:', err);
                });
            };

            client.onDisconnected = () => {
                console.log('[VoiceInteraction] Live mode disconnected');
                setLiveConnected(false);
                setLiveStreaming(false);
            };

            client.onTranscript = (text: string) => {
                setLiveTranscripts(prev => [...prev.slice(-4), text]);
                setIsSpeaking(true);
                // Append agent turn to conversation log
                setConversationLog(prev => {
                    const last = prev[prev.length - 1];
                    // Merge consecutive agent fragments into one turn
                    if (last && last.role === 'agent') {
                        return [...prev.slice(0, -1), { role: 'agent', text: last.text + ' ' + text }];
                    }
                    return [...prev, { role: 'agent', text }];
                });
            };

            client.onUserTranscript = (text: string) => {
                // Append user turn to conversation log
                setConversationLog(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'user') {
                        return [...prev.slice(0, -1), { role: 'user', text: last.text + ' ' + text }];
                    }
                    return [...prev, { role: 'user', text }];
                });

                // Advance the active node in flow mode
                if (agentType === 'flow') {
                    const nextId = advanceFlow(activeNodeId, text, flowData.nodes, flowData.edges);
                    if (nextId) setActiveNode(nextId);
                }
            };

            client.onTurnComplete = () => {
                setIsSpeaking(false);
            };

            client.onError = (error: string) => {
                console.error('[VoiceInteraction] Live error:', error);
                setConnectionError(error);
            };

            client.onBudgetExceeded = (info) => {
                const msg = `Budget limit $${info.limit.toFixed(2)} reached ($${info.spent.toFixed(4)} spent). Session ended.`;
                setBudgetWarning(msg);
                console.warn('[VoiceInteraction]', msg);
                // Auto-show report after a short delay
                setTimeout(() => {
                    updateSessionStatus(sessionId, 'completed');
                    setShowReport(true);
                }, 1500);
            };

            liveClientRef.current = client;

            // Auto-connect
            client.connect().catch(console.error);
        }

        return () => {
            // Full teardown: disconnect, null the ref, reset all live state
            if (liveClientRef.current) {
                liveClientRef.current.disconnect();
                liveClientRef.current = null;
            }
            setLiveConnected(false);
            setLiveStreaming(false);
            setIsSpeaking(false);
            setIsListening(false);
        };
    }, [useLiveMode, selectedVoice, sessionId]);  // sessionId ensures re-mount creates a fresh client

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
        // Kill the live client immediately and null out the ref
        if (liveClientRef.current) {
            liveClientRef.current.disconnect();
            liveClientRef.current = null;
        }
        setLiveConnected(false);
        setLiveStreaming(false);
        setIsSpeaking(false);
        setIsListening(false);
        fetch(`http://localhost:3008/api/sessions/${sessionId}/terminate`, {
            method: 'POST'
        }).catch(() => { });
        setCallActiveForSession(sessionId, false);
        onClose();
    };

    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [sentiment, setSentiment] = useState<'Positive' | 'Neutral' | 'Negative'>('Neutral');

    // Extraction State
    const [extractedData, setExtractedData] = useState<any>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionError, setExtractionError] = useState<string | null>(null);

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

    // Extraction Logic
    useEffect(() => {
        if (showReport && expectedOutput && conversationLog.length > 0 && !extractedData && !isExtracting) {
            const performExtraction = async () => {
                setIsExtracting(true);
                try {
                    const transcript = conversationLog.map(t => `${t.role}: ${t.text}`).join('\\n');
                    const response = await fetch('http://localhost:3008/api/extract', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            transcript,
                            extractionSchema: expectedOutput
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`Extraction failed: ${response.statusText}`);
                    }

                    const data = await response.json();
                    setExtractedData(data);
                } catch (err: any) {
                    console.error('[VoiceInteraction] Extraction Error:', err);
                    setExtractionError(err.message);
                } finally {
                    setIsExtracting(false);
                }
            };
            performExtraction();
        }
    }, [showReport, expectedOutput, conversationLog, extractedData, isExtracting]);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioElement) audioElement.pause();
        };
    }, [audioElement]);

    const handleToggle = () => {
        if (isListening) {
            stopRecording();
            // Disconnect the live client so the server session closes cleanly
            if (liveClientRef.current) {
                liveClientRef.current.disconnect();
                liveClientRef.current = null;
            }
            setLiveConnected(false);
            setLiveStreaming(false);
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
                className="fixed inset-0 z-[100] bg-white overflow-y-auto"
            >
                <div className="max-w-4xl mx-auto px-6 pt-20 pb-20">
                    <header className="mb-16 text-center">
                        <Badge variant="outline" className="mb-8 font-black uppercase tracking-[0.3em] px-4 py-1.5 border-primary/20 text-primary">Session Finalized</Badge>
                        <h2 className="text-7xl font-black text-zinc-950 tracking-tighter mb-4 italic">Analysis.</h2>
                        <p className="text-zinc-400 text-xs font-mono tracking-widest uppercase">Session ID: {sessionId.slice(-12)}</p>
                    </header>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-100 border border-zinc-100 rounded-3xl overflow-hidden mb-12 shadow-xl shadow-zinc-100">
                        {[
                            { label: 'Duration', val: `${Math.floor(metrics.duration / 60)}:${(metrics.duration % 60).toString().padStart(2, '0')}`, icon: Clock },
                            { label: 'Cost', val: `$${metrics.totalCost.toFixed(4)}`, icon: DollarSign, intense: true },
                            { label: 'Engagement', val: sentiment, icon: TrendingUp },
                            { label: 'Status', val: metrics.profitabilityStatus, icon: BrainCircuit }
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-8 bg-white flex flex-col items-center justify-center text-center"
                            >
                                <stat.icon className="text-zinc-300 mb-3" strokeWidth={1.5} size={20} />
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{stat.label}</p>
                                <p className={`text-2xl font-black italic tracking-tighter ${stat.intense ? 'text-primary' : 'text-zinc-900'}`}>{stat.val}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Conversation Transcript */}
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-px flex-1 bg-zinc-100" />
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Transcript</p>
                            <div className="h-px flex-1 bg-zinc-100" />
                        </div>

                        {conversationLog.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-zinc-200 rounded-2xl">
                                <p className="text-zinc-400 text-sm">No transcript available for this session.</p>
                                <p className="text-zinc-300 text-xs mt-1">Gemini inputAudioTranscription may not have returned text.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {conversationLog.map((turn, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 + i * 0.05 }}
                                        className={`flex gap-4 ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {turn.role === 'agent' && (
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <BrainCircuit size={14} className="text-primary" strokeWidth={1.5} />
                                            </div>
                                        )}
                                        <div className={`max-w-[75%] rounded-2xl px-5 py-3 ${turn.role === 'user'
                                            ? 'bg-zinc-950 text-white rounded-br-sm'
                                            : 'bg-zinc-50 text-zinc-800 border border-zinc-100 rounded-bl-sm'
                                            }`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${turn.role === 'user' ? 'text-zinc-400' : 'text-primary'
                                                }`}>
                                                {turn.role === 'user' ? 'You' : `Agent · ${currentVoice}`}
                                            </p>
                                            <p className="text-sm leading-relaxed">{turn.text}</p>
                                        </div>
                                        {turn.role === 'user' && (
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                                                <Mic size={14} className="text-zinc-500" strokeWidth={1.5} />
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Extraction Mapping Data */}
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-px flex-1 bg-zinc-100" />
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Extracted Data</p>
                            <div className="h-px flex-1 bg-zinc-100" />
                        </div>

                        {isExtracting ? (
                            <div className="text-center py-12 border border-dashed border-zinc-200 rounded-2xl flex flex-col items-center">
                                <Activity className="text-zinc-400 mb-3 animate-pulse" size={24} />
                                <p className="text-zinc-600 text-sm font-medium">Extracting data from conversation...</p>
                            </div>
                        ) : extractionError ? (
                            <div className="text-center py-12 border border-dashed border-rose-200 rounded-2xl bg-rose-50/50">
                                <p className="text-rose-500 text-sm font-bold">Extraction Error</p>
                                <p className="text-rose-400 text-xs mt-1">{extractionError}</p>
                            </div>
                        ) : extractedData ? (
                            <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-zinc-50 border-b border-zinc-100">
                                        <tr>
                                            <th className="px-6 py-4 font-black tracking-widest uppercase text-[10px] text-zinc-400">Field Name</th>
                                            <th className="px-6 py-4 font-black tracking-widest uppercase text-[10px] text-zinc-400">Extracted Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {Object.entries(extractedData).map(([key, value]: [string, any], i) => (
                                            <motion.tr
                                                key={key}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="hover:bg-zinc-50/50 transition-colors"
                                            >
                                                <td className="px-6 py-4 font-mono text-zinc-600 text-xs">
                                                    {key}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {typeof value === 'boolean' ? (
                                                        <Badge variant="outline" className={value ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200"}>
                                                            {value ? 'True' : 'False'}
                                                        </Badge>
                                                    ) : value === null || value === undefined || value === '' ? (
                                                        <span className="text-zinc-300 italic">Not provided</span>
                                                    ) : (
                                                        <span className="text-zinc-800 font-medium">{String(value)}</span>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12 border border-dashed border-zinc-200 rounded-2xl">
                                <p className="text-zinc-400 text-sm">No data extracted.</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center flex-col items-center gap-4">
                        <Button
                            onClick={() => { handleClose(); }}
                            size="lg"
                            className="bg-zinc-950 text-white px-16 py-8 rounded-full font-black text-[10px] uppercase tracking-[0.3em] hover:bg-primary transition-all shadow-2xl active:scale-95 flex items-center gap-4"
                        >
                            Close Analysis <ArrowRight size={18} strokeWidth={1.5} />
                        </Button>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{conversationLog.length} turns recorded</p>
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
                    {connectionError && (
                        <p className="text-rose-500 text-xs font-mono bg-rose-50 border border-rose-200 rounded-xl px-4 py-2">
                            ⚠ {connectionError}
                        </p>
                    )}
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
