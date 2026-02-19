import { Session, CreateSessionDTO, SessionSummary, createSession, calculateSessionSummary } from '../models/Session.js';

class SessionManager {
    private sessions: Map<string, Session> = new Map();
    private maxConcurrentSessionsPerCampaign: number = 20;

    // Create a new session
    createSession(dto: CreateSessionDTO): Session {
        const activeCampaignSessions = this.getSessionsByCampaign(dto.campaignId)
            .filter(s => s.status === 'active' || s.status === 'idle');

        if (activeCampaignSessions.length >= this.maxConcurrentSessionsPerCampaign) {
            throw new Error(`Campaign ${dto.campaignId} has reached maximum concurrent sessions (${this.maxConcurrentSessionsPerCampaign})`);
        }

        const session = createSession(dto);
        this.sessions.set(session.sessionId, session);
        console.log(`Created session ${session.sessionId} for campaign ${dto.campaignId}`);
        return session;
    }

    // Get a session by ID
    getSession(sessionId: string): Session | undefined {
        return this.sessions.get(sessionId);
    }

    // Get all sessions
    getAllSessions(): Session[] {
        return Array.from(this.sessions.values());
    }

    // Get sessions by campaign ID
    getSessionsByCampaign(campaignId: string): Session[] {
        return Array.from(this.sessions.values())
            .filter(session => session.campaignId === campaignId);
    }

    // Get active sessions
    getActiveSessions(): Session[] {
        return Array.from(this.sessions.values())
            .filter(session => session.status === 'active');
    }

    // Update session status
    updateSessionStatus(sessionId: string, status: Session['status'], errorMessage?: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) {
            console.warn(`Session ${sessionId} not found`);
            return;
        }

        session.status = status;
        if (status === 'completed' || status === 'error') {
            session.endTime = new Date().toISOString();
        }
        if (errorMessage) {
            session.errorMessage = errorMessage;
        }

        console.log(`Updated session ${sessionId} status to ${status}`);
    }

    // Update session metrics
    updateSessionMetrics(sessionId: string, metrics: Partial<Session['metrics']>): void {
        const session = this.sessions.get(sessionId);
        if (!session) {
            console.warn(`Session ${sessionId} not found`);
            return;
        }

        session.metrics = { ...session.metrics, ...metrics };
    }

    // Add a message to the session
    addMessageToSession(sessionId: string, message: any): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.messages.push(message);
        }
    }

    // Terminate a session
    terminateSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) {
            console.warn(`Session ${sessionId} not found`);
            return;
        }

        this.updateSessionStatus(sessionId, 'completed');
        console.log(`Terminated session ${sessionId}`);
    }

    // Get session summary for a campaign
    getCampaignSummary(campaignId: string): SessionSummary | null {
        const sessions = this.getSessionsByCampaign(campaignId);
        if (sessions.length === 0) return null;
        return calculateSessionSummary(sessions);
    }

    // Get all campaign summaries
    getAllCampaignSummaries(): Map<string, SessionSummary> {
        const summaries = new Map<string, SessionSummary>();
        const campaignIds = new Set(Array.from(this.sessions.values()).map(s => s.campaignId));

        campaignIds.forEach(campaignId => {
            const summary = this.getCampaignSummary(campaignId);
            if (summary) {
                summaries.set(campaignId, summary);
            }
        });

        return summaries;
    }

    // Clean up old completed sessions (optional, for memory management)
    cleanupOldSessions(maxAge: number = 24 * 60 * 60 * 1000): number {
        const now = Date.now();
        let cleaned = 0;

        this.sessions.forEach((session, sessionId) => {
            if (session.status === 'completed' || session.status === 'error') {
                const sessionTime = new Date(session.startTime).getTime();
                if (now - sessionTime > maxAge) {
                    this.sessions.delete(sessionId);
                    cleaned++;
                }
            }
        });

        if (cleaned > 0) {
            console.log(`Cleaned up ${cleaned} old sessions`);
        }
        return cleaned;
    }

    // Set max concurrent sessions per campaign
    setMaxConcurrentSessions(max: number): void {
        this.maxConcurrentSessionsPerCampaign = max;
        console.log(`Max concurrent sessions per campaign set to ${max}`);
    }

    // Get statistics
    getStatistics() {
        const allSessions = this.getAllSessions();
        return {
            totalSessions: allSessions.length,
            activeSessions: allSessions.filter(s => s.status === 'active').length,
            idleSessions: allSessions.filter(s => s.status === 'idle').length,
            completedSessions: allSessions.filter(s => s.status === 'completed').length,
            errorSessions: allSessions.filter(s => s.status === 'error').length,
            totalCampaigns: new Set(allSessions.map(s => s.campaignId)).size
        };
    }
}

// Singleton instance
export const sessionManager = new SessionManager();
