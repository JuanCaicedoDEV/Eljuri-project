
import WebSocket from 'ws';
import 'dotenv/config';

const PORT = 3008;
const WS_URL = `ws://localhost:${PORT}/voice/live`;

console.log(`Connecting to ${WS_URL}...`);
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
    console.log('Client connected');

    // Send a small silence buffer after 1 second
    setTimeout(() => {
        console.log('Sending audio...');
        const silence = Buffer.alloc(1024, 0); // 1kb silence
        ws.send(silence);
    }, 1000);
});

ws.on('message', (data) => {
    console.log('Received message:', data.toString().substring(0, 100)); // Log first 100 chars
});

ws.on('close', (code, reason) => {
    console.log(`Client closed. Code: ${code}, Reason: ${reason}`);
    process.exit(0);
});

ws.on('error', (err) => {
    console.error('Client error:', err);
    process.exit(1);
});

// Timeout
setTimeout(() => {
    console.log('Timeout reached, closing.');
    ws.close();
    process.exit(0);
}, 10000);
