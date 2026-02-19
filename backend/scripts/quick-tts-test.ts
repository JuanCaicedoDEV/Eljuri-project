import fetch from 'node-fetch';

const API_KEY = "AQ.Ab8RN6KL7BN9USUbU0DCCOTd_Cmhyn1nBtSuQhuz05U8wtw4cg";

console.log('\\n--- Testing Gemini TTS ---\\n');

const url = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${API_KEY}`;
const payload = {
    audioConfig: {
        audioEncoding: "MP3",
        pitch: 0,
        speakingRate: 1.15
    },
    input: {
        prompt: "Test",
        text: "Hola mundo"
    },
    voice: {
        languageCode: "es-US",
        modelName: "gemini-2.5-flash-tts",
        name: "Despina"
    }
};

fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
})
    .then(res => {
        console.log('Status:', res.status);
        return res.text();
    })
    .then(text => {
        console.log('Response:', text);
    })
    .catch(err => {
        console.error('Error:', err.message);
    });
