import { deleteCodingProblem, readCodingNotebook, upsertCodingProblems } from "@/lib/coding-db";
import type { CodingProblem } from "@/lib/types";
import { currentUser } from "@/lib/auth";
import { extensionOwner } from "@/lib/extension-auth";
import { firebaseAdminConfigured } from "@/lib/firebase-admin";
import { syncCodingProblemsToProva } from "@/lib/prova";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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
  const notebook = await upsertCodingProblems(candidates, ownerId);
  let provaSync = { matched: 0, unmatched: candidates.length };
  try { provaSync = await syncCodingProblemsToProva(ownerId, candidates); }
  catch { /* Problem Notes must remain available even if the Prova mirror is temporarily unavailable. */ }
  return response({ ...notebook, provaSync });
}

export async function DELETE(request: Request) {
  const ownerId = await owner(request);
  if (!ownerId) return response({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => null) as { key?: unknown } | null;
  if (typeof body?.key !== "string" || !body.key) return response({ error: "A problem key is required." }, 400);
  try {
    const result = await deleteCodingProblem(body.key, ownerId);
    return result.deleted ? response({ ok: true }) : response({ error: "Problem not found." }, 404);
  } catch (error) {
    console.error("Unable to delete coding problem", error);
    return response({ error: "Could not delete the problem." }, 500);
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
