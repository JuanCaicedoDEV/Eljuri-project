import { EventEmitter } from 'events';

export class StreamBuffer extends EventEmitter {
    private buffer: string = '';
    // improved regex to handle abbreviations better could be added here
    // for now, split on . ? ! followed by space or end of string
    // avoiding splitting on decimal numbers (e.g. 2.5)
    private sentenceEndRegex = /([.?!])\s+(?=[A-Z¿¡])|([.?!])$/;

    constructor() {
        super();
    }

    add(chunk: string) {
        this.buffer += chunk;
        this.processBuffer();
    }

    private processBuffer() {
        // Strategy: Emit on sentence boundaries OR every ~15 words for low latency
        let match;

        // Try to find complete sentences first
        while ((match = this.buffer.match(this.sentenceEndRegex)) !== null) {
            const index = match.index! + match[0].length;
            const sentence = this.buffer.substring(0, index).trim();

            if (sentence) {
                this.emit('sentence', sentence);
            }

            this.buffer = this.buffer.substring(index);
        }

        // If buffer has grown too large without a sentence boundary, emit partial chunk
        // This prevents waiting too long for punctuation
        const words = this.buffer.trim().split(/\s+/);
        if (words.length >= 12) {  // ~12 words = good audio chunk size
            const chunkToEmit = words.slice(0, 12).join(' ');
            this.emit('sentence', chunkToEmit);
            this.buffer = words.slice(12).join(' ');
        }
    }

    flush() {
        if (this.buffer.trim()) {
            this.emit('sentence', this.buffer.trim());
            this.buffer = '';
        }
    }
}
