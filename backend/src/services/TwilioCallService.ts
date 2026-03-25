/**
 * TwilioCallService
 *
 * Bridges Twilio Programmable Voice (Media Streams) with GeminiLiveAgent.
 *
 * Audio path:
 *   Twilio call (μ-law G.711, 8kHz) ──► upsample to PCM16 24kHz ──► Gemini Live API
 *   Gemini Live API (PCM16 24kHz)   ──► downsample to PCM16 8kHz ──► μ-law ──► Twilio
 */

import twilio from 'twilio';
type TwilioClient = ReturnType<typeof twilio>;
import { EventEmitter } from 'events';
import type WebSocket from 'ws';
import { createGeminiLiveAgent, type GeminiLiveAgent } from './GeminiLiveAgent.js';

// ─── G.711 μ-law (PCMU) codec ────────────────────────────────────────────────

function mulawDecode(byte: number): number {
    byte = ~byte & 0xff;
    const sign = byte & 0x80;
    const exponent = (byte >> 4) & 0x07;
    const mantissa = byte & 0x0f;
    let sample = ((mantissa << 1) + 33) << exponent;
    sample -= 33;
    return sign !== 0 ? -sample : sample;
}

function mulawEncode(sample: number): number {
    const BIAS = 132;
    const CLIP = 32767;
    const sign = sample < 0 ? 0x80 : 0;
    if (sample < 0) sample = -sample;
    if (sample > CLIP) sample = CLIP;
    sample += BIAS;
    let exponent = 7;
    for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; exponent--, mask >>= 1) {}
    const mantissa = (sample >> (exponent + 3)) & 0x0f;
    return (~(sign | (exponent << 4) | mantissa)) & 0xff;
}

// ─── Linear resampler (PCM16 LE) ─────────────────────────────────────────────

function resamplePCM16(input: Buffer, srcRate: number, dstRate: number): Buffer {
    const srcSamples = input.length / 2;
    const dstSamples = Math.round(srcSamples * dstRate / srcRate);
    const output = Buffer.alloc(dstSamples * 2);
    for (let i = 0; i < dstSamples; i++) {
        const srcPos = i * srcRate / dstRate;
        const idx = Math.floor(srcPos);
        const frac = srcPos - idx;
        const s1 = idx < srcSamples ? input.readInt16LE(idx * 2) : 0;
        const s2 = idx + 1 < srcSamples ? input.readInt16LE((idx + 1) * 2) : s1;
        const out = Math.round(s1 + frac * (s2 - s1));
        output.writeInt16LE(Math.max(-32768, Math.min(32767, out)), i * 2);
    }
    return output;
}

// ─── Public audio conversion helpers ─────────────────────────────────────────

/** Twilio μ-law 8kHz base64 → PCM16 24kHz Buffer (for Gemini) */
export function twilioAudioToGemini(base64Mulaw: string): Buffer {
    const mulawBuf = Buffer.from(base64Mulaw, 'base64');
    const pcm8k = Buffer.alloc(mulawBuf.length * 2);
    for (let i = 0; i < mulawBuf.length; i++) {
        pcm8k.writeInt16LE(mulawDecode(mulawBuf[i]), i * 2);
    }
    return resamplePCM16(pcm8k, 8000, 24000);
}

/** Gemini PCM16 24kHz Buffer → Twilio μ-law 8kHz base64 */
export function geminiAudioToTwilio(pcm24k: Buffer): string {
    const pcm8k = resamplePCM16(pcm24k, 24000, 8000);
    const mulaw = Buffer.alloc(pcm8k.length / 2);
    for (let i = 0; i < mulaw.length; i++) {
        mulaw[i] = mulawEncode(pcm8k.readInt16LE(i * 2));
    }
    return mulaw.toString('base64');
}

// ─── Active call record ───────────────────────────────────────────────────────

export interface ActiveCall {
    callSid: string;
    streamSid: string | null;
    ws: WebSocket;
    agent: GeminiLiveAgent;
    campaignId: string;
    sessionId: string;
    to: string;
    startedAt: Date;
    status: 'connecting' | 'active' | 'ended';
}

// ─── TwilioCallService ────────────────────────────────────────────────────────

class TwilioCallService extends EventEmitter {
    private client: TwilioClient | null = null;
    private activeCalls = new Map<string, ActiveCall>();

    /** Call once on server startup. No-ops gracefully if env vars are missing. */
    init(): void {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        if (!sid || !token || sid === 'your_account_sid_here') {
            console.warn('[Twilio] Credentials not set — real-call feature disabled');
            return;
        }
        this.client = twilio(sid, token);
        console.log('[Twilio] ✓ Client initialized');
    }

    isEnabled(): boolean {
        return this.client !== null;
    }

    /**
     * Initiate an outbound call via Twilio REST API.
     * Returns the callSid immediately (call is async — Twilio dials in background).
     */
    async makeOutboundCall(params: {
        to: string;
        campaignId: string;
        sessionId: string;
        systemInstruction: string;
        voiceName: string;
        backendUrl: string;
    }): Promise<string> {
        if (!this.client) throw new Error('Twilio not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');

        const from = process.env.TWILIO_PHONE_NUMBER;
        if (!from) throw new Error('TWILIO_PHONE_NUMBER not set in .env');

        // Twilio calls this URL when the callee answers — we return TwiML with <Stream>
        // NOTE: systemInstruction is intentionally excluded from the URL to stay under
        // Twilio's 4000-char limit. The twiml handler retrieves it from sessionManager.
        const twimlUrl =
            `${params.backendUrl}/twilio/twiml` +
            `?sessionId=${encodeURIComponent(params.sessionId)}` +
            `&voiceName=${encodeURIComponent(params.voiceName)}` +
            `&to=${encodeURIComponent(params.to)}`;

        const call = await this.client.calls.create({
            to: params.to,
            from,
            url: twimlUrl,
            method: 'POST',
        });

        console.log(`[Twilio] ✓ Outbound call initiated: ${call.sid} → ${params.to}`);
        return call.sid;
    }

    /** Hang up an active call. */
    async endCall(callSid: string): Promise<void> {
        if (!this.client) throw new Error('Twilio not configured');
        try {
            await this.client.calls(callSid).update({ status: 'completed' });
            console.log(`[Twilio] Call ended: ${callSid}`);
        } catch (err) {
            console.error(`[Twilio] Failed to end call ${callSid}:`, err);
        }
    }

    /**
     * Wire a Twilio Media Streams WebSocket to a new GeminiLiveAgent.
     * Called from the server's WebSocket upgrade handler for /twilio/stream.
     */
    async handleMediaStream(
        ws: WebSocket,
        campaignId: string,
        sessionId: string,
        systemInstruction: string,
        voiceName: string,
        to: string = '',
    ): Promise<void> {
        console.log(`[Twilio] Media stream connected — campaign=${campaignId} session=${sessionId}`);

        const agent = createGeminiLiveAgent({
            voiceName: voiceName || 'Kore',
            systemInstruction,
        });

        let callRecord: ActiveCall | null = null;
        let streamSid: string | null = null;

        // ── Gemini → Twilio ──────────────────────────────────────────────
        agent.on('audio', (pcm24k: Buffer) => {
            if (!streamSid) return;
            try {
                const payload = geminiAudioToTwilio(pcm24k);
                const msg = JSON.stringify({
                    event: 'media',
                    streamSid,
                    media: { payload },
                });
                if ((ws as any).readyState === 1 /* OPEN */) ws.send(msg);
            } catch (e) {
                console.error('[Twilio] Error sending audio to Twilio:', e);
            }
        });

        agent.on('transcript', (text: string) => {
            console.log('[Twilio→Gemini] Agent:', text);
            this.emit('transcript', { sessionId, role: 'agent', text });
        });

        agent.on('userTranscript', (text: string) => {
            console.log('[Twilio→Gemini] User:', text);
            this.emit('transcript', { sessionId, role: 'user', text });
        });

        agent.on('error', (err: Error) => {
            console.error('[Twilio→Gemini] Agent error:', err.message);
        });

        agent.on('budgetExceeded', async () => {
            console.warn('[Twilio→Gemini] Budget exceeded — hanging up');
            if (callRecord?.callSid) await this.endCall(callRecord.callSid);
        });

        // ── Connect to Gemini ────────────────────────────────────────────
        try {
            await agent.connect();
            // Prompt Gemini to speak first (greet the caller)
            await agent.sendText('Inicia la llamada con un saludo y preséntate.');
        } catch (err) {
            console.error('[Twilio] Failed to connect agent to Gemini:', err);
            ws.close();
            return;
        }

        // ── Twilio → Gemini ──────────────────────────────────────────────
        ws.on('message', (raw: Buffer | string) => {
            try {
                const msg = JSON.parse(raw.toString());

                if (msg.event === 'connected') {
                    console.log('[Twilio] Media stream connected event');
                }

                if (msg.event === 'start') {
                    streamSid = msg.start.streamSid;
                    const callSid = msg.start.callSid;
                    console.log(`[Twilio] Stream started: streamSid=${streamSid} callSid=${callSid}`);

                    callRecord = {
                        callSid,
                        streamSid,
                        ws,
                        agent,
                        campaignId,
                        sessionId,
                        to,
                        startedAt: new Date(),
                        status: 'active',
                    };
                    this.activeCalls.set(callSid, callRecord);
                    this.emit('callStarted', callRecord);
                }

                if (msg.event === 'media' && msg.media?.track === 'inbound' && msg.media.payload) {
                    const pcm24k = twilioAudioToGemini(msg.media.payload);
                    agent.sendAudio(pcm24k).catch((e: Error) =>
                        console.error('[Twilio] sendAudio error:', e.message)
                    );
                }

                if (msg.event === 'stop') {
                    console.log('[Twilio] Stream stopped');
                    this.cleanupStream(callRecord);
                }
            } catch (e) {
                // Non-JSON messages from Twilio can be ignored
            }
        });

        ws.on('close', () => {
            console.log('[Twilio] Media WebSocket closed');
            this.cleanupStream(callRecord);
        });

        ws.on('error', (err) => {
            console.error('[Twilio] Media WebSocket error:', err.message);
            this.cleanupStream(callRecord);
        });
    }

    private cleanupStream(call: ActiveCall | null): void {
        if (!call) return;
        if (call.status === 'ended') return; // already cleaned
        call.status = 'ended';
        call.agent.disconnect().catch(() => {});
        this.activeCalls.delete(call.callSid);
        this.emit('callEnded', { callSid: call.callSid, sessionId: call.sessionId });
        console.log(`[Twilio] Cleaned up call ${call.callSid}`);
    }

    getActiveCalls(): ActiveCall[] {
        return Array.from(this.activeCalls.values());
    }

    getCall(callSid: string): ActiveCall | undefined {
        return this.activeCalls.get(callSid);
    }
}

export const twilioCallService = new TwilioCallService();
