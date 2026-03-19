/**
 * flowToPrompt.ts
 *
 * Converts the visual flow graph (nodes + edges) from FlowEditor into a
 * structured system prompt that drives Gemini Live through a deterministic
 * conversation script.
 */

import { Node, Edge } from '@xyflow/react';

export interface FlowData {
    nodes: Node[];
    edges: Edge[];
}

// ─── Graph traversal ────────────────────────────────────────────────────────

/**
 * Returns the ordered list of node IDs by walking the graph from the start
 * node, following edges. Branches are flattened in DFS order.
 */
function topoSort(nodes: Node[], edges: Edge[]): Node[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const outgoing = new Map<string, string[]>();

    for (const edge of edges) {
        const list = outgoing.get(edge.source) ?? [];
        // edges with a label carry a branch keyword
        list.push(edge.target);
        outgoing.set(edge.source, list);
    }

    const startNode = nodes.find(n => n.type === 'start') ?? nodes[0];
    if (!startNode) return [];

    const visited = new Set<string>();
    const ordered: Node[] = [];

    function dfs(id: string) {
        if (visited.has(id)) return;
        visited.add(id);
        const node = nodeMap.get(id);
        if (node) ordered.push(node);
        for (const next of (outgoing.get(id) ?? [])) {
            dfs(next);
        }
    }

    dfs(startNode.id);
    return ordered;
}

// ─── Label extraction ────────────────────────────────────────────────────────

function getRawText(node: Node): string {
    // PropertiesPanel stores clean text in data.text, fallback to label
    const raw = (node.data?.text as string) || (node.data?.label as string) || '';
    return raw
        .replace(/^Speak:\s*/i, '')
        .replace(/^Listen for:\s*/i, '')
        .trim();
}

function getBranches(node: Node): string[] {
    return (node.data?.options as string[]) || [];
}

// ─── Edge label helpers ──────────────────────────────────────────────────────

/**
 * For a given listen node, map each branch keyword to its destination node id.
 * Edges FROM a listen node may carry a label property (branch keyword).
 */
function getBranchEdges(nodeId: string, edges: Edge[]): Array<{ label: string; target: string }> {
    return edges
        .filter(e => e.source === nodeId && e.label)
        .map(e => ({ label: String(e.label), target: e.target }));
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Converts a FlowData graph into a structured system prompt.
 *
 * @param flowData  { nodes, edges } from useSimulationStore
 * @returns  A system instruction string ready for Gemini Live
 */
export function flowToPrompt(flowData: FlowData): string {
    const { nodes, edges } = flowData;
    if (!nodes || nodes.length === 0) {
        return 'You are a helpful voice assistant. Greet the user and have a natural conversation.';
    }

    const ordered = topoSort(nodes, edges);
    const stepLines: string[] = [];
    let stepNumber = 1;

    for (const node of ordered) {
        if (node.type === 'start') {
            stepLines.push(`STEP ${stepNumber} [START]: Begin the call. Do not speak yet — wait for the next instruction.`);
            stepNumber++;
            continue;
        }

        if (node.type === 'end') {
            stepLines.push(`STEP ${stepNumber} [END]: Politely say goodbye and end the conversation.`);
            stepNumber++;
            continue;
        }

        if (node.type === 'speak') {
            const text = getRawText(node);
            stepLines.push(`STEP ${stepNumber} [SPEAK]: Say exactly: "${text}"`);
            stepNumber++;
            continue;
        }

        if (node.type === 'listen') {
            const context = getRawText(node);
            const branches = getBranches(node);
            const branchEdges = getBranchEdges(node.id, edges);

            let line = `STEP ${stepNumber} [LISTEN]: Stop speaking and wait for the user to respond.`;
            if (context) line += ` Context: ${context}.`;

            if (branchEdges.length > 0) {
                line += ` Based on the user's response:`;
                for (const be of branchEdges) {
                    line += ` — If they say something related to "${be.label}", continue with the corresponding next step.`;
                }
                line += ` — Otherwise, continue with the default next step.`;
            } else if (branches.length > 0) {
                line += ` Possible expected responses: ${branches.join(', ')}.`;
            }

            stepLines.push(line);
            stepNumber++;
            continue;
        }
    }

    const script = stepLines.join('\n');

    return `You are a professional voice agent executing a strict conversation script. Follow these steps in exact order.

CONVERSATION SCRIPT:
${script}

CRITICAL RULES — YOU MUST FOLLOW THESE AT ALL TIMES:
1. Follow the SPEAK steps word for word. Do not add, remove, or paraphrase.
2. After a LISTEN step, wait silently for the user before continuing.
3. Do not skip steps.
4. Do not improvise outside the script.
5. If the user asks something off-topic, briefly acknowledge and redirect: "Let me continue with the reason for my call."
6. Keep a natural, professional, friendly tone — no robotic delivery.
7. When you reach the END step, say goodbye and stop.`;
}

// ─── Node tracking helper ────────────────────────────────────────────────────

/**
 * Given the current active node and a user transcript, returns the next node
 * to activate based on keyword matching in the flow edges.
 *
 * Returns null if no match found (stay on current node).
 */
export function advanceFlow(
    currentNodeId: string | null,
    userText: string,
    nodes: Node[],
    edges: Edge[]
): string | null {
    if (!currentNodeId) return null;

    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (!currentNode || currentNode.type !== 'listen') return null;

    const outEdges = edges.filter(e => e.source === currentNodeId);
    if (outEdges.length === 0) return null;

    const lowerText = userText.toLowerCase();

    // Try to find a labeled edge whose label appears in the transcript
    for (const edge of outEdges) {
        if (edge.label && lowerText.includes(String(edge.label).toLowerCase())) {
            return edge.target;
        }
    }

    // Also check node options
    const options = (currentNode.data?.options as string[]) || [];
    for (const option of options) {
        if (lowerText.includes(option.toLowerCase())) {
            // Find first matching outEdge or just first outEdge
            return outEdges[0]?.target ?? null;
        }
    }

    // Default: advance to first outgoing edge
    return outEdges[0]?.target ?? null;
}
