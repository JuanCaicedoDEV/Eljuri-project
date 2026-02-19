/**
 * Test script to diagnose Gemini Live API connection
 */
import { GoogleGenAI, Modality } from '@google/genai';
import 'dotenv/config';

async function testGeminiLive() {
    console.log('Testing Gemini Live API connection...');
    console.log('API Key present:', !!process.env.GOOGLE_API_KEY);
    console.log('API Key (first 10 chars):', process.env.GOOGLE_API_KEY?.substring(0, 10) + '...');

    try {
        const client = new GoogleGenAI({
            apiKey: process.env.GOOGLE_API_KEY
        });

        console.log('Client created successfully');
        console.log('Checking if live API is available:', !!client.live);

        if (!client.live) {
            console.error('ERROR: client.live is not available. This SDK version may not support Live API.');
            console.log('Try: npm install @google/genai@latest');
            return;
        }

        console.log('Attempting to connect to Gemini Live...');

        const session = await client.live.connect({
            model: 'gemini-2.0-flash-exp',
            callbacks: {
                onmessage: (msg: any) => console.log('Message received:', msg),
                onerror: (err: any) => console.error('Stream error:', err),
                onclose: () => console.log('Connection closed')
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: 'Kore'
                        }
                    }
                }
            }
        });

        console.log('✓ Connected successfully!');
        console.log('Session:', session);

        // Send a test message
        await session.send({
            text: 'Hola, di solo la palabra "conectado"'
        }, { endOfTurn: true });

        console.log('Test message sent, waiting for response...');

        // Wait a bit for response
        await new Promise(resolve => setTimeout(resolve, 5000));

        await session.close();
        console.log('Test complete');

    } catch (error: any) {
        console.error('ERROR connecting to Gemini Live:');
        console.error('Message:', error.message);
        console.error('Full error:', error);

        if (error.message?.includes('API_KEY')) {
            console.log('\n>>> Your API key may not have access to Gemini Live API');
        }
        if (error.message?.includes('model')) {
            console.log('\n>>> The model gemini-2.0-flash-exp may not be available');
        }
    }
}

testGeminiLive();
