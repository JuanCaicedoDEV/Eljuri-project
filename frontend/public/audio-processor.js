/**
 * AudioProcessor - AudioWorklet for efficient audio capture
 * 
 * Captures raw PCM audio at 24kHz sample rate for Gemini Live API.
 * This runs in a separate thread for real-time performance.
 */

class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 2048;  // ~85ms of audio at 24kHz
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0];  // Mono channel

            for (let i = 0; i < channelData.length; i++) {
                this.buffer[this.bufferIndex++] = channelData[i];

                if (this.bufferIndex >= this.bufferSize) {
                    // Send buffer to main thread
                    this.port.postMessage(this.buffer.slice(0));
                    this.bufferIndex = 0;
                }
            }
        }

        return true;  // Keep processor alive
    }
}

registerProcessor('audio-processor', AudioProcessor);
