import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import dotenv from 'dotenv';
dotenv.config();

async function listVoices() {
    const client = new TextToSpeechClient();
    const [response] = await client.listVoices({});
    const voices = response.voices;

    console.log('Voices:');
    voices?.filter(v => v.name?.includes('gemini') || v.name?.includes('Neural2')).forEach(voice => {
        console.log(`Name: ${voice.name}`);
        console.log(`  Language Codes: ${voice.languageCodes}`);
        console.log(`  SSML Gender: ${voice.ssmlGender}`);
        console.log(`  Natural Sample Rate Hertz: ${voice.naturalSampleRateHertz}`);
    });
}

listVoices().catch(console.error);
