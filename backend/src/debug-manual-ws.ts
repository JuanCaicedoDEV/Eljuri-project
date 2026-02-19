
import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testManualConnection() {
    console.log('Testing Manual WebSocket Connection to AI Studio...');
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.error('CRITICAL: GOOGLE_API_KEY is missing');
        return;
    }

    const host = 'generativelanguage.googleapis.com';
    const model = 'gemini-2.0-flash-exp';
    const url = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    console.log(`Connecting to: ${url.replace(apiKey, 'HIDDEN')}`);

    const ws = new WebSocket(url);

    ws.on('open', () => {
        console.log('✓ Connected to AI Studio endpoint!');

        // Send initial setup message (optional, but good to test)
        const setupMsg = {
            setup: {
                model: `models/${model}`,
                generationConfig: {
                    responseModalities: ["AUDIO"]
                }
            }
        };
        ws.send(JSON.stringify(setupMsg));
        console.log('Sent setup message');

        setTimeout(() => {
            console.log('Closing connection...');
            ws.close();
        }, 2000);
    });

    ws.on('message', (data) => {
        console.log('Received message:', data.toString());
    });

    ws.on('error', (error) => {
        console.error('!!! WebSocket Error !!!', error);
    });

    ws.on('close', (code, reason) => {
        console.log(`Connection closed. Code: ${code}, Reason: ${reason.toString()}`);
    });
}

testManualConnection();
