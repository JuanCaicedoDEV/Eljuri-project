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
}

export class VoiceLiveClient {
    private serverUrl: string;
    private voiceName: string;
    private systemInstruction?: string;
    private language: 'es' | 'en';
    private accent: string;
    private websocket: WebSocket | null = null;
    private audioContext: AudioContext | null = null;
    private audioStream: MediaStream | null = null;
    private audioWorklet: AudioWorkletNode | null = null;
    private isConnected: boolean = false;
    private audioQueue: AudioBuffer[] = [];
    private isPlaying: boolean = false;

    // Callbacks
    public onConnected: ((voice: string) => void) | null = null;
    public onDisconnected: (() => void) | null = null;
    public onAudio: ((audioData: ArrayBuffer) => void) | null = null;
    public onTranscript: ((text: string) => void) | null = null;
    public onError: ((error: string) => void) | null = null;
    public onTurnComplete: (() => void) | null = null;
    public onUsage: ((stats: { inTokens: number, outTokens: number, cost: number, model: string }) => void) | null = null;

    constructor(config: VoiceLiveConfig = {}) {
        const defaultHost = typeof window !== 'undefined'
            ? `${window.location.hostname}:3008`
            : 'localhost:3008';
        this.serverUrl = config.serverUrl || `ws://${defaultHost}/voice/live`;

        if (config.sessionId) {
            this.serverUrl += `?sessionId=${config.sessionId}`;
        }

        this.voiceName = config.voiceName || 'Kore';
        this.language = config.language || 'es';
        this.accent = config.accent || 'ecuadorian';

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
     * Initialize audio context and connect to server
     */
    async connect(): Promise<void> {
        if (this.isConnected) {
            console.log('[VoiceLive] Already connected');
            return;
        }

        try {
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

            // Connect WebSocket
            this.websocket = new WebSocket(this.serverUrl);
            this.websocket.binaryType = 'arraybuffer';

            this.websocket.onopen = () => {
                console.log('[VoiceLive] 🎙️ WebSocket open, sending config...');
                // Send config message with voice selection
                this.websocket?.send(JSON.stringify({
                    type: 'config',
                    voiceName: this.voiceName,
                    systemInstruction: this.systemInstruction
                }));
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
        this.stopStreaming();
        this.stopPlayback();

        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }

        this.isConnected = false;
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
            case 'connected':
                console.log('[VoiceLive] ✓ Gemini session ready with voice:', message.voice);
                this.isConnected = true;
                this.onConnected?.(message.voice || this.voiceName);
                break;
            case 'transcript':
                console.log('[VoiceLive] 🤖 Agent:', message.text);
                this.onTranscript?.(message.text);
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
        }
    }

    private async playAudio(audioData: ArrayBuffer): Promise<void> {
        if (!this.audioContext) return;

        try {
            // Decode audio (assuming PCM from Gemini)
            const audioBuffer = await this.decodeAudioData(audioData);

            // Queue and play
            this.audioQueue.push(audioBuffer);
            this.playNextInQueue();

        } catch (error) {
            console.error('[VoiceLive] Audio playback error:', error);
        }
    }

    private async decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer> {
        // Create AudioBuffer from PCM16 data
        const pcm16 = new Int16Array(data);
        const float32 = new Float32Array(pcm16.length);

        for (let i = 0; i < pcm16.length; i++) {
            float32[i] = pcm16[i] / 32768;  // Convert to -1.0 to 1.0
        }

        const audioBuffer = this.audioContext!.createBuffer(1, float32.length, 24000);
        audioBuffer.getChannelData(0).set(float32);

        return audioBuffer;
    }

    private playNextInQueue(): void {
        if (this.isPlaying || this.audioQueue.length === 0 || !this.audioContext) {
            return;
        }

        this.isPlaying = true;
        const audioBuffer = this.audioQueue.shift()!;

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);

        source.onended = () => {
            this.isPlaying = false;
            this.playNextInQueue();  // Play next in queue
        };

        source.start();
    }

    private stopPlayback(): void {
        this.audioQueue = [];
        this.isPlaying = false;
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
