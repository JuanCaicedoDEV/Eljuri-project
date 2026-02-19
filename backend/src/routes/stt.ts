import express from 'express';
import multer from 'multer';
import speech from '@google-cloud/speech';
import { Readable } from 'stream';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Google Cloud Speech-to-Text client
const speechClient = new speech.SpeechClient();

// POST endpoint to transcribe audio
router.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            console.log('[STT] ❌ No audio file provided');
            return res.status(400).json({ error: 'No audio file provided' });
        }

        console.log('[STT] ✓ Received audio:', req.file.size, 'bytes, type:', req.file.mimetype);

        const audioBytes = req.file.buffer.toString('base64');

        const request = {
            audio: {
                content: audioBytes,
            },
            config: {
                encoding: 'WEBM_OPUS' as const,
                sampleRateHertz: 48000,
                languageCode: 'es-US',
                model: 'latest_long',
                useEnhanced: true,
            },
        };

        console.log('[STT] Sending to Google Cloud Speech-to-Text...');
        const [response] = await speechClient.recognize(request);
        const transcription = response.results
            ?.map(result => result.alternatives?.[0]?.transcript)
            .join('\n') || '';

        console.log('[STT] ✓ Transcription SUCCESS:', transcription);

        res.json({ transcript: transcription });
    } catch (error) {
        console.error('[STT] ❌ Error:', error);
        res.status(500).json({ error: 'Transcription failed' });
    }
});

export default router;
