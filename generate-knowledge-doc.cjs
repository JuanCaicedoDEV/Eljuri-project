const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    Header, Footer, AlignmentType, LevelFormat,
    HeadingLevel, BorderStyle, WidthType, ShadingType,
    PageNumber, PageBreak } = require('docx');
const fs = require('fs');

// Page dimensions
const PAGE_WIDTH = 12240; // US Letter
const PAGE_HEIGHT = 15840;
const MARGIN = 1440; // 1 inch
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN; // 9360

// Borders
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// Colors
const DARK_BG = "1A1A2E";
const ACCENT = "0F3460";
const LIGHT_BG = "F0F4F8";
const HEADER_BG = "0F3460";
const PILLAR_BG = "E8F0FE";

const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

// Helper: Create a label-value row for a 2-column table
function infoRow(label, value, labelWidth = 2800, valueWidth = CONTENT_WIDTH - 2800) {
    return new TableRow({
        children: [
            new TableCell({
                borders,
                width: { size: labelWidth, type: WidthType.DXA },
                shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
                margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, font: "Arial" })] })]
            }),
            new TableCell({
                borders,
                width: { size: valueWidth, type: WidthType.DXA },
                margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, font: "Arial" })] })]
            })
        ]
    });
}

// Helper: Section heading
function sectionHeading(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 120 },
        children: [new TextRun({ text, bold: true, size: 28, font: "Arial", color: ACCENT })]
    });
}

// Helper: Pillar header
function pillarHeader(number, title) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 480, after: 200 },
        children: [
            new TextRun({ text: `PILLAR ${number} `, bold: true, size: 36, font: "Arial", color: ACCENT }),
            new TextRun({ text: `\u2014 ${title}`, bold: true, size: 36, font: "Arial", color: "333333" })
        ]
    });
}

// Helper: Question label
function questionLabel(text) {
    return new Paragraph({
        spacing: { before: 200, after: 60 },
        children: [new TextRun({ text, bold: true, italics: true, size: 22, font: "Arial", color: "555555" })]
    });
}

// Helper: Bullet list item
function bullet(text, ref = "bullets") {
    return new Paragraph({
        numbering: { reference: ref, level: 0 },
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text, size: 20, font: "Arial" })]
    });
}

// Helper: Multi-line answer
function answerParagraph(text) {
    return new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [new TextRun({ text, size: 20, font: "Arial" })]
    });
}

// Helper: Separator line
function separator() {
    return new Paragraph({
        spacing: { before: 120, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD", space: 8 } },
        children: [new TextRun({ text: "", size: 4 })]
    });
}

// ========== BUILD DOCUMENT ==========

const doc = new Document({
    styles: {
        default: { document: { run: { font: "Arial", size: 22 } } },
        paragraphStyles: [
            { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 36, bold: true, font: "Arial", color: ACCENT },
                paragraph: { spacing: { before: 480, after: 200 }, outlineLevel: 0 } },
            { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 28, bold: true, font: "Arial", color: ACCENT },
                paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 1 } },
        ]
    },
    numbering: {
        config: [
            { reference: "bullets",
                levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
            { reference: "numbers",
                levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        ]
    },
    sections: [{
        properties: {
            page: {
                size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
                margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
            }
        },
        headers: {
            default: new Header({
                children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                        new TextRun({ text: "CONFIDENTIAL ", bold: true, size: 16, font: "Arial", color: "999999" }),
                        new TextRun({ text: "\u2014 Internal Use Only", size: 16, font: "Arial", color: "999999" })
                    ]
                })]
            })
        },
        footers: {
            default: new Footer({
                children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: "Affila Group ", size: 16, font: "Arial", color: "999999" }),
                        new TextRun({ text: "| Page ", size: 16, font: "Arial", color: "999999" }),
                        new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Arial", color: "999999" })
                    ]
                })]
            })
        },
        children: [
            // ========== TITLE PAGE ==========
            new Paragraph({ spacing: { before: 2400 }, children: [] }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
                children: [new TextRun({ text: "AI SOLUTION", size: 56, bold: true, font: "Arial", color: ACCENT })]
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 480 },
                children: [new TextRun({ text: "KNOWLEDGE CAPTURE", size: 56, bold: true, font: "Arial", color: DARK_BG })]
            }),
            separator(),

            // Meta info table
            new Table({
                width: { size: 6000, type: WidthType.DXA },
                columnWidths: [2400, 3600],
                alignment: AlignmentType.CENTER,
                rows: [
                    infoRow("Author(s)", "Affila Group", 2400, 3600),
                    infoRow("Date", "02/26/2026", 2400, 3600),
                    infoRow("Client / Project", "ElJuri / Gainphone Servicios", 2400, 3600),
                    infoRow("Solution Name", "AI Calling Assistant (KIA Ecuador Survey Agent)", 2400, 3600),
                    infoRow("Repo / Drive Link", "eljuri-voice-simulator (private repo)", 2400, 3600),
                ]
            }),

            new Paragraph({ spacing: { before: 600 }, children: [] }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Developed by Affila Technology", size: 18, italics: true, font: "Arial", color: "888888" })]
            }),

            // ========== PAGE BREAK ==========
            new Paragraph({ children: [new PageBreak()] }),

            // ===================================================================
            // PILLAR 1 - WHAT YOU BUILT
            // ===================================================================
            pillarHeader("1", "WHAT YOU BUILT"),
            answerParagraph("The actual solution: models, tools, architecture, and code."),
            separator(),

            // What does it do?
            questionLabel("What does it do?"),
            answerParagraph("A real-time AI-powered virtual calling agent that conducts customer satisfaction surveys over phone calls for KIA Ecuador dealerships. The system:"),
            bullet("Calls customers who visited a KIA concesionario to quote a vehicle but did not purchase"),
            bullet("Conducts a structured, multi-branch survey following a strict question script in Spanish"),
            bullet("Uses native audio-to-audio streaming (voice in, voice out) with an Ecuadorian accent"),
            bullet("Automatically extracts structured data from call transcripts using AI"),
            bullet("Manages multiple concurrent sessions with per-session cost tracking and budget ceilings"),
            bullet("Provides a visual flow editor (drag-and-drop) to design conversation paths"),

            separator(),

            // AI Models Used
            questionLabel("AI Models Used"),
            new Table({
                width: { size: CONTENT_WIDTH, type: WidthType.DXA },
                columnWidths: [3200, 3200, 2960],
                rows: [
                    new TableRow({ children: [
                        new TableCell({ borders, width: { size: 3200, type: WidthType.DXA }, shading: { fill: HEADER_BG, type: ShadingType.CLEAR }, margins: cellMargins,
                            children: [new Paragraph({ children: [new TextRun({ text: "Model", bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })] }),
                        new TableCell({ borders, width: { size: 3200, type: WidthType.DXA }, shading: { fill: HEADER_BG, type: ShadingType.CLEAR }, margins: cellMargins,
                            children: [new Paragraph({ children: [new TextRun({ text: "Purpose", bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })] }),
                        new TableCell({ borders, width: { size: 2960, type: WidthType.DXA }, shading: { fill: HEADER_BG, type: ShadingType.CLEAR }, margins: cellMargins,
                            children: [new Paragraph({ children: [new TextRun({ text: "Access Method", bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })] }),
                    ] }),
                    new TableRow({ children: [
                        new TableCell({ borders, width: { size: 3200, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Gemini 2.5 Flash Native Audio Preview", size: 20, font: "Arial" })] })] }),
                        new TableCell({ borders, width: { size: 3200, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Real-time bidirectional voice conversation (audio-in / audio-out via WebSocket)", size: 20, font: "Arial" })] })] }),
                        new TableCell({ borders, width: { size: 2960, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Google AI v1alpha WebSocket (raw ws library)", size: 20, font: "Arial" })] })] }),
                    ] }),
                    new TableRow({ children: [
                        new TableCell({ borders, width: { size: 3200, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Gemini 2.0 Flash Exp", size: 20, font: "Arial" })] })] }),
                        new TableCell({ borders, width: { size: 3200, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Semantic matching of user spoken input to survey answer options in the flow engine", size: 20, font: "Arial" })] })] }),
                        new TableCell({ borders, width: { size: 2960, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "@google/generative-ai SDK", size: 20, font: "Arial" })] })] }),
                    ] }),
                    new TableRow({ children: [
                        new TableCell({ borders, width: { size: 3200, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Gemini 2.5 Flash", size: 20, font: "Arial" })] })] }),
                        new TableCell({ borders, width: { size: 3200, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Post-call structured data extraction from conversation transcript", size: 20, font: "Arial" })] })] }),
                        new TableCell({ borders, width: { size: 2960, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "@google/generative-ai SDK", size: 20, font: "Arial" })] })] }),
                    ] }),
                ]
            }),

            separator(),

            // Key Tech Stack
            questionLabel("Key Tech Stack"),
            new Table({
                width: { size: CONTENT_WIDTH, type: WidthType.DXA },
                columnWidths: [2800, 6560],
                rows: [
                    new TableRow({ children: [
                        new TableCell({ borders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: HEADER_BG, type: ShadingType.CLEAR }, margins: cellMargins,
                            children: [new Paragraph({ children: [new TextRun({ text: "Layer", bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })] }),
                        new TableCell({ borders, width: { size: 6560, type: WidthType.DXA }, shading: { fill: HEADER_BG, type: ShadingType.CLEAR }, margins: cellMargins,
                            children: [new Paragraph({ children: [new TextRun({ text: "Technologies", bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })] }),
                    ] }),
                    new TableRow({ children: [
                        new TableCell({ borders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: LIGHT_BG, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Languages", bold: true, size: 20, font: "Arial" })] })] }),
                        new TableCell({ borders, width: { size: 6560, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "TypeScript (backend + frontend)", size: 20, font: "Arial" })] })] }),
                    ] }),
                    new TableRow({ children: [
                        new TableCell({ borders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: LIGHT_BG, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Backend", bold: true, size: 20, font: "Arial" })] })] }),
                        new TableCell({ borders, width: { size: 6560, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Node.js, Express 5, Socket.IO 4, WebSocket (ws library), tsx runner", size: 20, font: "Arial" })] })] }),
                    ] }),
                    new TableRow({ children: [
                        new TableCell({ borders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: LIGHT_BG, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Frontend", bold: true, size: 20, font: "Arial" })] })] }),
                        new TableCell({ borders, width: { size: 6560, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Next.js 16, React 19, Tailwind CSS 4, shadcn/ui (Radix), Zustand 5, Framer Motion 12, React Flow (XYFlow), Recharts 3", size: 20, font: "Arial" })] })] }),
                    ] }),
                    new TableRow({ children: [
                        new TableCell({ borders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: LIGHT_BG, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Audio", bold: true, size: 20, font: "Arial" })] })] }),
                        new TableCell({ borders, width: { size: 6560, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Web Audio API (AudioWorklet), PCM16 @ 24kHz mono, browser MediaDevices API", size: 20, font: "Arial" })] })] }),
                    ] }),
                    new TableRow({ children: [
                        new TableCell({ borders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: LIGHT_BG, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "AI APIs", bold: true, size: 20, font: "Arial" })] })] }),
                        new TableCell({ borders, width: { size: 6560, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Google Generative AI (@google/genai, @google/generative-ai), Google Cloud Speech-to-Text, Google Cloud Text-to-Speech, OpenAI SDK (available but not primary)", size: 20, font: "Arial" })] })] }),
                    ] }),
                    new TableRow({ children: [
                        new TableCell({ borders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: LIGHT_BG, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Testing", bold: true, size: 20, font: "Arial" })] })] }),
                        new TableCell({ borders, width: { size: 6560, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Vitest 4, Testing Library (React), Supertest", size: 20, font: "Arial" })] })] }),
                    ] }),
                ]
            }),

            separator(),

            // How is it deployed?
            questionLabel("How is it deployed?"),
            answerParagraph("Currently deployed as a local development setup with tunnel capability (ngrok/localtunnel) for remote testing with the client in Ecuador. Backend runs on Node.js with tsx on port 3008. Frontend runs via Next.js dev server. Production deployment was planned for Railway or Render but was in pilot phase at engagement end."),

            separator(),

            // System Prompt(s)
            questionLabel("System Prompt(s)"),
            answerParagraph("The primary system prompt lives in frontend/store/useSimulationStore.ts as defaultSystemPrompt. It defines:"),
            bullet("The agent identity: Virtual Agent for Gainphone call center, representing KIA ECUADOR"),
            bullet("Ecuadorian accent (Sierra/Quito) with formal colloquialisms"),
            bullet("Strict step-by-step survey script (11 steps) with branching logic"),
            bullet("Rules: one question at a time, no step numbers read aloud, brevity enforced"),
            answerParagraph("A second brevity layer is injected by GeminiLiveAgent.ts at connection time (BREVITY_RULES), forcing responses to max 1 short sentence per turn to prevent audio buffer saturation."),
            answerParagraph("Full system prompt text is ~60 lines of Spanish instructions. See useSimulationStore.ts lines 116-173."),

            separator(),

            // Data Sources
            questionLabel("Data Sources"),
            answerParagraph("The client provided a PDF document (Piloto Agente Virtual) containing:"),
            bullet("Complete survey script with all question branches (8+ main questions, sub-questions)"),
            bullet("Contact classification tree (3-level: Contact/Response/Sub-Response)"),
            bullet("Customer database schema with channel-specific logic (SHOWROOM vs other channels)"),
            bullet("KIA vehicle model catalog (20+ models)"),
            answerParagraph("Sensitivity: Customer PII (names, phone numbers, vehicle purchase intent). Data stays in-memory during sessions; no persistent database in pilot phase."),

            separator(),

            // How to run it locally
            questionLabel("How to run it locally"),
            new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Clone the repository", size: 20, font: "Arial" })] }),
            new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Backend: cd backend && npm install", size: 20, font: "Arial" })] }),
            new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Create backend/.env with: GOOGLE_API_KEY=<your key>, PORT=3008, MAX_BUDGET_USD=0.50, VOICE_SIMULATOR_API_KEY=<any secure key>", size: 20, font: "Arial" })] }),
            new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Start backend: npm run dev (runs tsx watch src/server.ts)", size: 20, font: "Arial" })] }),
            new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Frontend: cd frontend && npm install", size: 20, font: "Arial" })] }),
            new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Create frontend/.env.local with: NEXT_PUBLIC_VOICE_SIMULATOR_API_KEY=<same key as backend>", size: 20, font: "Arial" })] }),
            new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Start frontend: npm run dev (Next.js dev server on port 3000)", size: 20, font: "Arial" })] }),
            new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Open http://localhost:3000, select a line, and click to start a live voice session", size: 20, font: "Arial" })] }),

            // ========== PAGE BREAK ==========
            new Paragraph({ children: [new PageBreak()] }),

            // ===================================================================
            // PILLAR 2 - HOW YOU THOUGHT ABOUT IT
            // ===================================================================
            pillarHeader("2", "HOW YOU THOUGHT ABOUT IT"),
            answerParagraph("The reasoning behind your decisions \u2014 this is the hardest knowledge to replace."),
            separator(),

            questionLabel("Why these models/tools?"),
            bullet("Gemini 2.5 Flash Native Audio Preview chosen for true audio-to-audio streaming (no separate STT/TTS pipeline). This eliminates latency from transcription round-trips and allows natural voice quality with accent control via system prompt."),
            bullet("Considered: OpenAI Realtime API (too expensive at scale, less accent control for Spanish), AWS Polly + Lex (too rigid for dynamic survey branching), Vonage/Twilio + separate LLM (added latency)."),
            bullet("Google AI chosen over competitors because the client (ElJuri/Gainphone) already uses Google Cloud, reducing procurement friction."),
            bullet("Next.js 16 + React 19 for the frontend simulator dashboard to enable rapid iteration with hot reload and server components where needed."),
            bullet("React Flow (XYFlow) for the visual flow editor: allows non-technical users to design conversation trees by drag-and-drop. Considered building custom canvas but React Flow is well-maintained."),

            separator(),

            questionLabel("What didn't work?"),
            bullet("Initial attempt with Google Cloud Speech-to-Text + Text-to-Speech as separate services: Added 2-3 seconds of latency per turn, making the conversation feel unnatural. Abandoned for native audio model."),
            bullet("maxOutputTokens parameter in Gemini Live setup: Setting token limits caused responses to cut off mid-sentence. Removed and replaced with system prompt brevity rules instead."),
            bullet("Client-side budget control: Initially let the frontend send maxBudgetUSD. Security audit revealed a malicious user could bypass it. Moved to server-side enforcement."),
            bullet("Legacy text chat endpoint: Was initially implemented but created unbounded costs when left open. Completely deprecated in favor of Live mode only."),

            separator(),

            questionLabel("Key tradeoffs made"),
            bullet("Speed vs Cost: Native audio streaming is more expensive per token but drastically reduces perceived latency (sub-second vs 3-4 second round trips)."),
            bullet("Simplicity vs Persistence: No database in pilot phase. All sessions are in-memory. This was deliberate to reduce setup complexity for the pilot, but means data is lost on restart."),
            bullet("Accent quality vs Control: Using system prompt for accent means it's model-dependent. A dedicated TTS service would give more consistent accents, but adds latency."),
            bullet("Budget ceiling ($0.50/session default) vs Conversation length: Short budget limits can cut off longer surveys. This is configurable via environment variable."),

            separator(),

            questionLabel("Biggest risks / failure modes"),
            bullet("Billing exhaustion: If authentication is bypassed or budget ceiling removed, each WebSocket connection opens a streaming session to Gemini API that costs ~$3-12/million tokens."),
            bullet("WebSocket zombie connections: If client disconnects without clean close, the Gemini Live session stays open consuming quota. Mitigated with cleanup on ws.close but no heartbeat/ping-pong implemented."),
            bullet("Prompt injection: User could speak instructions that override the survey script. No guardrails beyond the system prompt brevity rules."),
            bullet("Audio buffer saturation: If Gemini generates long responses, the audio buffer on the frontend can desync. Mitigated by brevity rules and client-side playback scheduling."),

            separator(),

            questionLabel("Security decisions made"),
            bullet("WebSocket API key authentication: Implemented handshake-level auth on the /voice/live upgrade path. Connection rejected with 401 before WebSocket upgrade if key doesn't match."),
            bullet("Server-side budget enforcement: MAX_BUDGET_USD is read from environment variables only, never from client input."),
            bullet("CORS remains permissive (origin: '*') for pilot flexibility. MUST be restricted for production."),
            bullet("No input validation library (zod/joi) implemented yet. Recommended in security audit."),
            bullet("Full security audit and remediation reports documented in repository root."),

            // ========== PAGE BREAK ==========
            new Paragraph({ children: [new PageBreak()] }),

            // ===================================================================
            // PILLAR 3 - WHAT YOU LEARNED
            // ===================================================================
            pillarHeader("3", "WHAT YOU LEARNED"),
            answerParagraph("Your broader expertise and lessons \u2014 the knowledge that only comes from doing the work."),
            separator(),

            questionLabel("What worked well?"),
            bullet("Native audio streaming with Gemini: The voice quality and natural conversation flow far exceeded what was achievable with separate STT+LLM+TTS pipelines."),
            bullet("System prompt as the primary control mechanism: Accent, brevity, and conversation flow are all controlled through prompt engineering, making iteration fast without code changes."),
            bullet("Multi-session architecture: Designing the frontend store (Zustand) around a Map<sessionId, SessionState> pattern made it straightforward to support concurrent calls."),
            bullet("Visual flow editor: Even though the live mode (prompt-based) became the primary approach, having the flow editor helped communicate the conversation structure to the client."),

            separator(),

            questionLabel("What would you do differently?"),
            bullet("Add a persistent database from day one (even SQLite). Losing session data on restart made demos harder."),
            bullet("Implement ping/pong heartbeat on WebSocket immediately. Zombie connections were a real problem during testing."),
            bullet("Use Zod for runtime validation of all API inputs from the start."),
            bullet("Build automated end-to-end tests for the voice pipeline earlier. Manual testing was slow and costly."),
            bullet("Consider a telephony integration (Twilio/Vonage SIP trunk) earlier in the project to bridge the gap between simulator and real phone calls."),

            separator(),

            questionLabel("Biggest surprise"),
            answerParagraph("The Gemini Live API in v1alpha required manual WebSocket management with raw JSON frames. The official SDK's Live session handling was not production-ready for the preview model at the time, so we had to bypass it and use the 'ws' library directly. This added significant complexity but was the only way to access the native audio preview model."),
            answerParagraph("Also surprising: maxOutputTokens in Gemini Live cuts audio mid-word, not at sentence boundaries. Brevity must be controlled via system prompt, not token limits."),

            separator(),

            questionLabel("Reusable assets"),
            bullet("GeminiLiveAgent.ts: Drop-in WebSocket wrapper for Gemini 2.5 Flash Native Audio Preview with cost tracking, budget ceilings, and event-based architecture."),
            bullet("VoiceLiveClient.ts: Browser-side WebSocket client with AudioWorklet for real-time PCM16 audio capture and playback at 24kHz."),
            bullet("Brevity rules system prompt pattern (REGLA MAS IMPORTANTE): Reusable for any voice AI that tends to be verbose."),
            bullet("Security patterns: WebSocket handshake authentication and server-side budget enforcement."),
            bullet("The extraction route pattern: Post-call AI-powered structured data extraction from transcripts using a user-defined JSON schema."),

            separator(),

            questionLabel("Recommended reading"),
            bullet("Google AI Gemini Live API docs: https://ai.google.dev/api/multimodal-live"),
            bullet("Web Audio API AudioWorklet: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet"),
            bullet("React Flow docs: https://reactflow.dev/"),
            bullet("Client's spec document: Piloto Agente Virtual (Affila - Gainphone Servicios)_01012025.pdf in repo root"),

            // ========== PAGE BREAK ==========
            new Paragraph({ children: [new PageBreak()] }),

            // ===================================================================
            // HANDOVER & MAINTENANCE
            // ===================================================================
            pillarHeader("", "HANDOVER & MAINTENANCE"),
            answerParagraph("So nothing falls through the cracks when ownership changes."),
            separator(),

            questionLabel("Who owns this going forward?"),
            answerParagraph("Gainphone Servicios / ElJuri Group (client-side). Affila Group retains advisory capacity."),

            separator(),

            questionLabel("Ongoing maintenance needed?"),
            bullet("GOOGLE_API_KEY rotation: The key should be rotated periodically and stored in a secrets manager for production."),
            bullet("Model version updates: Gemini 2.5 Flash Native Audio Preview is a preview model. When it moves to GA, the model string in GeminiLiveAgent.ts (line 37) must be updated."),
            bullet("System prompt updates: Survey questions or branching logic changes require updating the defaultSystemPrompt in useSimulationStore.ts."),
            bullet("Budget monitoring: Track actual per-session costs and adjust MAX_BUDGET_USD as needed."),
            bullet("Security audit follow-ups: CORS restriction, input validation (zod), and ping/pong heartbeat are still pending."),

            separator(),

            questionLabel("What should the next owner do first?"),
            new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Read the security_audit_report.md and remediation_report.md in the repo root to understand the security posture.", size: 20, font: "Arial" })] }),
            new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Run the application locally following the setup steps above and test a live voice session end-to-end.", size: 20, font: "Arial" })] }),
            new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Review the system prompt in useSimulationStore.ts to understand the current survey flow and plan any modifications.", size: 20, font: "Arial" })] }),

            separator(),

            questionLabel("Known future improvements"),
            bullet("Telephony integration: Connect to Twilio/Vonage SIP trunk for real outbound calling instead of browser-only simulation."),
            bullet("Persistent storage: Add PostgreSQL or Supabase for session data, call logs, and extracted survey results."),
            bullet("Call recording & playback: Store audio for QA review."),
            bullet("SHOWROOM channel logic: The PDF spec defines different question paths for SHOWROOM vs other channels. Only SHOWROOM is fully implemented."),
            bullet("Batch calling: UI for uploading customer CSV and queuing automatic outbound calls."),
            bullet("Analytics dashboard: Charts for survey completion rates, response distributions, and agent performance over time."),
            bullet("Production deployment to Railway/Render/GCP with proper CORS, SSL, and secrets management."),

            separator(),
            separator(),

            // Signatures
            new Table({
                width: { size: CONTENT_WIDTH, type: WidthType.DXA },
                columnWidths: [CONTENT_WIDTH / 2, CONTENT_WIDTH / 2],
                rows: [
                    new TableRow({ children: [
                        new TableCell({ borders: noBorders, width: { size: CONTENT_WIDTH / 2, type: WidthType.DXA }, margins: cellMargins,
                            children: [
                                new Paragraph({ children: [new TextRun({ text: "Completed by:", bold: true, size: 20, font: "Arial", color: "666666" })] }),
                                new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: "Affila Group", size: 20, font: "Arial" })] }),
                            ]
                        }),
                        new TableCell({ borders: noBorders, width: { size: CONTENT_WIDTH / 2, type: WidthType.DXA }, margins: cellMargins,
                            children: [
                                new Paragraph({ children: [new TextRun({ text: "Date:", bold: true, size: 20, font: "Arial", color: "666666" })] }),
                                new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: "02/26/2026", size: 20, font: "Arial" })] }),
                            ]
                        }),
                    ] }),
                    new TableRow({ children: [
                        new TableCell({ borders: noBorders, width: { size: CONTENT_WIDTH / 2, type: WidthType.DXA }, margins: cellMargins,
                            children: [
                                new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "Reviewed by:", bold: true, size: 20, font: "Arial", color: "666666" })] }),
                                new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: "______________________", size: 20, font: "Arial" })] }),
                            ]
                        }),
                        new TableCell({ borders: noBorders, width: { size: CONTENT_WIDTH / 2, type: WidthType.DXA }, margins: cellMargins,
                            children: [
                                new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "Stored in Drive:", bold: true, size: 20, font: "Arial", color: "666666" })] }),
                                new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: "______________________", size: 20, font: "Arial" })] }),
                            ]
                        }),
                    ] }),
                ]
            }),

            new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Confidential \u2014 Internal Use Only", bold: true, italics: true, size: 18, font: "Arial", color: "999999" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Store completed documents in the company Google Drive Knowledge Repository.", size: 18, font: "Arial", color: "999999" })] }),
        ]
    }]
});

// Generate
Packer.toBuffer(doc).then(buffer => {
    const outputPath = __dirname + '/ElJuri_AI_Calling_Assistant_Knowledge_Capture.docx';
    fs.writeFileSync(outputPath, buffer);
    console.log(`Document created: ${outputPath}`);
}).catch(err => {
    console.error('Error generating document:', err);
    process.exit(1);
});
