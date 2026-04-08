import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSimulationStore, SessionMetrics, ChatMessage, FlowData } from '../store/useSimulationStore';

export const useSimulation = (sessionId: string, onAudioReceived?: (audioBase64: string) => void) => {
    const socketRef = useRef<Socket | null>(null);
    const {
        addMessageToSession,
        setMetricsForSession,
        setCallActiveForSession,
        getSession,
        defaultSystemPrompt,
        defaultAgentType,
        defaultFlowData
    } = useSimulationStore();

    const session = getSession(sessionId);
    const isCallActive = session?.isCallActive || false;
    const systemPrompt = session?.systemPrompt || defaultSystemPrompt;
    const agentType = session?.agentType || defaultAgentType;
    const flowData = session?.flowData || defaultFlowData;

    useEffect(() => {
        const socketHost = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3008` : 'http://localhost:3008');
        console.log(`[Simulation] Connecting to socket at ${socketHost}`);
        socketRef.current = io(socketHost);

        socketRef.current.on('connect', () => {
            console.log('Connected to simulation server');
            socketRef.current?.emit('join_session', sessionId);
        });

        socketRef.current.on('metrics_update', (metrics: SessionMetrics) => {
            setMetricsForSession(sessionId, metrics);
        });

        socketRef.current.on('audio_chunk', (data: { audio: string, text: string }) => {
            if (data.audio && onAudioReceived) {
                onAudioReceived(data.audio);
            }
        });

        socketRef.current.on('agent_response_complete', (data: { message: ChatMessage, metrics: SessionMetrics }) => {
            addMessageToSession(sessionId, data.message);
            setMetricsForSession(sessionId, data.metrics);
        });

        // Legacy/Fallback listener
        socketRef.current.on('agent_response', (data: { message: ChatMessage, metrics: SessionMetrics, audio?: string }) => {
            if (data.message) addMessageToSession(sessionId, data.message);
            if (data.metrics) setMetricsForSession(sessionId, data.metrics);
            if (data.audio && onAudioReceived) {
                onAudioReceived(data.audio);
            }
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [sessionId, setMetricsForSession, addMessageToSession, onAudioReceived]);

    // Keep legacy HTTP method if needed, but primary is socket now
    const sendMessage = async (text: string) => {
        const userMessage: ChatMessage = {
            id: crypto.randomUUID().toString().substr(2, 9),
            role: 'user',
            content: text,
            timestamp: new Date().toISOString(),
        };
        addMessageToSession(sessionId, userMessage);

        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('chat_message', {
                sessionId,
                message: text,
                systemPrompt,
                agentType,
                flowData
            });
        } else {
            console.warn('Socket not connected. Message dropped (Legacy API removed).');
        }
    };

    const toggleCall = () => {
        setCallActiveForSession(sessionId, !isCallActive);
    };

    return { sendMessage, toggleCall };
};
