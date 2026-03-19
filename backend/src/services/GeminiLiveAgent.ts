/**
 * GeminiLiveAgent - Bidirectional Audio Streaming with Gemini 2.5 Live API
 * 
 * This service handles real-time voice conversations using Gemini's
 * multimodal capabilities for direct audio-to-audio processing via WebSocket.
 * Refactored to use native 'ws' manually to access the Preview model.
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';

// Audio format configuration for Gemini Live API
const AUDIO_CONFIG = {
    sampleRate: 24000,      // 24kHz required by Gemini
    channels: 1,            // Mono
    bitsPerSample: 16,      // PCM16
    mimeType: 'audio/pcm;rate=24000'   // Raw PCM with rate
};

interface GeminiLiveConfig {
    projectId: string;
    apiKey?: string;
    voiceName?: string;
    systemInstruction?: string;
    maxOutputTokens?: number;  // per-response token cap (default: 150 ≈ 2-3 sentences)
    maxBudgetUSD?: number;      // session cost ceiling in USD (default: no limit)
}

export class GeminiLiveAgent extends EventEmitter {
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;
    private audioBuffer: { mimeType: string, data: string }[] = [];
    private config: GeminiLiveConfig;
    private accumulatedCostUSD: number = 0;  // running total for this session

    // MODEL: Gemini 2.5 Flash Native Audio Preview
    private model: string = 'models/gemini-2.5-flash-native-audio-preview-12-2025';
    private host: string = 'generativelanguage.googleapis.com';

    constructor(config: GeminiLiveConfig) {
        super();
        this.config = config;
    }

    /**
     * Connect to Gemini Live API and start a session
     */
    async connect(): Promise<void> {
        if (this.isConnected) {
            console.log('[GeminiLive] Already connected');
            return;
        }

        const apiKey = this.config.apiKey || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GOOGLE_API_KEY');
        }

        // Use v1alpha as per preview documentation
        const url = `wss://${this.host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

        console.log(`[GeminiLive] Connecting to ${url.replace(apiKey, 'HIDDEN')}...`);
        console.log(`[GeminiLive] Using Model: ${this.model}`);

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(url);

            this.ws.on('open', () => {
                console.log('=================================================');
                console.log('[GeminiLive] ✓ CONNECTED SUCCESSFULLY (WebSocket)');
                console.log('=================================================');
                this.isConnected = true;
                this.emit('connected');

                // Send Setup Message
                this.sendSetupMessage();

                // Flush buffer
                this.flushAudioBuffer();

                resolve();
            });

            this.ws.on('message', (data: Buffer) => {
                this.handleGeminiMessage(data);
            });

            this.ws.on('error', (error: Error) => {
                console.error('=================================================');
                console.error('[GeminiLive] !!! STREAM ERROR !!!', error);
                console.error('=================================================');
                this.emit('error', error);
                if (!this.isConnected) reject(error);
            });

            this.ws.on('close', (code: number, reason: Buffer) => {
                console.log('=================================================');
                console.log(`[GeminiLive] !!! STREAM CLOSED BY SERVER !!! Code: ${code}, Reason: ${reason.toString()}`);
                console.log('=================================================');
                this.isConnected = false;
                this.emit('disconnected');
            });
        });
    }

    /**
     * Send Setup Message to initialize the session
     */
    private sendSetupMessage() {
        if (!this.ws) return;

        const setupMessage = {
            setup: {
                model: this.model,
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: this.config.voiceName || 'Kore'
                            }
                        }
                    }
                    // Note: maxOutputTokens is NOT set here — it can cut responses mid-sentence.
                    // Brevity is controlled via system prompt instead.
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: (() => {
                    const BREVITY_RULES = `REGLA MÁS IMPORTANTE — SIN EXCEPCIONES:
Sé EXTREMADAMENTE conciso y directo. Máximo 1 oración corta por respuesta.
Evita a toda costa dar discursos largos porque el formato de audio se satura.
Ve directo al grano, sin rodeos, sin listas y sin repetir lo que dijo el usuario.
El silencio vale más que el relleno. 

---
`;
                    const base = this.config.systemInstruction || 'You are a helpful voice assistant.';
                    return { parts: [{ text: BREVITY_RULES + base }] };
                })()
            }
        };

        console.log('[GeminiLive] Sending setup message...');
        this.ws.send(JSON.stringify(setupMessage));
    }

    /**
     * Handle incoming messages from Gemini Live API
     */
    private handleGeminiMessage(data: Buffer): void {
        try {
            const message = JSON.parse(data.toString());

            // Handle server content (agent turns)
            if (message.serverContent) {
                const { modelTurn, turnComplete, interrupted, outputTranscription } = message.serverContent;

                if (modelTurn?.parts) {
                    for (const part of modelTurn.parts) {
                        // Audio chunk
                        if (part.inlineData?.data) {
                            const audioBuffer = Buffer.from(part.inlineData.data, 'base64');
                            this.emit('audio', audioBuffer);
                        }
                        // Text transcript of agent response
                        if (part.text) {
                            console.log('[GeminiLive] Agent transcript:', part.text);
                            this.emit('transcript', part.text);
                        }
                    }
                }

                // Output (agent) audio transcription
                if (outputTranscription?.text) {
                    console.log('[GeminiLive] Agent (transcribed):', outputTranscription.text);
                    this.emit('transcript', outputTranscription.text);
                }

                if (turnComplete) {
                    this.emit('turnComplete');
                }

                if (interrupted) {
                    console.log('[GeminiLive] Agent interrupted by user');
                    this.emit('interrupted');
                }
            }

            // Handle user speech transcription (inputAudioTranscription)
            if (message.inputTranscription?.text) {
                const userText = message.inputTranscription.text;
                console.log('[GeminiLive] User (transcribed):', userText);
                this.emit('userTranscript', userText);
            }

            // Check for Usage Metadata (often at root or inside serverContent depending on version)
            // Note: In v1alpha/beta Bidi, it might be in serverContent?
            // Actually usually it is not sent in Bidi yet? 
            // Let's check typical location: message.serverContent?.turnComplete?.usageMetadata?
            // Or message.usageMetadata?

            const usage = message.usageMetadata || message.serverContent?.turnComplete?.usageMetadata;

            if (usage) {
                const inTokens = usage.promptTokenCount || 0;
                const outTokens = usage.candidatesTokenCount || 0;
                const totalTokens = usage.totalTokenCount || (inTokens + outTokens);

                const inputCost = (inTokens / 1_000_000) * 3.00;
                const outputCost = (outTokens / 1_000_000) * 12.00;
                const totalCost = inputCost + outputCost;

                this.accumulatedCostUSD += totalCost;

                console.log(`[GeminiLive] Usage: ${inTokens} in / ${outTokens} out. Turn cost: $${totalCost.toFixed(6)} | Session total: $${this.accumulatedCostUSD.toFixed(6)}`);

                this.emit('usage', {
                    inTokens,
                    outTokens,
                    totalTokens,
                    cost: this.accumulatedCostUSD,   // emit cumulative cost
                    turnCost: totalCost,
                    model: this.model
                });

                // ─── Session budget ceiling ───────────────────────────────────
                const limit = this.config.maxBudgetUSD;
                if (limit !== undefined && this.accumulatedCostUSD >= limit) {
                    console.warn(`[GeminiLive] 💸 Budget limit $${limit} reached ($${this.accumulatedCostUSD.toFixed(6)}). Terminating session.`);
                    this.emit('budgetExceeded', { spent: this.accumulatedCostUSD, limit });
                    this.disconnect();
                }
            }

        } catch (error) {
            console.error('[GeminiLive] Error parsing message:', error);
        }
    }

    /**
     * Send audio chunk to Gemini
     */
    async sendAudio(audioData: Buffer): Promise<void> {
        const audioPart = {
            mimeType: AUDIO_CONFIG.mimeType,
            data: audioData.toString('base64')
        };

        if (!this.ws || !this.isConnected) {
            this.audioBuffer.push(audioPart);
            return;
        }

        try {
            const msg = {
                realtimeInput: {
                    mediaChunks: [audioPart]
                }
            };
            this.ws.send(JSON.stringify(msg));
        } catch (error) {
            console.error('[GeminiLive] Error sending audio:', error);
            this.emit('error', error);
        }
    }

    private flushAudioBuffer() {
        if (this.audioBuffer.length > 0) {
            console.log(`[GeminiLive] Flushing ${this.audioBuffer.length} buffered audio chunks`);
            for (const chunk of this.audioBuffer) {
                const msg = {
                    realtimeInput: {
                        mediaChunks: [chunk]
                    }
                };
                this.ws?.send(JSON.stringify(msg));
            }
            this.audioBuffer = [];
        }
    }

    /**
     * Send text message to Gemini (for testing/debug or interaction)
     */
    async sendText(text: string): Promise<void> {
        if (!this.ws || !this.isConnected) {
            console.warn('[GeminiLive] Cannot send text - not connected');
            return;
        }

        try {
            const msg = {
                clientContent: {
                    turns: [{
                        role: 'user',
                        parts: [{ text }]
                    }],
                    turnComplete: true
                }
            };
            this.ws.send(JSON.stringify(msg));
        } catch (error) {
            console.error('[GeminiLive] Error sending text:', error);
            this.emit('error', error);
        }
    }

    /**
     * Interrupt current response (barge-in)
     */
    async interrupt(): Promise<void> {
        if (!this.ws || !this.isConnected) return;

        try {
            // Send empty audio chunk to signal new input, which triggers interruption on server
            const msg = {
                realtimeInput: {
                    mediaChunks: [{
                        mimeType: AUDIO_CONFIG.mimeType,
                        data: ''
                    }]
                }
            };
            this.ws.send(JSON.stringify(msg));
            console.log('[GeminiLive] Interrupted (Client Side)');
        } catch (error) {
            console.error('[GeminiLive] Error interrupting:', error);
        }
    }

    /**
     * Disconnect from Gemini Live API
     */
    async disconnect(): Promise<void> {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        console.log('[GeminiLive] Disconnected');
        this.emit('disconnected');
    }

    /**
     * Get connection status
     */
    getStatus(): { connected: boolean } {
        return { connected: this.isConnected };
    }
}

// Export singleton factory
export function createGeminiLiveAgent(config?: Partial<GeminiLiveConfig>): GeminiLiveAgent {
    return new GeminiLiveAgent({
        projectId: process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0867059312',
        apiKey: process.env.GOOGLE_API_KEY,
        voiceName: config?.voiceName || 'Kore',
        systemInstruction: config?.systemInstruction
    });
}
