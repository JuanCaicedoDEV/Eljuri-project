
import WebSocket from 'ws';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3008/api';
const WS_URL = 'ws://localhost:3008/voice/live';
const CAMPAIGN_ID = 'test-termination-fix';

async function runTest() {
    console.log('1. Creating a session...');
    const createRes = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            campaignId: CAMPAIGN_ID,
            phoneNumber: '+1555999999',
            agentType: 'prompt'
        })
    });

    if (!createRes.ok) throw new Error('Failed to create session');
    const session: any = await createRes.json();
    const sessionId = session.sessionId;
    console.log(`   Session created: ${sessionId}`);

    console.log('2. Connecting WebSocket with sessionId...');
    const ws = new WebSocket(`${WS_URL}?sessionId=${sessionId}`);

    await new Promise<void>((resolve) => {
        ws.on('open', () => {
            console.log('   WebSocket Connected');
            resolve();
        });
    });

    console.log('3. Checking session status (should be active/idle)...');
    let sessionState = await (await fetch(`${API_BASE}/sessions/${sessionId}`)).json();
    console.log(`   Current Status: ${sessionState.status}`);

    console.log('4. Discconecting WebSocket...');
    ws.close();

    // Wait for server to process close event
    await new Promise(r => setTimeout(r, 1000));

    console.log('5. Checking message status (should be completed)...');
    sessionState = await (await fetch(`${API_BASE}/sessions/${sessionId}`)).json();
    console.log(`   Final Status: ${sessionState.status}`);

    if (sessionState.status === 'completed') {
        console.log('✅ TEST PASSED: Session was auto-terminated.');
    } else {
        console.error('❌ TEST FAILED: Session is still ' + sessionState.status);
    }
}

runTest().catch(console.error);
