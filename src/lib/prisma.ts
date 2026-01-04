import { PrismaClient } from '@/generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Initialize LibSQL client and adapter
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const libsql = createClient({
  url: dbUrl.startsWith('file:') ? dbUrl : `file:${dbUrl}`
});

const adapter = new PrismaLibSql(libsql);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
