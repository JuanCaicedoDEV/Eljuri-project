
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testConnection() {
    console.log('Testing Gemini Live Connection...');
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.error('CRITICAL: GOOGLE_API_KEY is missing');
        return;
    }

    // Force strict API Key mode by removing Vertex-related env vars
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GCLOUD_PROJECT;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

    console.log(`Using API Key: ${apiKey.substring(0, 5)}...`);

    const client = new GoogleGenAI({
        apiKey: apiKey
    });

    try {
        console.log('Initiating connection to gemini-2.0-flash-exp...');
        const session = await client.live.connect({
            model: 'gemini-2.0-flash-exp',
            config: {
                responseModalities: [Modality.AUDIO],
            },
            callbacks: {
                onopen: () => {
                    console.log('✓ Connected!');
                    setTimeout(() => {
                        session.close();
                        console.log('Closed session.');
                    }, 2000);
                },
                onclose: (event) => {
                    console.log(`!!! CLOSED !!! Code: ${event.code}, Reason: ${event.reason}`);
                },
                onerror: (error) => {
                    console.error('!!! ERROR !!!', error);
                }
            }
        });
    } catch (error) {
        console.error('Connection failed synchronously:', error);
    }
}

testConnection();
