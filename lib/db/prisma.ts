import { PrismaClient } from '@/lib/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';

// Global Prisma client instance for development hot-reloading
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Create Prisma adapter for Neon with connection string
  const connectionString = `${process.env.DATABASE_URL}`

  const adapter = new PrismaNeon({ connectionString })
  
  // Create Prisma client with Neon adapter
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

// Create Prisma client
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
