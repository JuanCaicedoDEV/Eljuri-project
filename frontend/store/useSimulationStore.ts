import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

// Re-export existing types
export interface SessionMetrics {
    duration: number;
    totalCost: number;
    tokenUsage: {
        input: number;
        output: number;
        total: number;
    };
    currentCPM: number;
    profitabilityStatus: 'PROFITABLE' | 'CRITICAL';
    messageCount?: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface FlowData {
    nodes: Node[];
    edges: Edge[];
}

// New: Individual session state
export interface SessionState {
    sessionId: string;
    campaignId: string;
    phoneNumber: string | null;
    status: 'active' | 'idle' | 'completed' | 'error';
    messages: ChatMessage[];
    metrics: SessionMetrics;
    isCallActive: boolean;
    agentType: 'prompt' | 'flow';
    systemPrompt: string;
    flowData: FlowData;
    activeNodeId: string | null;
    variables: Record<string, string>;
    startTime: string;
    endTime: string | null;
}

interface MultiSessionState {
    // Multi-session management
    sessions: Map<string, SessionState>;

    // Global configuration (for creating new sessions)
    defaultAgentType: 'prompt' | 'flow';
    defaultSystemPrompt: string;
    defaultFlowData: FlowData;
    expectedOutput: string;

    // Session actions
    createSession: (campaignId: string, phoneNumber?: string) => SessionState;
    getSession: (sessionId: string) => SessionState | undefined;
    removeSession: (sessionId: string) => void;
    getAllSessions: () => SessionState[];
    getSessionsByCampaign: (campaignId: string) => SessionState[];

    // Session-scoped actions
    addMessageToSession: (sessionId: string, message: ChatMessage) => void;
    setMetricsForSession: (sessionId: string, metrics: SessionMetrics) => void;
    setCallActiveForSession: (sessionId: string, active: boolean) => void;
    updateSessionStatus: (sessionId: string, status: SessionState['status']) => void;
    setActiveNodeForSession: (sessionId: string, nodeId: string | null) => void;
    setVariableForSession: (sessionId: string, key: string, value: string) => void;

    // Global configuration actions
    setDefaultAgentType: (type: 'prompt' | 'flow') => void;
    setDefaultSystemPrompt: (prompt: string) => void;
    setDefaultFlowData: (data: FlowData) => void;
    setExpectedOutput: (output: string) => void;

    // Legacy compatibility (operates on "current" session if only one exists)
    messages: ChatMessage[];
    metrics: SessionMetrics;
    isCallActive: boolean;
    agentType: 'prompt' | 'flow';
    systemPrompt: string;
    flowData: FlowData;
    activeNodeId: string | null;
    variables: Record<string, string>;

    setMetrics: (metrics: SessionMetrics) => void;
    addMessage: (message: ChatMessage) => void;
    setCallActive: (active: boolean) => void;
    setAgentType: (type: 'prompt' | 'flow') => void;
    setSystemPrompt: (prompt: string) => void;
    setFlowData: (data: FlowData) => void;
    setActiveNode: (nodeId: string | null) => void;
    setVariable: (key: string, value: string) => void;
    resetSimulation: () => void;
    clearFlowData: () => void;
}

const defaultMetrics: SessionMetrics = {
    duration: 0,
    totalCost: 0,
    tokenUsage: { input: 0, output: 0, total: 0 },
    currentCPM: 0,
    profitabilityStatus: 'PROFITABLE',
    messageCount: 0
};

export const useSimulationStore = create<MultiSessionState>((set, get) => ({
    // Multi-session state
    sessions: new Map(),

    // Global defaults
    defaultAgentType: 'prompt',
    defaultSystemPrompt: `Eres un Agente Virtual para el call center de Gainphone, representando a la marca "KIA ECUADOR". Tu objetivo es realizar una encuesta de satisfacción a clientes que visitaron un concesionario para cotizar un vehículo pero no lo compraron. Tu nombre es "Agente Virtual".

REGLAS GENERALES:
- ACTITUD Y ACENTO: Eres ecuatoriano. Habla con un acento ecuatoriano (preferiblemente serrano o quiteño) muy marcado pero profesional. Usa una entonación cálida y sutiles modismos ecuatorianos formales (ej. "claro que sí", "con gusto", "mi estimado") sin perder la formalidad del call center.
- Usa un tono amable, profesional y muy natural, como si fueras un humano.
- Ve al grano, haz una pregunta a la vez y espera la respuesta del cliente.
- NO LEAS los números de los pasos ni de las preguntas (ej. no digas "paso uno", ni "uno punto uno", ni "pregunta dos"). Dilas como una conversación normal.
- NO ofrezcas información que no tienes. Si el cliente pregunta algo fuera del guion, responde: "En este momento no tengo esa información, un asesor comercial se comunicará con usted."
- Solo puedes hablar con la persona que contesta para realizar la encuesta. 
- Si el cliente no quiere responder una pregunta, di: "Sus respuestas nos ayudan a mejorar nuestro servicio" y repite la pregunta UNA sola vez. Si aún no responde, continúa con la siguiente pregunta.
- Si el cliente pide reprogramar la llamada, pregúntale para cuándo y despídete amablemente: "Nos comunicaremos con usted el [Fecha/Día] a las [Hora], hasta luego."

GUION (Síguelo estrictamente paso a paso):

PASO 1 (Saludo):
"Buenos días/tardes. ¿Me comunico con el señor/señora? Mucho gusto, le saludo de KIA ECUADOR. Lo llamamos porque nos consta que cotizó un vehículo con nosotros y queremos hacerle una breve encuesta. ¿Nos regala un minutito por favor?"
- Si dice NO: "Gracias por su tiempo y que tenga una excelente jornada." (Termina la encuesta)
- Si dice SI: Continúa al PASO 2.

PASO 2 (Pregunta 1):
"Perfecto, muchas gracias. Cuénteme, ¿al final sí concretó la compra del vehículo KIA que cotizó?"
- Si dice NO u otra marca: Ve al PASO 3 (Pregunta 1.1).
- Si dice SI: Pregunta: "¿Cómo le va con su vehículo? ¿sigue en proceso de compra, ya le entregaron o aún no?" y sin importar la respuesta, TERMINA la encuesta despidiéndote.

PASO 3 (Pregunta 1.1):
"Entiendo. ¿Me podría comentar por qué no se concretó la compra con nosotros?"
- Escucha el motivo (por precio, por atención, crédito, etc).
- Si responde "Motivos personales": Pregunta "¿Puede indicarme cual fue el motivo personal que le impidió la compra?" y luego ve al PASO 4 (Pregunta 2).
- Si responde "Disponibilidad del vehículo": Pregunta "¿Cuál es el modelo que usted buscaba?" y luego ve al PASO 4 (Pregunta 2).
- Para cualquier otra respuesta: Ve al PASO 4 (Pregunta 2).

PASO 4 (Pregunta 2):
"¿Talvez usted compró otro vehículo de otra marca?"
- Si dice NO: Salta directamente al PASO 8 (Pregunta 6).
- Si dice SI: Ve al PASO 5 (Pregunta 3).

PASO 5 (Pregunta 3):
"¿El vehículo que adquirió es nuevo o usado?"
- Si dice Nuevo: OBTÉN ESTOS DATOS SECUENCIALMENTE: "¿Cuál es la marca de su vehículo?" -> "¿Qué tipo de vehículo es? (Suv, sedan, etc)" -> "¿Qué modelo es?" -> "¿Por qué razón se decidió por ese modelo?". Luego ve al PASO 8.
- Si dice Usado: OBTÉN ESTOS DATOS SECUENCIALMENTE: "¿Cuál es la marca de su vehículo?" -> "¿Qué tipo de vehículo adquirió?" -> "¿Qué modelo es?" -> "¿A quién o en qué lugar lo compró?". Luego ve al PASO 8.

PASO 8 (Pregunta 6):
"Volviendo a su visita en nuestro concesionario KIA, ¿le ofrecieron realizar una prueba de manejo?"
- Si dice SI: Ve al PASO 9 (Pregunta 7).
- Si dice NO: Ve al PASO 10 (Pregunta 8).

PASO 9 (Pregunta 7):
"¿Y sí realizó la prueba de manejo?"
- Al responder, ve al PASO 10 (Pregunta 8).

PASO 10 (Pregunta 8):
"¿Se presentó el jefe de agencia con usted en algún momento?"
- Espera respuesta y ve al PASO 11 (Pregunta 8.1).

PASO 11 (Pregunta 8.1):
"Finalmente, ¿cómo calificaría la atención que recibió por parte del asesor comercial, siendo 1 pésimo y 10 excelente?"
- Espera número.
- TERMINA la encuesta despidiéndote: "Muchas gracias por su tiempo y sus respuestas. Que tenga una excelente jornada. Hasta luego."`,
    defaultFlowData: { nodes: [], edges: [] },
    expectedOutput: `[
  { "field": "acepto_encuesta", "type": "boolean", "description": "¿El cliente aceptó realizar la encuesta en el paso 1?" },
  { "field": "concreto_compra_kia", "type": "boolean", "description": "¿Concretó la compra del vehículo KIA?" },
  { "field": "motivo_no_compra", "type": "string", "description": "Respuesta a la pregunta 1.1 (o 1.2 si sí compró)." },
  { "field": "compro_otro_vehiculo", "type": "boolean", "description": "¿Compró otro vehículo?" },
  { "field": "estado_otro_vehiculo", "type": "string", "description": "¿El otro vehículo es nuevo o usado?" },
  { "field": "marca_otro_vehiculo", "type": "string", "description": "Marca del otro vehículo adquirido." },
  { "field": "tipo_otro_vehiculo", "type": "string", "description": "Suv, sedan, camión, etc." },
  { "field": "ofrecieron_prueba_manejo", "type": "boolean", "description": "¿Le ofrecieron prueba de manejo?" },
  { "field": "realizo_prueba_manejo", "type": "boolean", "description": "¿Realizó la prueba de manejo?" },
  { "field": "presentacion_jefe_agencia", "type": "boolean", "description": "¿Se presentó el jefe de agencia?" },
  { "field": "calificacion_asesor", "type": "number", "description": "Calificación del asesor del 1 al 10." }
]`,

    // Session management
    createSession: (campaignId: string, phoneNumber?: string) => {
        const sessionId = `session-${campaignId}-${Date.now()}-${crypto.randomUUID().toString().substr(2, 9)}`;
        const newSession: SessionState = {
            sessionId,
            campaignId,
            phoneNumber: phoneNumber || null,
            status: 'idle',
            messages: [],
            metrics: { ...defaultMetrics },
            isCallActive: false,
            agentType: get().defaultAgentType,
            systemPrompt: get().defaultSystemPrompt,
            flowData: get().defaultFlowData,
            activeNodeId: null,
            variables: {},
            startTime: new Date().toISOString(),
            endTime: null
        };

        set(state => {
            const newSessions = new Map(state.sessions);
            newSessions.set(sessionId, newSession);
            return { sessions: newSessions };
        });

        return newSession;
    },

    getSession: (sessionId: string) => {
        return get().sessions.get(sessionId);
    },

    removeSession: (sessionId: string) => {
        set(state => {
            const newSessions = new Map(state.sessions);
            newSessions.delete(sessionId);
            return { sessions: newSessions };
        });
    },

    getAllSessions: () => {
        return Array.from(get().sessions.values());
    },

    getSessionsByCampaign: (campaignId: string) => {
        return Array.from(get().sessions.values())
            .filter(session => session.campaignId === campaignId);
    },

    // Session-scoped actions
    addMessageToSession: (sessionId: string, message: ChatMessage) => {
        set(state => {
            const newSessions = new Map(state.sessions);
            const session = newSessions.get(sessionId);
            if (session) {
                session.messages = [...session.messages, message];
                newSessions.set(sessionId, session);
            }
            return { sessions: newSessions };
        });
    },

    setMetricsForSession: (sessionId: string, metrics: SessionMetrics) => {
        set(state => {
            const newSessions = new Map(state.sessions);
            const session = newSessions.get(sessionId);
            if (session) {
                session.metrics = metrics;
                newSessions.set(sessionId, session);
            }
            return { sessions: newSessions };
        });
    },

    setCallActiveForSession: (sessionId: string, active: boolean) => {
        set(state => {
            const newSessions = new Map(state.sessions);
            const session = newSessions.get(sessionId);
            if (session) {
                session.isCallActive = active;
                session.status = active ? 'active' : 'idle';
                newSessions.set(sessionId, session);
            }
            return { sessions: newSessions };
        });
    },

    updateSessionStatus: (sessionId: string, status: SessionState['status']) => {
        set(state => {
            const newSessions = new Map(state.sessions);
            const session = newSessions.get(sessionId);
            if (session) {
                session.status = status;
                if (status === 'completed' || status === 'error') {
                    session.endTime = new Date().toISOString();
                }
                newSessions.set(sessionId, session);
            }
            return { sessions: newSessions };
        });
    },

    setActiveNodeForSession: (sessionId: string, nodeId: string | null) => {
        set(state => {
            const newSessions = new Map(state.sessions);
            const session = newSessions.get(sessionId);
            if (session) {
                session.activeNodeId = nodeId;
                newSessions.set(sessionId, session);
            }
            return { sessions: newSessions };
        });
    },

    setVariableForSession: (sessionId: string, key: string, value: string) => {
        set(state => {
            const newSessions = new Map(state.sessions);
            const session = newSessions.get(sessionId);
            if (session) {
                session.variables = { ...session.variables, [key]: value };
                newSessions.set(sessionId, session);
            }
            return { sessions: newSessions };
        });
    },

    // Global configuration actions
    setDefaultAgentType: (type) => set({ defaultAgentType: type }),
    setDefaultSystemPrompt: (prompt) => set({ defaultSystemPrompt: prompt }),
    setDefaultFlowData: (data) => set({ defaultFlowData: data }),
    setExpectedOutput: (output) => set({ expectedOutput: output }),

    // Legacy compatibility - operates on first session or creates one
    get messages() {
        const sessions = get().getAllSessions();
        return sessions[0]?.messages || [];
    },

    get metrics() {
        const sessions = get().getAllSessions();
        return sessions[0]?.metrics || defaultMetrics;
    },

    get isCallActive() {
        const sessions = get().getAllSessions();
        return sessions[0]?.isCallActive || false;
    },

    get agentType() {
        return get().defaultAgentType;
    },

    get systemPrompt() {
        return get().defaultSystemPrompt;
    },

    get flowData() {
        return get().defaultFlowData;
    },

    get activeNodeId() {
        const sessions = get().getAllSessions();
        return sessions[0]?.activeNodeId || null;
    },

    get variables() {
        const sessions = get().getAllSessions();
        return sessions[0]?.variables || {};
    },

    setMetrics: (metrics) => {
        const sessions = get().getAllSessions();
        if (sessions[0]) {
            get().setMetricsForSession(sessions[0].sessionId, metrics);
        }
    },

    addMessage: (message) => {
        const sessions = get().getAllSessions();
        if (sessions[0]) {
            get().addMessageToSession(sessions[0].sessionId, message);
        }
    },

    setCallActive: (active) => {
        const sessions = get().getAllSessions();
        if (sessions[0]) {
            get().setCallActiveForSession(sessions[0].sessionId, active);
        }
    },

    setAgentType: (type) => set({ defaultAgentType: type }),
    setSystemPrompt: (prompt) => set({ defaultSystemPrompt: prompt }),
    setFlowData: (data) => set({ defaultFlowData: data }),

    setActiveNode: (nodeId) => {
        const sessions = get().getAllSessions();
        if (sessions[0]) {
            get().setActiveNodeForSession(sessions[0].sessionId, nodeId);
        }
    },

    setVariable: (key, value) => {
        const sessions = get().getAllSessions();
        if (sessions[0]) {
            get().setVariableForSession(sessions[0].sessionId, key, value);
        }
    },

    resetSimulation: () => {
        const sessions = get().getAllSessions();
        if (sessions[0]) {
            get().removeSession(sessions[0].sessionId);
        }
    },

    clearFlowData: () => {
        set({
            defaultFlowData: { nodes: [], edges: [] },
            defaultSystemPrompt: '',
        });
    }
}));
