import { describe, it, expect } from 'vitest';
import { flowToPrompt, advanceFlow, FlowData } from '../lib/flowToPrompt';
import { Node, Edge } from '@xyflow/react';

describe('flowToPrompt', () => {

    it('should handle empty graph by returning a default prompt', () => {
        const flowData: FlowData = { nodes: [], edges: [] };
        const prompt = flowToPrompt(flowData);
        expect(prompt).toContain('You are a helpful voice assistant');
    });

    it('should generate a simple conversational script correctly', () => {
        const nodes: Node[] = [
            { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
            { id: 'speak-1', type: 'speak', position: { x: 0, y: 0 }, data: { text: 'Hello world' } },
            { id: 'end-1', type: 'end', position: { x: 0, y: 0 }, data: {} }
        ];
        const edges: Edge[] = [
            { id: 'e1', source: 'start-1', target: 'speak-1' },
            { id: 'e2', source: 'speak-1', target: 'end-1' }
        ];

        const prompt = flowToPrompt({ nodes, edges });

        expect(prompt).toContain('STEP 1 [START]: Begin the call');
        expect(prompt).toContain('STEP 2 [SPEAK]: Say exactly: "Hello world"');
        expect(prompt).toContain('STEP 3 [END]: Politely say goodbye');
    });

    it('should correctly extract Listen nodes with branch options', () => {
        const nodes: Node[] = [
            { id: 'listen-1', type: 'listen', position: { x: 0, y: 0 }, data: { text: 'How are you?', options: ['Good', 'Bad'] } }
        ];

        const prompt = flowToPrompt({ nodes, edges: [] });

        expect(prompt).toContain('STEP 1 [LISTEN]');
        expect(prompt).toContain('Context: How are you?');
        expect(prompt).toContain('Possible expected responses: Good, Bad');
    });
});

describe('advanceFlow', () => {

    const nodes: Node[] = [
        { id: 'listen-1', type: 'listen', position: { x: 0, y: 0 }, data: { options: ['Accept', 'Decline'] } },
        { id: 'speak-accept', type: 'speak', position: { x: 0, y: 0 }, data: {} },
        { id: 'speak-decline', type: 'speak', position: { x: 0, y: 0 }, data: {} }
    ];

    const edges: Edge[] = [
        { id: 'e1', source: 'listen-1', target: 'speak-accept', label: 'Accept' },
        { id: 'e2', source: 'listen-1', target: 'speak-decline', label: 'Decline' }
    ];

    it('should return null if there is no current node', () => {
        expect(advanceFlow(null, 'hello', nodes, edges)).toBeNull();
    });

    it('should return the correct target node when transcript matches an edge label', () => {
        const target = advanceFlow('listen-1', 'I gladly accept your offer', nodes, edges);
        expect(target).toBe('speak-accept');
    });

    it('should return the correct target node regardless of case', () => {
        const target = advanceFlow('listen-1', 'i want to DECLINE', nodes, edges);
        expect(target).toBe('speak-decline');
    });
});
