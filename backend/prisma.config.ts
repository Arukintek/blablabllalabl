import "dotenv/config"; // Загружает переменные из .env файла
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: process.env.PRISMA_SCHEMA || "prisma/schema.prisma",
});
