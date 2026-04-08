import { prisma } from "../core/database.js";

async function FindUserByEmail(email: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { email: email },
        });

        if (!user) {
            return { success: false, error: "USER_NOT_FOUND" };
        }

        return { success: true, data: user };

    } catch (error: any) {
        if (error.code && typeof error.code === 'string') {
            console.log("Error de Prisma con código:", error.code);
            return { success: false, error: "QUERY_ERROR" };
        }
        if (error.message && error.message.includes("initialization")) {
            return { success: false, error: "CONNECTION_ERROR" };
        }
    }
}

export { FindUserByEmail };