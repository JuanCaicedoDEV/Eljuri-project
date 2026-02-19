import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { handleChat, handleChatStream, updateSystemPrompt } from './controllers/simulationController.js';
import sttRouter from './routes/stt.js';
import { createGeminiLiveAgent, GeminiLiveAgent } from './services/GeminiLiveAgent.js';

import { sessionManager } from './services/sessionManager.js';
import { phoneNumberManager } from './services/phoneNumberManager.js';

const app = express();
app.use(cors());
app.use(express.json());

// STT Route
app.use('/api/stt', sttRouter);

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

    // Create Gemini Live agent for this connection
    // Create Gemini Live agent wrapper (delayed initialization)
    let agent: GeminiLiveAgent | null = null;

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
                        systemInstruction: msg.systemInstruction
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

// Handle WebSocket upgrade for /voice/live path
httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);

    if (url.pathname === '/voice/live') {
        const sessionId = url.searchParams.get('sessionId');
        wss.handleUpgrade(request, socket, head, (ws) => {
            // Attach sessionId to ws object for later use
            if (sessionId) {
                // @ts-ignore
                ws.sessionId = sessionId;
            }
            wss.emit('connection', ws, request);
        });
    } else {
        // Let Socket.IO handle other upgrades
    }
});
