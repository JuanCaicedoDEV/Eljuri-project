
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testRest() {
    console.log('Testing REST API Key validity...');
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.error('CRITICAL: GOOGLE_API_KEY is missing');
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            console.log('✓ API Key is valid! Models retrieved.');
            // Check if gemini-2.0-flash-exp is in the list
            const models = (data as any).models || [];
            const hasModel = models.some((m: any) => m.name.includes('gemini-2.0-flash-exp'));
            console.log(`Contains gemini-2.0-flash-exp: ${hasModel}`);
            console.log('First 3 models:', models.slice(0, 3).map((m: any) => m.name));
        } else {
            console.error('!!! REST Error !!!', data);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testRest();
