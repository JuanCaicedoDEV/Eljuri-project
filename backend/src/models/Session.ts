import { ChatMessage } from '../types/index.js';

export interface SessionMetrics {
    duration: number;
    totalCost: number;
    tokenUsage: {
        input: number;
        output: number;
        total: number;
    };
    currentCPM: number;
    profitabilityStatus: 'PROFITABLE' | 'CRITICAL';
    messageCount: number;
}

export interface Session {
    sessionId: string;
    campaignId: string;
    phoneNumber: string | null;
    status: 'active' | 'idle' | 'completed' | 'error';
    startTime: string;
    endTime: string | null;
    metrics: SessionMetrics;
    messages: ChatMessage[];
    agentType: 'prompt' | 'flow';
    systemPrompt?: string;
    flowData?: any;
    currentNodeId?: string;
    errorMessage?: string;
}

export interface CreateSessionDTO {
    sessionId?: string;
    campaignId: string;
    phoneNumber?: string;
    agentType: 'prompt' | 'flow';
    systemPrompt?: string;
    flowData?: any;
    currentNodeId?: string;
}

export interface SessionSummary {
    campaignId: string;
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    errorSessions: number;
    totalCost: number;
    averageDuration: number;
}

// Helper function to create a new session
export function createSession(dto: CreateSessionDTO): Session {
    return {
        sessionId: dto.sessionId || `session-${Date.now()}-${crypto.randomUUID().toString().substr(2, 9)}`,
        campaignId: dto.campaignId,
        phoneNumber: dto.phoneNumber || null,
        status: 'idle',
        startTime: new Date().toISOString(),
        endTime: null,
        metrics: {
            duration: 0,
            totalCost: 0,
            tokenUsage: { input: 0, output: 0, total: 0 },
            currentCPM: 0,
            profitabilityStatus: 'PROFITABLE',
            messageCount: 0
        },
        messages: [],
        agentType: dto.agentType,
        systemPrompt: dto.systemPrompt,
        flowData: dto.flowData,
        currentNodeId: dto.currentNodeId
    };
}

// Helper function to calculate session summary for a campaign
export function calculateSessionSummary(sessions: Session[]): SessionSummary {
    const campaignId = sessions[0]?.campaignId || '';
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const errorSessions = sessions.filter(s => s.status === 'error').length;

    const totalCost = sessions.reduce((sum, s) => sum + s.metrics.totalCost, 0);
    const totalDuration = sessions.reduce((sum, s) => sum + s.metrics.duration, 0);
    const averageDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;

    return {
        campaignId,
        totalSessions: sessions.length,
        activeSessions,
        completedSessions,
        errorSessions,
        totalCost,
        averageDuration
    };
}
