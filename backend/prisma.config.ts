import "./src/load-env.js";
import { defineConfig } from "@prisma/config";

const schema =
  process.env.PRISMA_SCHEMA ||
  (process.env.DATABASE_URL?.startsWith("postgres")
    ? "prisma/schema.postgres.prisma"
    : "prisma/schema.prisma");

export default defineConfig({
  schema,
});
