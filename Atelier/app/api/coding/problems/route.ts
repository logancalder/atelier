import { readCodingNotebook, upsertCodingProblems } from "@/lib/coding-db";
import type { CodingProblem } from "@/lib/types";
import { currentUser } from "@/lib/auth";
import { extensionOwner } from "@/lib/extension-auth";
import { firebaseAdminConfigured } from "@/lib/firebase-admin";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function isProblem(value: unknown): value is CodingProblem {
  if (!value || typeof value !== "object") return false;
  const problem = value as Partial<CodingProblem>;
  return typeof problem.key === "string" && problem.key.length > 0
    && typeof problem.title === "string"
    && typeof problem.updatedAt === "string"
    && Array.isArray(problem.submissions);
}

async function owner(request: Request) {
  if (!firebaseAdminConfigured) return "local";
  return await extensionOwner(request.headers.get("authorization")) ?? (await currentUser())?.uid ?? null;
}

export async function GET(request: Request) {
  const ownerId = await owner(request);
  if (!ownerId) return response({ error: "Unauthorized" }, 401);
  return response(readCodingNotebook(ownerId));
}

export async function POST(request: Request) {
  const ownerId = await owner(request);
  if (!ownerId) return response({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => null);
  const candidates = Array.isArray(body) ? body : [body];
  if (!candidates.length || !candidates.every(isProblem)) {
    return response({ error: "Expected one coding problem or an array of coding problems." }, 400);
  }
  return response(await upsertCodingProblems(candidates, ownerId));
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
