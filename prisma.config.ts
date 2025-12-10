// Prisma configuration for Neon PostgreSQL
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DATABASE_URL (pooler) - works better with Neon's serverless
    url: env("DATABASE_URL"),
  },
});
