# Security Audit Report

This report outlines the security findings after reviewing the core files of the Eljuri Voice Simulator (`server.ts`, `GeminiLiveAgent.ts`, `VoiceLiveClient.ts`, and `flowToPrompt.ts`).

## Executive Summary
Overall, the architectural approach to handling Gemini's Live API is functional, but there are several critical security concerns primarily around **lack of authentication**, **unrestricted WebSocket access**, **Denial of Service (DoS) vulnerability via cost exhaustion**, and **input validation**.

## Findings & Vulnerabilities

### 1. [CRITICAL] Unauthenticated WebSocket Access (`server.ts`)
**Location:** `/voice/live` endpoint in `server.ts`
**Issue:** Any client can connect to the `/voice/live` WebSocket endpoint. There is no session validation, authentication token checking, or API key requirement on the client side before establishing the connection.
**Impact:** Malicious actors can directly connect to the WebSocket and trigger the backend to open costly connections with the Gemini API, leading to a massive financial Denial of Service (Billing Exhaustion).

### 2. [HIGH] Lack of Rate Limiting and Cost Controls at the Gateway (`server.ts`)
**Location:** `server.ts` WebSocket connection handler
**Issue:** While `GeminiLiveAgent.ts` implements a `maxBudgetUSD` to disconnect a session if it gets too expensive, the *client* dictates this budget during the `config` message. 
```typescript
// server.ts
agent = createGeminiLiveAgent({
    // ...
    maxBudgetUSD: msg.maxBudgetUSD // Client can simply omit this or set it to $1,000,000
});
```
**Impact:** A malicious client can bypass the budget constraint by not sending it, or sending an arbitrarily high number, resulting in unbounded API costs.

### 3. [MEDIUM] CORS Configuration is Too Permissive (`server.ts`)
**Location:** `app.use(cors());` and `io` initialization.
**Issue:** The Express app and Socket.IO servers are configured to accept requests from any origin (`origin: '*'*`).
**Impact:** If this application is deployed to production, any website on the internet can make requests to this backend on behalf of a user's browser (CSRF risks, though mitigated if no cookies are used, still a bad practice for APIs).

### 4. [MEDIUM] Unvalidated Inputs on REST API and WebSocket (`server.ts`, `VoiceLiveClient.ts`)
**Location:** `/api/phone-numbers`, `/api/sessions`, WebSocket message handler
**Issue:** The REST endpoints do not explicitly validate `req.body` structure or types before passing them to internal managers. Similarly, the WebSocket message parser assumes `msg.text` or `msg.voiceName` are safe strings without sanitization.
**Impact:** Potential for NoSQL injection (if the underlying managers use MongoDB without sanitation), unexpected Application Crashes, or Server-Side Prototype Pollution depending on how `req.body` is merged.

### 5. [LOW] Potential Memory Leak on WebSocket Disconnect (`server.ts`)
**Location:** WebSocket `close` event handler.
**Issue:** If a client disconnects unexpectedly or the network drops without triggering a clean `close` frame, the connection might hang, keeping the `GeminiLiveAgent` active. While WS has a ping/pong mechanism, it's not explicitly handled here to drop dead connections.
**Impact:** Gradual memory exhaustion and zombie connections eating up Gemini API quotas.

---

## Recommended Remediation Plan

1. **Implement Authentication:** Add intermediate middleware (e.g., JWT validation) when establishing the WebSocket upgrade in `server.ts`. 
2. **Server-Side Budget Enforcement:** Hardcode or configure a maximum session cost budget in the backend environment variables (`MAX_BUDGET_USD=2.00`). Do not rely on the client to provide this limit.
3. **Restrict CORS:** Update CORS configuration to only allow the specific domain of the production frontend.
4. **Input Validation:** Introduce a validation library like `zod` or `joi` to validate all incoming data structures on both REST and WebSocket endpoints.
5. **Implement Ping/Pong:** Add a heartbeat mechanism to the WebSocket server to detect and cleanly terminate dead connections.
