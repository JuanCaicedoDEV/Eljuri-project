import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { transcript, extractionSchema } = req.body;

        if (!transcript || !extractionSchema) {
            return res.status(400).json({ error: 'Missing transcript or extractionSchema' });
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Missing GOOGLE_API_KEY environment variable' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
A voice simulation has just finished. Please extract structured data from the following transcript based strictly on the provided JSON schema.

TRANSCRIPT:
${transcript}

EXTRACTION SCHEMA:
${extractionSchema}

Return ONLY a valid JSON object matching the fields described in the schema. Do not include markdown formatting or backticks around the JSON.
`;

        const result = await model.generateContent(prompt);
        let textResult = result.response.text().trim();

        // Strip markdown blocks if Gemini added them
        if (textResult.startsWith('\`\`\`json')) {
            textResult = textResult.replace(/^\`\`\`json/i, '').replace(/\`\`\`$/i, '').trim();
        } else if (textResult.startsWith('\`\`\`')) {
            textResult = textResult.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
        }

        let parsedData;
        try {
            parsedData = JSON.parse(textResult);
        } catch (parseError) {
            console.error('[ExtractionRoute] Error parsing Gemini output as JSON:', textResult);
            return res.status(500).json({ error: 'Failed to parse extracted data as JSON', raw: textResult });
        }

        res.json(parsedData);
    } catch (error: any) {
        console.error('[ExtractionRoute] Error extracing data:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
