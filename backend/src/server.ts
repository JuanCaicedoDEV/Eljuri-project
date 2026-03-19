import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import rateLimit from 'express-rate-limit';
import sttRouter from './routes/stt.js';
import extractRouter from './routes/extraction.js';
import { createGeminiLiveAgent, GeminiLiveAgent } from './services/GeminiLiveAgent.js';
import { issueWsToken, verifyWsToken, requireApiKey } from './middleware/auth.js';

import { sessionManager } from './services/sessionManager.js';
import { phoneNumberManager } from './services/phoneNumberManager.js';
import { twilioCallService } from './services/TwilioCallService.js';

// ========== RATE LIMITERS ==========

const tokenIssueLimiter = rateLimit({
    windowMs: 60 * 1000,         // 1 minute
    max: 10,                      // max 10 token requests per IP per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many token requests, please try again later' }
});

// In-memory rate limiter for WebSocket upgrades (express-rate-limit doesn't cover upgrades)
const wsConnectAttempts = new Map<string, { count: number; resetAt: number }>();
const WS_MAX_ATTEMPTS = 10;
const WS_WINDOW_MS = 60 * 1000;

function isWsRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = wsConnectAttempts.get(ip);
    if (!entry || now > entry.resetAt) {
        wsConnectAttempts.set(ip, { count: 1, resetAt: now + WS_WINDOW_MS });
        return false;
    }
    entry.count++;
    return entry.count > WS_MAX_ATTEMPTS;
}

// Clean up stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of wsConnectAttempts) {
        if (now > entry.resetAt) wsConnectAttempts.delete(ip);
    }
}, 5 * 60 * 1000);

// Initialize Twilio (no-ops if credentials not set)
twilioCallService.init();

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'bypass-tunnel-reminder', 'x-custom-header']
}));
app.use(express.json());

// STT Route
app.use('/api/stt', sttRouter);

// Extraction Route
app.use('/api/extract', extractRouter);

// ========== AUTH ENDPOINT ==========

app.post('/api/auth/token', tokenIssueLimiter, requireApiKey, (req, res) => {
    try {
        const sessionId = req.body?.sessionId as string | undefined;
        const token = issueWsToken(sessionId);
        res.json({ token });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// ========== PHONE NUMBER ENDPOINTS ==========

app.get('/api/phone-numbers', (req, res) => {
    try {
        const phoneNumbers = phoneNumberManager.getAllPhoneNumbers();
        res.json(phoneNumbers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch phone numbers' });
    }
});

app.post('/api/phone-numbers', (req, res) => {
    try {
        const phoneNumber = phoneNumberManager.createPhoneNumber(req.body);
        res.status(201).json(phoneNumber);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/phone-numbers/:id', (req, res) => {
    try {
        const phoneNumber = phoneNumberManager.updatePhoneNumber(req.params.id, req.body);
        res.json(phoneNumber);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/phone-numbers/:id', (req, res) => {
    try {
        const success = phoneNumberManager.deletePhoneNumber(req.params.id);
        if (success) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Phone number not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete phone number' });
    }
});

app.get('/api/phone-numbers/campaign/:campaignId', (req, res) => {
    try {
        const phoneNumbers = phoneNumberManager.getPhoneNumbersByCampaign(req.params.campaignId);
        res.json(phoneNumbers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch phone numbers' });
    }
});

app.get('/api/phone-numbers/stats', (req, res) => {
    try {
        const stats = phoneNumberManager.getStatistics();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// ========== SESSION ENDPOINTS ==========

app.post('/api/sessions', (req, res) => {
    try {
        const session = sessionManager.createSession(req.body);
        // Broadcast new session to all clients
        io.emit('session_created', session);
        res.status(201).json(session);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/sessions', (req, res) => {
    try {
        const sessions = sessionManager.getAllSessions();
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

app.get('/api/sessions/active', (req, res) => {
    try {
        const sessions = sessionManager.getActiveSessions();
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch active sessions' });
    }
});

app.get('/api/sessions/campaign/:campaignId', (req, res) => {
    try {
        const sessions = sessionManager.getSessionsByCampaign(req.params.campaignId);
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

app.get('/api/sessions/campaign/:campaignId/summary', (req, res) => {
    try {
        const summary = sessionManager.getCampaignSummary(req.params.campaignId);
        if (summary) {
            res.json(summary);
        } else {
            res.status(404).json({ error: 'No sessions found for campaign' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch campaign summary' });
    }
});

app.get('/api/sessions/:sessionId', (req, res) => {
    try {
        const session = sessionManager.getSession(req.params.sessionId);
        if (session) {
            res.json(session);
        } else {
            res.status(404).json({ error: 'Session not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

app.post('/api/sessions/:sessionId/terminate', (req, res) => {
    try {
        sessionManager.terminateSession(req.params.sessionId);
        const session = sessionManager.getSession(req.params.sessionId);
        // Broadcast session termination
        io.emit('session_terminated', { sessionId: req.params.sessionId });
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: 'Failed to terminate session' });
    }
});

app.get('/api/sessions/stats', (req, res) => {
    try {
        const stats = sessionManager.getStatistics();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// ========== TWILIO REAL CALL ENDPOINTS ==========

/**
 * POST /twilio/twiml
 * Twilio hits this webhook when the callee answers the outbound call.
 * We return TwiML that instructs Twilio to open a Media Stream to our WS endpoint.
 */
app.post('/twilio/twiml', (req, res) => {
    const campaignId = (req.query.campaignId as string) || '';
    const sessionId  = (req.query.sessionId  as string) || '';

    const backendUrl = process.env.BACKEND_URL || `https://${req.headers.host}`;
    // Convert https:// → wss:// for the WebSocket URL
    const wsUrl = backendUrl.replace(/^https?:\/\//, (m) => (m.startsWith('https') ? 'wss://' : 'ws://'));

    const streamUrl = `${wsUrl}/twilio/stream?campaignId=${encodeURIComponent(campaignId)}&sessionId=${encodeURIComponent(sessionId)}`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${streamUrl}" />
  </Connect>
</Response>`;

    console.log(`[Twilio] TwiML webhook → stream: ${streamUrl}`);
    res.type('text/xml').send(twiml);
});

/**
 * POST /api/calls/outbound
 * Frontend triggers an outbound call. Body: { to, campaignId, sessionId, systemInstruction, voiceName }
 */
app.post('/api/calls/outbound', async (req, res) => {
    try {
        if (!twilioCallService.isEnabled()) {
            res.status(503).json({ error: 'Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER in .env' });
            return;
        }

        const { to, campaignId, sessionId, systemInstruction, voiceName } = req.body as {
            to: string;
            campaignId: string;
            sessionId?: string;
            systemInstruction?: string;
            voiceName?: string;
        };

        if (!to) {
            res.status(400).json({ error: 'Missing required field: to' });
            return;
        }

        const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3008}`;

        // Create a session to track this call
        const finalSessionId = sessionId || `call-${campaignId}-${Date.now()}`;
        try {
            sessionManager.createSession({ campaignId, phoneNumber: to, agentType: 'prompt', systemPrompt: systemInstruction });
        } catch (_) {
            // Session may already exist
        }

        const callSid = await twilioCallService.makeOutboundCall({
            to,
            campaignId,
            sessionId: finalSessionId,
            systemInstruction: systemInstruction || '',
            voiceName: voiceName || 'Kore',
            backendUrl,
        });

        io.emit('call_initiated', { callSid, sessionId: finalSessionId, to, campaignId });
        res.json({ callSid, sessionId: finalSessionId, status: 'dialing' });
    } catch (error: any) {
        console.error('[Twilio] Outbound call error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/calls/:callSid/end
 * Hang up a specific call.
 */
app.post('/api/calls/:callSid/end', async (req, res) => {
    try {
        await twilioCallService.endCall(req.params.callSid);
        res.json({ status: 'ended', callSid: req.params.callSid });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/calls
 * List currently active Twilio calls.
 */
app.get('/api/calls', (_req, res) => {
    const calls = twilioCallService.getActiveCalls().map(c => ({
        callSid: c.callSid,
        sessionId: c.sessionId,
        campaignId: c.campaignId,
        to: c.to,
        startedAt: c.startedAt,
        status: c.status,
    }));
    res.json(calls);
});

// Forward Twilio call events to Socket.IO clients
twilioCallService.on('callStarted', (call) => {
    io.emit('call_started', { callSid: call.callSid, sessionId: call.sessionId });
    sessionManager.updateSessionStatus(call.sessionId, 'active');
});

twilioCallService.on('callEnded', ({ callSid, sessionId }) => {
    io.emit('call_ended', { callSid, sessionId });
    try { sessionManager.terminateSession(sessionId); } catch (_) {}
});

twilioCallService.on('transcript', (data) => {
    io.emit('call_transcript', data);
});

// ========== LEGACY CHAT ENDPOINT ==========

// api/chat endpoint removed

// ========== WEBSOCKET EVENTS ==========

io.on('connection', (socket) => {
    console.log(`[Socket] New connection: ${socket.id}`);

    socket.on('join_session', (sessionId) => {
        console.log(`[Socket] Client ${socket.id} joining session: ${sessionId}`);
        socket.join(sessionId);

        // Update session status to active
        sessionManager.updateSessionStatus(sessionId, 'active');

        // Send current session state
        const session = sessionManager.getSession(sessionId);
        if (session) {
            socket.emit('session_state', session);

            // Auto-start flow logic removed. Use Voice Live mode.
        }
    });

    // chat_message removed for cost safety

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// ========== GEMINI LIVE VOICE WEBSOCKET ==========
// Raw audio streaming endpoint for real-time voice

const wss = new WebSocketServer({ noServer: true });
const liveAgents = new Map<WebSocket, GeminiLiveAgent>();

wss.on('connection', async (ws: WebSocket) => {
    console.log('[VoiceLive] New WebSocket connection');

    let agent: GeminiLiveAgent | null = null;
    let authenticated = false;

    // Close connection if not authenticated within 10 seconds
    const authTimeout = setTimeout(() => {
        if (!authenticated) {
            console.warn('[VoiceLive] Auth timeout — closing connection');
            ws.close(1008, 'Authentication timeout');
        }
    }, 10000);

    // Handle incoming audio from client
    ws.on('message', async (data: Buffer | string) => {
        // Safe message parsing logic for mixed binary/text handling
        let msg: any = null;
        let isJson = false;

        try {
            // Try to parse as JSON first (handles string or buffer)
            const strData = data.toString();
            if (strData.trim().startsWith('{')) {
                msg = JSON.parse(strData);
                isJson = true;
            }
        } catch (e) {
            // Not JSON
        }

        // AUTH HANDSHAKE: first message must be {type:'auth', token}
        if (!authenticated) {
            if (isJson && msg?.type === 'auth') {
                try {
                    verifyWsToken(msg.token);
                    authenticated = true;
                    clearTimeout(authTimeout);
                    ws.send(JSON.stringify({ type: 'auth_ok' }));
                    console.log('[VoiceLive] Client authenticated');
                } catch (e) {
                    console.warn('[VoiceLive] Invalid auth token:', (e as Error).message);
                    ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
                    ws.close(1008, 'Unauthorized');
                }
            } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
                ws.close(1008, 'Authentication required');
            }
            return;
        }

        // Handle JSON config/control messages
        if (isJson && msg) {
            try {
                // const msg = JSON.parse(data); // Already parsed above

                // INITIALIZATION: Receive config from client
                if (msg.type === 'config') {
                    console.log(`[VoiceLive] Configuring session: Voice=${msg.voiceName}`);

                    if (agent) {
                        // Reconfiguration? For now just log
                        console.warn('[VoiceLive] Agent already initialized');
                        return;
                    }

                    agent = createGeminiLiveAgent({
                        voiceName: msg.voiceName || 'Kore',
                        systemInstruction: msg.systemInstruction,
                        maxOutputTokens: msg.maxOutputTokens,
                        maxBudgetUSD: process.env.MAX_BUDGET_USD ? parseFloat(process.env.MAX_BUDGET_USD) : 0.50
                    });

                    liveAgents.set(ws, agent);

                    // Setup listeners
                    agent.on('audio', (audioData: Buffer) => {
                        if (ws.readyState === WebSocket.OPEN) ws.send(audioData);
                    });

                    agent.on('transcript', (text: string) => {
                        console.log('[VoiceLive] Agent:', text);
                        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'transcript', text }));
                    });

                    agent.on('userTranscript', (text: string) => {
                        console.log('[VoiceLive] User:', text);
                        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'userTranscript', text }));
                    });

                    agent.on('error', (error: Error) => {
                        console.error('[VoiceLive] Agent error:', error);
                        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', message: error.message }));
                    });

                    agent.on('turnComplete', () => {
                        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'turnComplete' }));
                    });

                    agent.on('usage', (stats: any) => {
                        console.log(`[VoiceLive] Cost update: $${stats.cost.toFixed(6)}`);
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'usage', stats }));
                        }
                    });

                    agent.on('budgetExceeded', (info: any) => {
                        console.warn(`[VoiceLive] Budget exceeded: $${info.spent.toFixed(6)} / $${info.limit}`);
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'budgetExceeded', spent: info.spent, limit: info.limit }));
                        }
                    });

                    // Connect
                    try {
                        await agent.connect();
                        ws.send(JSON.stringify({ type: 'connected', voice: msg.voiceName }));
                    } catch (error) {
                        console.error('[VoiceLive] Failed to connect:', error);
                        ws.send(JSON.stringify({ type: 'error', message: `Failed to connect to Gemini: ${(error as Error).message}` }));
                    }
                    return;
                }

                if (!agent) {
                    console.warn('[VoiceLive] Received message before config');
                    return;
                }

                if (msg.type === 'text') {
                    await agent.sendText(msg.text);
                } else if (msg.type === 'interrupt') {
                    await agent.interrupt();
                }

            } catch (e) {
                // Not JSON, treat as text if agent connected?
                if (agent) await agent.sendText(data.toString());
            }
        } else {
            // Binary audio data
            if (agent) {
                await agent.sendAudio(Buffer.from(data));
            }
        }
    });

    // Cleanup on disconnect
    ws.on('close', async () => {
        clearTimeout(authTimeout);
        console.log('[VoiceLive] Client disconnected');
        const agent = liveAgents.get(ws);
        if (agent) {
            await agent.disconnect();
            liveAgents.delete(ws);
        }

        // Auto-terminate session if sessionId is present
        // @ts-ignore
        if (ws.sessionId) {
            // @ts-ignore
            console.log(`[VoiceLive] Auto-terminating session ${ws.sessionId}`);
            // @ts-ignore
            sessionManager.terminateSession(ws.sessionId);
            // @ts-ignore
            io.emit('session_terminated', { sessionId: ws.sessionId });
        }
    });
});

const PORT = process.env.PORT || 3008;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Session Manager and Phone Number Manager initialized');
    if (process.env.GOOGLE_API_KEY) {
        console.log('GOOGLE_API_KEY is found (starting with ' + process.env.GOOGLE_API_KEY.substring(0, 5) + '...)');
    } else {
        console.error('CRITICAL: GOOGLE_API_KEY is missing!');
    }
});

// ─── Twilio Media Streams WebSocket server ───────────────────────────────────
const twilioWss = new WebSocketServer({ noServer: true });

twilioWss.on('connection', async (ws, request) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const campaignId       = url.searchParams.get('campaignId') || '';
    const sessionId        = url.searchParams.get('sessionId')  || '';
    const systemInstruction= url.searchParams.get('systemInstruction') || '';
    const voiceName        = url.searchParams.get('voiceName')  || 'Kore';

    await twilioCallService.handleMediaStream(ws, campaignId, sessionId, systemInstruction, voiceName);
});

// Handle WebSocket upgrade for /voice/live and /twilio/stream paths
httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);

    if (url.pathname === '/voice/live') {
        // IP-based rate limiting for WS upgrades
        const ip = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            || request.socket.remoteAddress
            || 'unknown';

        if (isWsRateLimited(ip)) {
            console.warn(`[VoiceLive] Rate limit exceeded for IP: ${ip}`);
            socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
            socket.destroy();
            return;
        }

        const sessionId = url.searchParams.get('sessionId');
        wss.handleUpgrade(request, socket, head, (ws) => {
            if (sessionId) {
                // @ts-ignore
                ws.sessionId = sessionId;
            }
            wss.emit('connection', ws, request);
        });
    } else if (url.pathname === '/twilio/stream') {
        // Twilio Media Streams — no auth needed (Twilio signs requests)
        twilioWss.handleUpgrade(request, socket, head, (ws) => {
            twilioWss.emit('connection', ws, request);
        });
    } else {
        // Let Socket.IO handle other upgrades
    }
});
