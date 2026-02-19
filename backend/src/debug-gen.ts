
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

console.log('Checking API Key:', process.env.GOOGLE_API_KEY ? 'Present' : 'MISSING');

const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

async function run() {
    try {
        console.log('Attempting generation with gemini-2.0-flash-exp...');
        const response = await client.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: { parts: [{ text: 'Hello, are you working?' }] }
        });
        console.log('Success! Response:', JSON.stringify(response, null, 2));
    } catch (e: any) {
        console.error('GenAI Error:', e.message || e);
        if (e.statusDetails) console.error('Details:', JSON.stringify(e.statusDetails, null, 2));
    }
}

run();
