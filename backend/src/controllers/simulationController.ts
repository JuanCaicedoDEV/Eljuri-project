import { sessionManager } from '../services/sessionManager.js';

export const updateSystemPrompt = (sessionId: string, prompt: string) => {
    const session = sessionManager.getSession(sessionId);
    if (session) {
        session.systemPrompt = prompt;
    }
};

// Deprecated: These handlers have been removed to prevent costs.
// Use GeminiLiveAgent for all voice/chat interactions.
export const handleChatStream = async (
    sessionId: string,
    userText: string,
    onAudioChunk: (audio: string, text: string) => void,
    onComplete: (fullText: string, metrics: any) => void
) => {
    console.warn('[Stream] Legacy handler called but disabled.');
    onComplete("Legacy text chat is disabled. Please use Live mode.", {});
};

export const handleChat = async (
    sessionId: string,
    userText: string,
    agentType?: 'prompt' | 'flow',
    flowData?: any
) => {
    console.warn('[Chat] Legacy handler called but disabled.');
    return {
        assistantMessage: {
            id: 'system',
            role: 'assistant',
            content: 'Legacy text chat is disabled. Please use Live mode.',
            timestamp: new Date().toISOString()
        },
        metrics: {
            duration: 0,
            totalCost: 0,
            tokenUsage: { input: 0, output: 0, total: 0 },
            currentCPM: 0,
            profitabilityStatus: 'PROFITABLE'
        },
        audio: null
    };
};
