import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const backendDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

dotenv.config({ path: path.resolve(backendDir, "../.env.local"), quiet: true });
dotenv.config({ path: path.resolve(backendDir, ".env"), quiet: true });
