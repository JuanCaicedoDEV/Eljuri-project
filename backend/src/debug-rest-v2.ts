
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testRest() {
    const apiKey = process.env.GOOGLE_API_KEY;
    console.log('--- TEST START ---');
    console.log(`Key present: ${!!apiKey}`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log(`Status: ${response.status}`);
        if (response.ok) {
            console.log('SUCCESS: API Key is good for gemini-1.5-flash');
        } else {
            console.log('FAILURE:', JSON.stringify(data, null, 2));
        }
    } catch (error: any) {
        console.log('EXCEPTION:', error.message);
    }
    console.log('--- TEST END ---');
}

testRest();
