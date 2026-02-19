import { Session } from '../models/Session.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export interface FlowStepResult {
    responseText: string;
    nextNodeId: string | null;
    status: 'speaking' | 'listening' | 'ended';
}

class FlowEngine {
    /**
     * Executes the next step in the flow based on current state and user input
     */
    async processStep(session: Session, userText?: string): Promise<FlowStepResult> {
        if (!session.flowData || !session.flowData.nodes) {
            return { responseText: "No flow data available.", nextNodeId: null, status: 'ended' };
        }

        const nodes = session.flowData.nodes;
        const edges = session.flowData.edges;

        let currentNodeId = session.currentNodeId;

        // 1. If no current node, find the 'start' node
        if (!currentNodeId) {
            const startNode = nodes.find((n: any) => n.type === 'start');
            if (startNode) {
                currentNodeId = startNode.id;
            } else {
                // Fallback to first node if no start node
                currentNodeId = nodes[0].id;
            }
        }

        let currentNode = nodes.find((n: any) => n.id === currentNodeId);
        if (!currentNode) {
            return { responseText: "Current node not found.", nextNodeId: null, status: 'ended' };
        }

        // 2. Logic based on current node type
        if (currentNode.type === 'start') {
            // Move to first connected node
            const nextEdge = edges.find((e: any) => e.source === currentNodeId);
            if (nextEdge) {
                session.currentNodeId = nextEdge.target;
                return this.processStep(session, userText); // Recurse to next node
            }
        }

        if (currentNode.type === 'speak') {
            const text = (currentNode.data.label || '').replace('Speak: ', '');

            // Find next node
            const nextEdge = edges.find((e: any) => e.source === currentNodeId);
            const nextNodeId = nextEdge ? (nextEdge.target as string) : null;

            return {
                responseText: text,
                nextNodeId: nextNodeId,
                status: nextNodeId ? 'speaking' : 'ended'
            };
        }

        if (currentNode.type === 'listen') {
            const options = (currentNode.data.options as string[]) || [];

            if (!userText) {
                return {
                    responseText: "", // Wait for user
                    nextNodeId: (currentNodeId as string) || null,
                    status: 'listening'
                };
            }

            // Semantic matching with Gemini
            let selectedOptionIdx = -1;
            if (options.length > 0) {
                selectedOptionIdx = await this.matchOption(userText, options);
            }

            // Find matching edge
            // Since we only have one outlet handle, we might need a way to distinguish edges.
            // For now, if there are multiple edges, we could use the edge label or just the index.
            // A common trick is to store the "option text" or "index" on the edge.
            // But if not present, we follow the first edge if it's the only one.

            const outgoingEdges = edges.filter((e: any) => e.source === currentNodeId);
            let nextEdge = outgoingEdges[0]; // Default

            if (selectedOptionIdx !== -1 && outgoingEdges.length > 1) {
                // Try to find an edge that matches the option index or label
                // For now, let's assume the order of edges matches the order of options if multiple
                nextEdge = outgoingEdges[selectedOptionIdx] || outgoingEdges[0];
            }

            const nextNodeId = nextEdge ? (nextEdge.target as string) : null;

            if (!nextNodeId) {
                return { responseText: "End of flow reached.", nextNodeId: null, status: 'ended' };
            }

            // Move to next node and process it (usually a 'speak' node)
            session.currentNodeId = nextNodeId;
            return this.processStep(session);
        }

        if (currentNode.type === 'end') {
            return { responseText: "Call ended.", nextNodeId: null, status: 'ended' };
        }

        return { responseText: "Unknown node type.", nextNodeId: null, status: 'ended' };
    }

    /**
     * Uses Gemini to match user input against a list of options
     */
    private async matchOption(text: string, options: string[]): Promise<number> {
        if (options.length === 0) return -1;

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            const prompt = `
            User said: "${text}"
            
            Match this input to one of the following options. Return ONLY the index (0, 1, 2...) of the best match. 
            If none match well, return -1.
            
            Options:
            ${options.map((opt, i) => `${i}: ${opt}`).join('\n')}
            `;

            const result = await model.generateContent(prompt);
            const response = result.response.text().trim();
            const index = parseInt(response);

            return isNaN(index) ? -1 : index;
        } catch (error) {
            console.error("Gemini matching error:", error);
            return -1;
        }
    }
}

export const flowEngine = new FlowEngine();
