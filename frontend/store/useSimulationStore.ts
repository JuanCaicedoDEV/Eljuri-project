import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

// Re-export existing types
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
    messageCount?: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface FlowData {
    nodes: Node[];
    edges: Edge[];
}

// New: Individual session state
export interface SessionState {
    sessionId: string;
    campaignId: string;
    phoneNumber: string | null;
    status: 'active' | 'idle' | 'completed' | 'error';
    messages: ChatMessage[];
    metrics: SessionMetrics;
    isCallActive: boolean;
    agentType: 'prompt' | 'flow';
    systemPrompt: string;
    flowData: FlowData;
    activeNodeId: string | null;
    variables: Record<string, string>;
    startTime: string;
    endTime: string | null;
}

interface MultiSessionState {
    // Multi-session management
    sessions: Map<string, SessionState>;

    // Global configuration (for creating new sessions)
    defaultAgentType: 'prompt' | 'flow';
    defaultSystemPrompt: string;
    defaultFlowData: FlowData;
    expectedOutput: string;

    // Session actions
    createSession: (campaignId: string, phoneNumber?: string) => SessionState;
    getSession: (sessionId: string) => SessionState | undefined;
    removeSession: (sessionId: string) => void;
    getAllSessions: () => SessionState[];
    getSessionsByCampaign: (campaignId: string) => SessionState[];

    // Session-scoped actions
    addMessageToSession: (sessionId: string, message: ChatMessage) => void;
    setMetricsForSession: (sessionId: string, metrics: SessionMetrics) => void;
    setCallActiveForSession: (sessionId: string, active: boolean) => void;
    updateSessionStatus: (sessionId: string, status: SessionState['status']) => void;
    setActiveNodeForSession: (sessionId: string, nodeId: string | null) => void;
    setVariableForSession: (sessionId: string, key: string, value: string) => void;

    // Global configuration actions
    setDefaultAgentType: (type: 'prompt' | 'flow') => void;
    setDefaultSystemPrompt: (prompt: string) => void;
    setDefaultFlowData: (data: FlowData) => void;
    setExpectedOutput: (output: string) => void;

    // Legacy compatibility (operates on "current" session if only one exists)
    messages: ChatMessage[];
    metrics: SessionMetrics;
    isCallActive: boolean;
    agentType: 'prompt' | 'flow';
    systemPrompt: string;
    flowData: FlowData;
    activeNodeId: string | null;
    variables: Record<string, string>;

    setMetrics: (metrics: SessionMetrics) => void;
    addMessage: (message: ChatMessage) => void;
    setCallActive: (active: boolean) => void;
    setAgentType: (type: 'prompt' | 'flow') => void;
    setSystemPrompt: (prompt: string) => void;
    setFlowData: (data: FlowData) => void;
    setActiveNode: (nodeId: string | null) => void;
    setVariable: (key: string, value: string) => void;
    resetSimulation: () => void;
    clearFlowData: () => void;
}

const defaultMetrics: SessionMetrics = {
    duration: 0,
    totalCost: 0,
    tokenUsage: { input: 0, output: 0, total: 0 },
    currentCPM: 0,
    profitabilityStatus: 'PROFITABLE',
    messageCount: 0
};

export const useSimulationStore = create<MultiSessionState>((set, get) => ({
    // Multi-session state
    sessions: new Map(),

    // Global defaults
    defaultAgentType: 'prompt',
    defaultSystemPrompt: 'You are a helpful AI assistant for ELjuri brand.',
    defaultFlowData: { nodes: [], edges: [] },
    expectedOutput: 'The agent should greet the user and ask for their name.',

    // Session management
    createSession: (campaignId: string, phoneNumber?: string) => {
        const sessionId = `session-${campaignId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newSession: SessionState = {
            sessionId,
            campaignId,
            phoneNumber: phoneNumber || null,
            status: 'idle',
            messages: [],
            metrics: { ...defaultMetrics },
            isCallActive: false,
            agentType: get().defaultAgentType,
            systemPrompt: get().defaultSystemPrompt,
            flowData: get().defaultFlowData,
            activeNodeId: null,
            variables: {},
            startTime: new Date().toISOString(),
            endTime: null
        };

        set(state => {
            const newSessions = new Map(state.sessions);
            newSessions.set(sessionId, newSession);
            return { sessions: newSessions };
        });

        return newSession;
    },

    getSession: (sessionId: string) => {
        return get().sessions.get(sessionId);
    },

    removeSession: (sessionId: string) => {
        set(state => {
            const newSessions = new Map(state.sessions);
            newSessions.delete(sessionId);
            return { sessions: newSessions };
        });
    },

    getAllSessions: () => {
        return Array.from(get().sessions.values());
    },

    getSessionsByCampaign: (campaignId: string) => {
        return Array.from(get().sessions.values())
            .filter(session => session.campaignId === campaignId);
    },

    // Session-scoped actions
    addMessageToSession: (sessionId: string, message: ChatMessage) => {
        set(state => {
            const newSessions = new Map(state.sessions);
            const session = newSessions.get(sessionId);
            if (session) {
                session.messages = [...session.messages, message];
                newSessions.set(sessionId, session);
            }
            return { sessions: newSessions };
        });
    },

    setMetricsForSession: (sessionId: string, metrics: SessionMetrics) => {
        set(state => {
            const newSessions = new Map(state.sessions);
            const session = newSessions.get(sessionId);
            if (session) {
                session.metrics = metrics;
                newSessions.set(sessionId, session);
            }
            return { sessions: newSessions };
        });
    },

    setCallActiveForSession: (sessionId: string, active: boolean) => {
        set(state => {
            const newSessions = new Map(state.sessions);
            const session = newSessions.get(sessionId);
            if (session) {
                session.isCallActive = active;
                session.status = active ? 'active' : 'idle';
                newSessions.set(sessionId, session);
            }
            return { sessions: newSessions };
        });
    },

    updateSessionStatus: (sessionId: string, status: SessionState['status']) => {
        set(state => {
            const newSessions = new Map(state.sessions);
            const session = newSessions.get(sessionId);
            if (session) {
                session.status = status;
                if (status === 'completed' || status === 'error') {
                    session.endTime = new Date().toISOString();
                }
                newSessions.set(sessionId, session);
            }
            return { sessions: newSessions };
        });
    },

    setActiveNodeForSession: (sessionId: string, nodeId: string | null) => {
        set(state => {
            const newSessions = new Map(state.sessions);
            const session = newSessions.get(sessionId);
            if (session) {
                session.activeNodeId = nodeId;
                newSessions.set(sessionId, session);
            }
            return { sessions: newSessions };
        });
    },

    setVariableForSession: (sessionId: string, key: string, value: string) => {
        set(state => {
            const newSessions = new Map(state.sessions);
            const session = newSessions.get(sessionId);
            if (session) {
                session.variables = { ...session.variables, [key]: value };
                newSessions.set(sessionId, session);
            }
            return { sessions: newSessions };
        });
    },

    // Global configuration actions
    setDefaultAgentType: (type) => set({ defaultAgentType: type }),
    setDefaultSystemPrompt: (prompt) => set({ defaultSystemPrompt: prompt }),
    setDefaultFlowData: (data) => set({ defaultFlowData: data }),
    setExpectedOutput: (output) => set({ expectedOutput: output }),

    // Legacy compatibility - operates on first session or creates one
    get messages() {
        const sessions = get().getAllSessions();
        return sessions[0]?.messages || [];
    },

    get metrics() {
        const sessions = get().getAllSessions();
        return sessions[0]?.metrics || defaultMetrics;
    },

    get isCallActive() {
        const sessions = get().getAllSessions();
        return sessions[0]?.isCallActive || false;
    },

    get agentType() {
        return get().defaultAgentType;
    },

    get systemPrompt() {
        return get().defaultSystemPrompt;
    },

    get flowData() {
        return get().defaultFlowData;
    },

    get activeNodeId() {
        const sessions = get().getAllSessions();
        return sessions[0]?.activeNodeId || null;
    },

    get variables() {
        const sessions = get().getAllSessions();
        return sessions[0]?.variables || {};
    },

    setMetrics: (metrics) => {
        const sessions = get().getAllSessions();
        if (sessions[0]) {
            get().setMetricsForSession(sessions[0].sessionId, metrics);
        }
    },

    addMessage: (message) => {
        const sessions = get().getAllSessions();
        if (sessions[0]) {
            get().addMessageToSession(sessions[0].sessionId, message);
        }
    },

    setCallActive: (active) => {
        const sessions = get().getAllSessions();
        if (sessions[0]) {
            get().setCallActiveForSession(sessions[0].sessionId, active);
        }
    },

    setAgentType: (type) => set({ defaultAgentType: type }),
    setSystemPrompt: (prompt) => set({ defaultSystemPrompt: prompt }),
    setFlowData: (data) => set({ defaultFlowData: data }),

    setActiveNode: (nodeId) => {
        const sessions = get().getAllSessions();
        if (sessions[0]) {
            get().setActiveNodeForSession(sessions[0].sessionId, nodeId);
        }
    },

    setVariable: (key, value) => {
        const sessions = get().getAllSessions();
        if (sessions[0]) {
            get().setVariableForSession(sessions[0].sessionId, key, value);
        }
    },

    resetSimulation: () => {
        const sessions = get().getAllSessions();
        if (sessions[0]) {
            get().removeSession(sessions[0].sessionId);
        }
    },

    clearFlowData: () => {
        set({
            defaultFlowData: { nodes: [], edges: [] },
            defaultSystemPrompt: '',
        });
    }
}));
