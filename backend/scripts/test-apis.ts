import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY;

console.log('\n=== TESTING GEMINI APIs ===\n');
console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 15)}...` : 'NOT FOUND');

// Test 1: Gemini LLM
async function testLLM() {
    console.log('\n[TEST 1] Testing Gemini 2.5 Flash Lite (LLM)...');
    try {
        const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:streamGenerateContent?key=${API_KEY}`;
        const payload = {
            contents: [{
                role: 'user',
                parts: [{ text: 'Di hola en una palabra' }]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('Status:', response.status, response.statusText);
        const text = await response.text();
        console.log('Response:', text.substring(0, 500));

        if (response.ok) {
            console.log('✅ LLM API Working');
        } else {
            console.log('❌ LLM API Failed');
        }
    } catch (error) {
        console.error('❌ LLM Error:', error.message);
    }
}

// Test 2: Gemini TTS
async function testTTS() {
    console.log('\n[TEST 2] Testing Gemini 2.5 Flash TTS...');
    try {
        const url = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${API_KEY}`;
        const payload = {
            audioConfig: {
                audioEncoding: "MP3",
                pitch: 0,
                speakingRate: 1.15
            },
            input: {
                prompt: "Habla con tono cálido",
                text: "Hola, esta es una prueba"
            },
            voice: {
                languageCode: "es-US",
                modelName: "gemini-2.5-flash-tts",
                name: "Despina"
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('Status:', response.status, response.statusText);
        const data = await response.json();
        console.log('Response keys:', Object.keys(data));

        if (data.audioContent) {
            console.log('✅ TTS API Working - Audio Generated:', data.audioContent.substring(0, 50) + '...');
            fs.writeFileSync('test-audio.txt', data.audioContent);
            console.log('💾 Audio saved to test-audio.txt');
        } else {
            console.log('❌ No audioContent in response:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('❌ TTS Error:', error.message);
    }
}

// Run tests
(async () => {
    await testLLM();
    await testTTS();
    console.log('\n=== TESTS COMPLETE ===\n');
})();
