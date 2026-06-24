// Prisma client singleton. Only imported when DATA_BACKEND=prisma (via dynamic import),
// so the app still runs with no database / no generated client in the default memory mode.
import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { __prisma?: PrismaClient };
export const prisma = g.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.__prisma = prisma;
