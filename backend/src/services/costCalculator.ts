import type { SessionMetrics } from '../types/index.js';

export class CostEngine {
    private static readonly PROFITABILITY_THRESHOLD = 0.045; // USD/min

    // Simulated costs (representative of Twilio + Google Stack)
    private static readonly TELEPHONY_COST_PER_MIN = 0.01;
    private static readonly STT_COST_PER_MIN = 0.005;
    private static readonly TOKEN_COST_INPUT = 0.00001; // per token
    private static readonly TOKEN_COST_OUTPUT = 0.00003; // per token

    public static calculateMetrics(
        previousMetrics: SessionMetrics,
        inputTokens: number,
        outputTokens: number,
        additionalDurationSec: number
    ): SessionMetrics {
        const newDuration = previousMetrics.duration + additionalDurationSec;

        // Calculate new costs
        const tokenCosts = (inputTokens * this.TOKEN_COST_INPUT) + (outputTokens * this.TOKEN_COST_OUTPUT);
        const timeBasedCosts = (additionalDurationSec / 60) * (this.TELEPHONY_COST_PER_MIN + this.STT_COST_PER_MIN);

        const newTotalCost = previousMetrics.totalCost + tokenCosts + timeBasedCosts;
        const newCurrentCPM = newDuration > 0 ? (newTotalCost / (newDuration / 60)) : 0;

        const profitabilityStatus = newCurrentCPM > this.PROFITABILITY_THRESHOLD ? 'CRITICAL' : 'PROFITABLE';

        return {
            duration: newDuration,
            totalCost: parseFloat(newTotalCost.toFixed(4)),
            tokenUsage: {
                input: previousMetrics.tokenUsage.input + inputTokens,
                output: previousMetrics.tokenUsage.output + outputTokens,
                total: previousMetrics.tokenUsage.total + inputTokens + outputTokens,
            },
            currentCPM: parseFloat(newCurrentCPM.toFixed(4)),
            profitabilityStatus,
        };
    }
}
