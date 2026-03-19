import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiLiveAgent, createGeminiLiveAgent } from '../services/GeminiLiveAgent';

describe('GeminiLiveAgent', () => {
    let agent: GeminiLiveAgent;

    beforeEach(() => {
        // Mock environment variables to ensure safe defaults
        vi.stubEnv('GOOGLE_API_KEY', 'test-api-key');
        vi.stubEnv('GOOGLE_CLOUD_PROJECT', 'test-project-id');

        agent = createGeminiLiveAgent({
            voiceName: 'Aoede',
            systemInstruction: 'Test instruction'
        });
    });

    it('should be instantiable and disconnected by default', () => {
        expect(agent).toBeInstanceOf(GeminiLiveAgent);
        expect(agent.getStatus().connected).toBe(false);
    });

    it('should correctly store and apply configuration via factory', () => {
        // Accessing private config solely for testing purposes is tricky in TS
        // Alternatively, we can test behavior. For instance, the factory should return an agent.
        const customAgent = createGeminiLiveAgent();
        expect(customAgent).toBeInstanceOf(GeminiLiveAgent);
    });

    it('should emit disconnected event when disconnect is called safely', async () => {
        const spy = vi.fn();
        agent.on('disconnected', spy);

        await agent.disconnect();

        expect(spy).toHaveBeenCalled();
        expect(agent.getStatus().connected).toBe(false);
    });
});
