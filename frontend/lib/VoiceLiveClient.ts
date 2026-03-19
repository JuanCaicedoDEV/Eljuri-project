/**
 * VoiceLiveClient - WebSocket client for Gemini Live API
 * 
 * Handles real-time audio streaming between browser and backend.
 */

export interface VoiceLiveConfig {
    serverUrl?: string;
    voiceName?: string;
    systemInstruction?: string;
    language?: 'es' | 'en';
    accent?: string;
    sessionId?: string;
    // Cost controls
    maxOutputTokens?: number;      // per-response token limit sent to Gemini (default: 150)
    maxBudgetUSD?: number;         // session cost ceiling in USD (e.g. 0.05)
    maxAgentSpeakSeconds?: number; // client-side audio timeout: interrupt after N seconds of continuous speech
}

export class VoiceLiveClient {
    private serverUrl: string;
    private voiceName: string;
    private systemInstruction?: string;
    private language: 'es' | 'en';
    private accent: string;
    private maxOutputTokens: number;
    private maxBudgetUSD?: number;
    private websocket: WebSocket | null = null;
    private audioContext: AudioContext | null = null;
    private audioStream: MediaStream | null = null;
    private audioWorklet: AudioWorkletNode | null = null;
    private isConnected: boolean = false;
    private destroyed: boolean = false;  // set on disconnect() to abort in-flight connect()
    private audioQueue: AudioBuffer[] = [];
    private isPlaying: boolean = false;
    private nextPlayTime: number = 0;

    // Callbacks
    public onConnected: ((voice: string) => void) | null = null;
    public onDisconnected: (() => void) | null = null;
    public onAudio: ((audioData: ArrayBuffer) => void) | null = null;
    public onTranscript: ((text: string) => void) | null = null;
    public onUserTranscript: ((text: string) => void) | null = null;
    public onError: ((error: string) => void) | null = null;
    public onTurnComplete: (() => void) | null = null;
    public onUsage: ((stats: { inTokens: number, outTokens: number, cost: number, model: string }) => void) | null = null;
    public onBudgetExceeded: ((info: { spent: number; limit: number }) => void) | null = null;

    constructor(config: VoiceLiveConfig = {}) {
        const defaultHost = typeof window !== 'undefined'
            ? `${window.location.hostname}:3008`
            : 'localhost:3008';
        this.serverUrl = config.serverUrl || `ws://${defaultHost}/voice/live`;

        if (config.sessionId) {
            this.serverUrl += `?sessionId=${encodeURIComponent(config.sessionId)}`;
        }


        this.voiceName = config.voiceName || 'Kore';
        this.language = config.language || 'es';
        this.accent = config.accent || 'ecuadorian';
        this.maxOutputTokens = config.maxOutputTokens ?? 150;
        this.maxBudgetUSD = config.maxBudgetUSD;

        // Generate system instruction if not explicitly provided
        this.systemInstruction = config.systemInstruction || this.generateSystemInstruction();
    }

    private generateSystemInstruction(): string {
        const base = this.language === 'es'
            ? "Eres un asistente de voz conversacional para ELjuri."
            : "You are a conversational voice assistant for ELjuri.";

        const accentInstruction = this.getAccentInstruction();

        return `
${base}
${accentInstruction}

REGLAS CRÍTICAS / CRITICAL RULES:
1. Keep answers SHORT (1-2 sentences).
2. Use natural, colloquial language.
3. Stop talking if interrupted.
4. Be helpful and polite.
        `.trim();
    }

    private getAccentInstruction(): string {
        if (this.language === 'en') {
            switch (this.accent) {
                case 'british': return "Speak with a polite British accent.";
                case 'australian': return "Speak with an Australian accent.";
                case 'indian': return "Speak with an Indian English accent.";
                default: return "Speak with a standard American accent.";
            }
        }

        switch (this.accent) {
            case 'ecuadorian':
                return "Tu acento debe ser marcadamente ECUATORIANO (de la Sierra o Costa, natural). Usa modismos sutiles si encajan.";
            case 'mexican':
                return "Tu acento debe ser Mexicano natural.";
            case 'colombian':
                return "Tu acento debe ser Colombiano natural.";
            case 'argentine':
                return "Tu acento debe ser Argentino (Rioplatense).";
            case 'spain':
                return "Tu acento debe ser de España (Castellano).";
            default:
                return "Tu acento debe ser Español Neutro (Latinoamericano).";
        }
    }

    /**
     * Fetch a short-lived JWT from the backend token endpoint.
     */
    private async fetchToken(): Promise<string> {
        const apiUrl = this.serverUrl
            .replace(/^ws:\/\//, 'http://')
            .replace(/^wss:\/\//, 'https://')
            .replace(/\/voice\/live.*$/, '/api/auth/token');

        const apiKey = process.env.NEXT_PUBLIC_VOICE_SIMULATOR_API_KEY;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey }),
        });

        if (!response.ok) {
            throw new Error(`Token fetch failed: ${response.status}`);
        }

        const data = await response.json();
        return data.token as string;
    }

    /**
     * Initialize audio context and connect to server
     */
    async connect(): Promise<void> {
        if (this.isConnected) {
            console.log('[VoiceLive] Already connected');
            return;
        }

        try {
            // Fetch JWT before opening WebSocket
            const token = await this.fetchToken();
            if (this.destroyed) return;  // aborted during fetchToken

            // Initialize AudioContext at 24kHz (Gemini requirement)
            this.audioContext = new AudioContext({
                sampleRate: 24000
            });

            // Request microphone access
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 24000,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            if (this.destroyed) {
                this.audioStream.getTracks().forEach(t => t.stop());
                return;
            }

            // Connect WebSocket
            this.websocket = new WebSocket(this.serverUrl);
            this.websocket.binaryType = 'arraybuffer';

            this.websocket.onopen = () => {
                console.log('[VoiceLive] 🎙️ WebSocket open, sending auth...');
                // Step 1: authenticate with JWT
                this.websocket?.send(JSON.stringify({ type: 'auth', token }));
            };

            this.websocket.onmessage = async (event) => {
                if (event.data instanceof ArrayBuffer) {
                    // Binary audio from Gemini
                    await this.playAudio(event.data);
                    this.onAudio?.(event.data);
                } else {
                    // JSON message
                    try {
                        const message = JSON.parse(event.data);
                        this.handleJsonMessage(message);
                    } catch (e) {
                        console.error('[VoiceLive] Invalid message:', event.data);
                    }
                }
            };

            this.websocket.onerror = (error) => {
                console.error('[VoiceLive] WebSocket error:', error);
                this.onError?.('WebSocket error');
            };

            this.websocket.onclose = () => {
                console.log('[VoiceLive] WebSocket closed');
                this.isConnected = false;
                this.onDisconnected?.();
            };

        } catch (error) {
            console.error('[VoiceLive] Initialization failed:', error);
            this.onError?.(`Initialization failed: ${error}`);
            throw error;
        }
    }

    /**
     * Start capturing and streaming audio
     */
    async startStreaming(): Promise<void> {
        if (!this.audioContext || !this.audioStream || !this.websocket) {
            console.error('[VoiceLive] Not initialized');
            return;
        }

        if (this.audioWorklet) {
            console.log('[VoiceLive] Already streaming');
            return;
        }

        try {
            // Resume AudioContext (may be suspended if created without user gesture)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Load AudioWorklet module
            await this.audioContext.audioWorklet.addModule('/audio-processor.js');

            // Create audio source from microphone
            const source = this.audioContext.createMediaStreamSource(this.audioStream);

            // Create AudioWorklet for efficient processing
            this.audioWorklet = new AudioWorkletNode(this.audioContext, 'audio-processor');

            // Handle audio data from worklet
            this.audioWorklet.port.onmessage = (event) => {
                const float32Data = event.data as Float32Array;

                // Convert Float32 to PCM16
                const pcm16 = this.float32ToPCM16(float32Data);

                // Send to server
                if (this.websocket?.readyState === WebSocket.OPEN) {
                    this.websocket.send(pcm16);
                }
            };

            // Connect the audio graph
            source.connect(this.audioWorklet);
            // Don't connect to destination (we don't want to hear ourselves)

            console.log('[VoiceLive] 🎤 Streaming started');

        } catch (error) {
            console.error('[VoiceLive] Failed to start streaming:', error);
            this.onError?.(`Streaming failed: ${error}`);
        }
    }

    /**
     * Stop streaming audio
     */
    stopStreaming(): void {
        if (this.audioWorklet) {
            this.audioWorklet.disconnect();
            this.audioWorklet = null;
            console.log('[VoiceLive] 🛑 Streaming stopped');
        }
    }

    /**
     * Send text message (for testing)
     */
    sendText(text: string): void {
        if (this.websocket?.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({ type: 'text', text }));
        }
    }

    /**
     * Interrupt agent (barge-in)
     */
    interrupt(): void {
        if (this.websocket?.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({ type: 'interrupt' }));
        }
        // Also stop any playing audio
        this.stopPlayback();
    }

    /**
     * Disconnect from server
     */
    disconnect(): void {
        this.destroyed = true;  // abort any in-flight connect()
        this.stopStreaming();
        this.stopPlayback();
        this.audioQueue = [];  // flush any buffered audio so agent stops playing immediately

        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }

        if (this.audioContext) {
            this.audioContext.close().catch(() => { });
            this.audioContext = null;
        }

        if (this.websocket) {
            this.websocket.onclose = null;  // prevent onclose from firing callbacks after intentional disconnect
            this.websocket.onmessage = null;
            this.websocket.onerror = null;
            this.websocket.close();
            this.websocket = null;
        }

        this.isConnected = false;
        this.onDisconnected?.();  // always signal UI to reset
        console.log('[VoiceLive] Disconnected');
    }

    /**
     * Check if connected
     */
    getStatus(): { connected: boolean; streaming: boolean } {
        return {
            connected: this.isConnected,
            streaming: this.audioWorklet !== null
        };
    }

    // ========== Private Methods ==========

    private handleJsonMessage(message: any): void {
        switch (message.type) {
            case 'auth_ok':
                console.log('[VoiceLive] 🔑 Authenticated, sending config...');
                this.websocket?.send(JSON.stringify({
                    type: 'config',
                    voiceName: this.voiceName,
                    systemInstruction: this.systemInstruction,
                    maxOutputTokens: this.maxOutputTokens,
                    maxBudgetUSD: this.maxBudgetUSD
                }));
                break;
            case 'connected':
                console.log('[VoiceLive] ✓ Gemini session ready with voice:', message.voice);
                this.isConnected = true;
                this.onConnected?.(message.voice || this.voiceName);
                break;
            case 'transcript':
                console.log('[VoiceLive] 🤖 Agent:', message.text);
                this.onTranscript?.(message.text);
                break;
            case 'userTranscript':
                console.log('[VoiceLive] 👤 User:', message.text);
                this.onUserTranscript?.(message.text);
                break;
            case 'turnComplete':
                console.log('[VoiceLive] Turn complete');
                this.onTurnComplete?.();
                break;
            case 'error':
                console.error('[VoiceLive] Error:', message.message);
                this.onError?.(message.message);
                break;
            case 'usage':
                this.onUsage?.(message.stats);
                break;
            case 'budgetExceeded':
                console.warn(`[VoiceLive] 💸 Budget exceeded: $${message.spent.toFixed(6)} / $${message.limit}`);
                this.onBudgetExceeded?.({ spent: message.spent, limit: message.limit });
                break;
        }
    }

    private async playAudio(audioData: ArrayBuffer): Promise<void> {
        if (!this.audioContext) return;

        try {
            const audioBuffer = await this.decodeAudioData(audioData);

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);

            const currentTime = this.audioContext.currentTime;
            // Buffer slightly if we fell behind to avoid jitter
            if (this.nextPlayTime < currentTime) {
                this.nextPlayTime = currentTime + 0.05;
            }

            source.start(this.nextPlayTime);
            this.nextPlayTime += audioBuffer.duration;

        } catch (error) {
            console.error('[VoiceLive] Audio playback error:', error);
        }
    }

    private async decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer> {
        // Create AudioBuffer from PCM16 data, ensuring Little-Endian reading
        const dataView = new DataView(data);
        const length = data.byteLength / 2; // 2 bytes per 16-bit sample
        const float32 = new Float32Array(length);

        for (let i = 0; i < length; i++) {
            // true = little-endian, critical for raw PCM from APIs
            const int16 = dataView.getInt16(i * 2, true);
            float32[i] = int16 / 32768;  // Convert to -1.0 to 1.0
        }

        const audioBuffer = this.audioContext!.createBuffer(1, length, 24000);
        audioBuffer.getChannelData(0).set(float32);

        return audioBuffer;
    }

    private stopPlayback(): void {
        this.nextPlayTime = 0;
        // In a true scheduling system, we would keep track of the active buffer sources
        // and call .stop() on them. For simplicity, AudioContext suspension/closing
        // is typically used on disconnect.
    }

    private float32ToPCM16(float32Array: Float32Array): ArrayBuffer {
        const pcm16 = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return pcm16.buffer;
    }
}

// Export singleton for easy use
let clientInstance: VoiceLiveClient | null = null;

export function getVoiceLiveClient(): VoiceLiveClient {
    if (!clientInstance) {
        clientInstance = new VoiceLiveClient();
    }
    return clientInstance;
}
