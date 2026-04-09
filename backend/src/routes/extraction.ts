import express from 'express';
import { GoogleGenerativeAI, FunctionCallingMode, SchemaType } from '@google/generative-ai';
import { any, json } from 'zod';

const router = express.Router();
interface ExtractArguments{
    jsonOutput: string
}
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
        const output = {
            functionDeclarations: [
                {
                    name: "extract_transcript",
                    description: "Extrae la transcripcion siguiendo los campos de extractionSchema con el fin de retornar un JSON valido.",
                    parameters: {
                        type: SchemaType.OBJECT,
                        properties: {
                            jsonOutput: {
                                type: SchemaType.STRING,
                                description: "Los datos extraídos representados como una cadena JSON limpia."
                            } as any,
                        },
                        required: ["jsonOutput"]
                    },
                }],
        };
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', tools: [output], });
        const prompt = `A voice simulation has just finished.
                    Please extract structured data from the following transcript based strictly on the provided JSON schema.
                    TRANSCRIPT:
                    ${transcript}.
                    EXTRACTION SCHEMA:
                    ${extractionSchema}
                    Return ONLY a valid JSON object matching the fields described in the schema.
                    Do not include markdown formatting or backticks around the JSON.`
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            toolConfig: {
                functionCallingConfig: {
                    mode: FunctionCallingMode.ANY,
                    allowedFunctionNames: ["extract_transcript"]
                },
            },
        });
        let textResult = result.response.text().trim();

        // Strip markdown blocks if Gemini added them
        if (textResult.startsWith('\`\`\`json')) {
            textResult = textResult.replace(/^\`\`\`json/i, '').replace(/\`\`\`$/i, '').trim();
        } else if (textResult.startsWith('\`\`\`')) {
            textResult = textResult.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
        }
        let parsedData;
        try {
            const part = result.response.candidates?.[0]?.content?.parts?.[0];
            const functionCall = part?.functionCall
            if (!functionCall) {
                console.error('[ExtractionRoute] No function call found in response');
                return res.status(500).json({
                    error: 'El modelo no generó una respuesta estructurada',
                    finishReason: result.response.candidates?.[0]?.finishReason
                });
            }
            const call = result.response.candidates?.[0]?.content?.parts?.[0]?.functionCall
            if (call){
                const args = call.args as unknown as ExtractArguments
                parsedData = JSON.parse(args.jsonOutput)
            }
        } catch (parseError) {
            console.error('[ExtractionRoute] Error parsing Gemini output as JSON:', textResult);
            return res.status(500).json({ error: 'Failed to parse extracted data as JSON' });
        }

        res.json(parsedData);
    } catch (error: any) {
        console.error('[ExtractionRoute] Error extracing data:', error);
        res.status(500).json({"error":"Error en el flujo del codigo, revisar los del servidor"});
    }
});

export default router;
