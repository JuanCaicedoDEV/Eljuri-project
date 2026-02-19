import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3008/api';
const NUM_SESSIONS = 10;
const CAMPAIGN_ID = 'camp-mass-test';

async function runLoadTest() {
    console.log(`Starting Mass Load Test: Creating ${NUM_SESSIONS} sessions...`);

    const sessionIds: string[] = [];

    // 1. Create sessions
    for (let i = 0; i < NUM_SESSIONS; i++) {
        try {
            const response = await fetch(`${API_BASE}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignId: CAMPAIGN_ID,
                    phoneNumber: `+1555000${i.toString().padStart(3, '0')}`,
                    agentType: 'prompt',
                    systemPrompt: 'You are a test agent for load testing. Keep responses short.'
                })
            });

            if (response.ok) {
                const session: any = await response.json();
                sessionIds.push(session.sessionId);
                console.log(`[+] Created: ${session.sessionId}`);
            } else {
                console.error(`[-] Failed to create session ${i}`);
            }
        } catch (error) {
            console.error(`[!] Error creating session ${i}:`, error);
        }
    }

    console.log(`\nActive Sessions: ${sessionIds.length}`);
    console.log('Simulating concurrent interactions...');

    // 2. Simulate interactions in parallel
    const interactions = sessionIds.map(async (id, idx) => {
        // Wait a bit before starting to spread load
        await new Promise(resolve => setTimeout(resolve, idx * 500));

        try {
            console.log(`[>] Session ${id} sending message...`);
            const response = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: id,
                    message: "Explain briefly why a multi-session call center is useful."
                })
            });

            if (response.ok) {
                const data: any = await response.json();
                console.log(`[<] Session ${id} received response (${data.assistantMessage.content.length} chars)`);
            } else {
                console.error(`[!] Session ${id} chat failed`);
            }
        } catch (error) {
            console.error(`[!] Interaction error for ${id}:`, error);
        }
    });

    await Promise.all(interactions);

    console.log('\nLoad test interactions complete.');
    console.log('Sessions will remain active in the dashboard for inspection.');
}

runLoadTest().catch(console.error);
