import express from 'express';
import { z } from "zod"
import { FindUserByEmail } from "../reads_inserts_db/Users.js"
import { AuthUtils } from "../utils/cipherPasswords.js"
import jwt from 'jsonwebtoken';
const authRouter = express.Router();

const LoginSchema = z.object({
    email: z.email("Formato de email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginInput = z.infer<typeof LoginSchema>;


authRouter.post('/login', async (req, res) => {
    const result = LoginSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            error: "Validación fallida",
            details: result.error.format()
        });
    }
    const { email, password } = result.data;
    let resultLoginEmail = await FindUserByEmail(email)
    if (!resultLoginEmail) {
        return res.status(500).json({ error: "Error inesperado al buscar el usuario" });
    }
    if (!resultLoginEmail.success) {
        return res.status(401).json({ error: "Usuario no encontrado" });
    }
    const user = resultLoginEmail.data;
    if (!user) {
        return res.status(500).json({ error: "Error inesperado al buscar el usuario" });
    }
    const isValid = await AuthUtils.compareHashPassword(password, user.password)
    if (!isValid) {
        return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const payload = {
        userId: user.Id,
    }
    const jwtSecret = process.env["ACCESS_TOKEN_SECRET"]
    if (!jwtSecret) {
        throw new Error("ACCESS_TOKEN_SECRET no está definido en las variables de entorno");
    }
    const token = jwt.sign(payload, jwtSecret, {
        expiresIn: '24h' // Tiempo de vida del token
    });
    const isSecure: boolean = process.env["ENV"] === "production"
    res.cookie("Access_Token", token, {
        httpOnly: true,    // JS del cliente no puede leerla (Seguridad contra XSS)
        secure: isSecure,      // Solo se envía por HTTPS
        sameSite: 'strict',// Protege contra CSRF
        maxAge: 86400000,   // Tiempo de vida en MILISEGUNDOS (1 hora)
        path: '/',         // Disponible en toda la web
    })
    res.json({ message: "Login exitoso" });
})

export default authRouter