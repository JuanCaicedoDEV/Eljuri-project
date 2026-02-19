
import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error('CRITICAL: GOOGLE_API_KEY is missing');
    process.exit(1);
}

const host = 'generativelanguage.googleapis.com';

const configs = [
    { version: 'v1alpha', model: 'models/gemini-2.0-flash-exp' },
    { version: 'v1beta', model: 'models/gemini-2.0-flash-exp' },
    { version: 'v1alpha', model: 'models/gemini-2.0-flash' }, // Try stable if available
    { version: 'v1beta', model: 'models/gemini-2.0-flash' },
];

async function testConfig(version: string, model: string) {
    return new Promise<void>((resolve) => {
        console.log(`\n--- Testing ${version} with ${model} ---`);
        const url = `wss://${host}/ws/google.ai.generativelanguage.${version}.GenerativeService.BidiGenerateContent?key=${apiKey}`;

        const ws = new WebSocket(url);

        let resolved = false;
        const done = () => {
            if (!resolved) {
                resolved = true;
                ws.close();
                resolve();
            }
        };

        ws.on('open', () => {
            console.log('socket open');
            // Send setup
            const setupMsg = {
                setup: {
                    model: model,
                    generationConfig: { responseModalities: ["AUDIO"] }
                }
            };
            ws.send(JSON.stringify(setupMsg));
            console.log('setup sent');
        });

        ws.on('message', (data) => {
            console.log('RX:', data.toString().substring(0, 100));
        });

        ws.on('close', (code, reason) => {
            console.log(`CLOSED: ${code} - ${reason}`);
            done();
        });

        ws.on('error', (err) => {
            console.log('ERROR:', err.message);
            done();
        });

        setTimeout(() => {
            if (!resolved) {
                console.log('TIMEOUT (Success?)');
                done();
            }
        }, 5000); // 5s timeout
    });
}

async function run() {
    for (const c of configs) {
        await testConfig(c.version, c.model);
    }
}

run();
