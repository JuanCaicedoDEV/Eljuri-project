
import WebSocket from 'ws';

const CONNECT_COUNT = 20; // Try 20 connections
const SERVER_URL = 'ws://localhost:3008/voice/live';

async function runTest() {
    console.log(`Starting WS Load Test: ${CONNECT_COUNT} connections...`);
    const clients: WebSocket[] = [];
    let connected = 0;

    for (let i = 0; i < CONNECT_COUNT; i++) {
        const ws = new WebSocket(SERVER_URL);

        ws.on('open', () => {
            connected++;
            console.log(`[${i}] Connected. (${connected}/${CONNECT_COUNT})`);

            // Send config to trigger agent creation
            ws.send(JSON.stringify({
                type: 'config',
                voiceName: 'Kore',
                systemInstruction: 'You are a load test bot.'
            }));

            // Keep it alive
            setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 5000);
        });

        ws.on('error', (err) => {
            console.error(`[${i}] Error:`, err.message);
        });

        ws.on('close', () => {
            console.log(`[${i}] Closed.`);
            connected--;
        });

        clients.push(ws);

        // Stagger connections slightly
        await new Promise(r => setTimeout(r, 100));
    }

    console.log('All connections initiated. Waiting 10s...');
    await new Promise(r => setTimeout(r, 10000));

    console.log(`Final Connected Count: ${connected}`);
    console.log('Closing all...');
    clients.forEach(c => c.close());
}

runTest();
