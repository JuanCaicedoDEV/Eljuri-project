import fetch from 'node-fetch';

const API_KEY = "AQ.Ab8RN6KL7BN9USUbU0DCCOTd_Cmhyn1nBtSuQhuz05U8wtw4cg";

console.log('\n--- Testing Gemini LLM (2.5 Flash Lite) ---\n');

const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:streamGenerateContent?key=${API_KEY}`;
const payload = {
    contents: [{
        role: 'user',
        parts: [{ text: 'Responde solo: Hola' }]
    }]
};

fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
})
    .then(async res => {
        console.log('Status:', res.status);
        if (!res.ok) {
            const text = await res.text();
            console.log('Error Response:', text);
            return;
        }

        console.log('Streaming response:');
        for await (const chunk of res.body) {
            const chunkString = chunk.toString();
            console.log('Chunk:', chunkString.substring(0, 200));

            // Parse text
            const regex = /"text":\s*"([^"]+)"/g;
            let match;
            while ((match = regex.exec(chunkString)) !== null) {
                console.log('Extracted text:', match[1]);
            }
        }
    })
    .catch(err => {
        console.error('Error:', err.message);
    });
