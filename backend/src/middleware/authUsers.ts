import { Request } from 'express';
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';


export interface AuthRequest extends Request {
    userId?: number;
}

export const validarUsuario = (req: AuthRequest, res: Response, next: NextFunction) => {
    // 1. Obtener la cookie (Equivalente a c.Cookie)
    const token = req.cookies.Access_Token;

    if (!token) {
        return handleUnauthorized(req, res);
    }

    try {
        const secret = process.env["ACCESS_TOKEN_SECRET"];
        if (!secret) throw new Error("JWT Secret missing");

        // 2. Verificar y Parsear (Equivalente a jwt.Parse)
        // Si el token fue alterado, esta función lanza una excepción automáticamente
        const decoded = jwt.verify(token, secret) as any;

        // 3. Capturar claims y validar IP (Simulando tu lógica de Go)
        const clientIp = req.ip || req.socket.remoteAddress;
        
        if (decoded.direccion_IP && decoded.direccion_IP !== clientIp) {
            return res.status(401).json({ error: "IP mismatch" });
        }

        // 4. Setear valores en el context (req en Express)
        // Esto es el equivalente a c.Set("user_id", ...)
        req.userId = decoded.userId;

        // Continuar al siguiente handler (c.Next)
        next();

    } catch (error) {
        // Si el token expiró o fue alterado, limpiamos la cookie y redirigimos
        res.clearCookie("Access_Token");
        return handleUnauthorized(req, res);
    }
};

// Función auxiliar para manejar el redirect o el JSON (tu lógica de Go)
function handleUnauthorized(req: AuthRequest, res: Response) {
    if (req.path.startsWith("/api")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    return res.redirect("/api/login");
}