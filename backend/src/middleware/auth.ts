import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_EXPIRES_IN = '5m'; // Short-lived: only needed for WebSocket handshake

export interface WsTokenPayload {
    purpose: 'ws_connect';
    sessionId?: string;
    iat?: number;
    exp?: number;
}

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    return secret;
}

/**
 * Issue a short-lived JWT for WebSocket connection handshake.
 * The token expires in 5 minutes — enough to open the WS connection.
 */
export function issueWsToken(sessionId?: string): string {
    const payload: WsTokenPayload = { purpose: 'ws_connect', sessionId };
    return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify a WebSocket JWT token.
 * Returns the payload on success, throws on failure.
 */
export function verifyWsToken(token: string): WsTokenPayload {
    const payload = jwt.verify(token, getJwtSecret()) as WsTokenPayload;
    if (payload.purpose !== 'ws_connect') {
        throw new Error('Invalid token purpose');
    }
    return payload;
}

/**
 * Express middleware: validates the static API key sent in the request body.
 * Used only on the token-issuance endpoint.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
    const provided = req.body?.apiKey as string | undefined;
    const expected = process.env.VOICE_SIMULATOR_API_KEY;

    if (!expected) {
        res.status(500).json({ error: 'Server misconfigured' });
        return;
    }

    if (!provided || provided !== expected) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
    }

    next();
}
