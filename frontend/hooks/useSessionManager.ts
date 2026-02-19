import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSimulationStore, SessionState } from '../store/useSimulationStore';

const getApiBase = () => {
    if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.hostname}:3008/api`;
    }
    return 'http://localhost:3008/api';
};

const API_BASE = getApiBase();

export const useSessionManager = () => {
    const socketRef = useRef<Socket | null>(null);
    const { createSession, updateSessionStatus, setMetricsForSession, addMessageToSession } = useSimulationStore();

    useEffect(() => {
        // Connect to WebSocket for real-time session updates
        const socketHost = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3008` : 'http://localhost:3008';
        socketRef.current = io(socketHost);

        socketRef.current.on('connect', () => {
            console.log('Session manager connected to server');
        });

        socketRef.current.on('session_created', (session: SessionState) => {
            console.log('New session created:', session);
        });

        socketRef.current.on('session_updated', (session: SessionState) => {
            console.log('Session updated:', session);
        });

        socketRef.current.on('session_terminated', ({ sessionId }: { sessionId: string }) => {
            console.log('Session terminated:', sessionId);
            updateSessionStatus(sessionId, 'completed');
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [updateSessionStatus]);

    // Create a new session
    const startSession = async (campaignId: string, phoneNumber?: string): Promise<SessionState> => {
        const { systemPrompt, agentType, flowData } = useSimulationStore.getState();

        try {
            const response = await fetch(`${API_BASE}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignId,
                    phoneNumber,
                    agentType,
                    systemPrompt,
                    flowData
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create session');
            }

            const backendSession = await response.json();

            // Add to local store using the backend's session ID
            const localSession = createSession(campaignId, phoneNumber);
            localSession.sessionId = backendSession.sessionId;
            localSession.agentType = agentType;
            localSession.flowData = flowData;
            localSession.systemPrompt = systemPrompt;

            return localSession;
        } catch (error) {
            console.error('Failed to start session:', error);
            throw error;
        }
    };

    // Terminate a session
    const terminateSession = async (sessionId: string): Promise<void> => {
        try {
            const response = await fetch(`${API_BASE}/sessions/${sessionId}/terminate`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to terminate session');
            }

            updateSessionStatus(sessionId, 'completed');
        } catch (error) {
            console.error('Failed to terminate session:', error);
            throw error;
        }
    };

    // Get all sessions from backend
    const fetchAllSessions = async (): Promise<any[]> => {
        try {
            const response = await fetch(`${API_BASE}/sessions`);
            if (!response.ok) {
                throw new Error('Failed to fetch sessions');
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
            return [];
        }
    };

    // Get sessions for a specific campaign
    const fetchCampaignSessions = async (campaignId: string): Promise<any[]> => {
        try {
            const response = await fetch(`${API_BASE}/sessions/campaign/${campaignId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch campaign sessions');
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch campaign sessions:', error);
            return [];
        }
    };

    // Get campaign summary
    const fetchCampaignSummary = async (campaignId: string): Promise<any | null> => {
        try {
            const response = await fetch(`${API_BASE}/sessions/campaign/${campaignId}/summary`);
            if (!response.ok) {
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch campaign summary:', error);
            return null;
        }
    };

    return {
        startSession,
        terminateSession,
        fetchAllSessions,
        fetchCampaignSessions,
        fetchCampaignSummary
    };
};
