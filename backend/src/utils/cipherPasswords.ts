import bcrypt from 'bcryptjs';

export class AuthUtils {
    private static readonly SALT_ROUNDS = 10;
    static async hashPassword(password: string): Promise<string> {
        try {
            const hash = await bcrypt.hash(password, this.SALT_ROUNDS);
            return hash;
        } catch (error) {
            console.error("Error hashing password:", error);
            throw new Error("No se pudo procesar la contraseña");
        }
    }
    static async compareHashPassword(password: string, hash: string): Promise<boolean> {
        try {
            // Devuelve true si coinciden, false si no
            const isMatch = await bcrypt.compare(password, hash);
            return isMatch;
        } catch (error) {
            console.error("Error comparing password:", error);
            return false;
        }
    }
}