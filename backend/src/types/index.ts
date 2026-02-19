export interface SessionMetrics {
  duration: number; // in seconds
  totalCost: number; // in USD
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  currentCPM: number; // Cost Per Minute
  profitabilityStatus: 'PROFITABLE' | 'CRITICAL';
}

export interface LineIdentity {
  id: string;
  brand: string;
  phoneNumber: string;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SimulationState {
  metrics: SessionMetrics;
  messages: ChatMessage[];
  isCallActive: boolean;
}
