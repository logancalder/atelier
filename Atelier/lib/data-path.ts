import { tmpdir } from "node:os";
import path from "node:path";

export const DATA_DIR = process.env.VERCEL
  ? path.join(tmpdir(), "atelier-data")
  : path.join(process.cwd(), "data");