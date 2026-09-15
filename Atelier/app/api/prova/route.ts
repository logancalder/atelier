import { firebaseAdminConfigured } from "@/lib/firebase-admin";
import { currentUser } from "@/lib/auth";
import { readProva, validProvaProblems, writeProva } from "@/lib/prova";

export async function GET() {
  const user = await currentUser();
  if (firebaseAdminConfigured && !user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ problems: await readProva(user) });
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (firebaseAdminConfigured && !user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!validProvaProblems(body?.problems)) return Response.json({ error: "Invalid Prova dataset" }, { status: 400 });
  const problems=await writeProva(user?.uid || "local", body.problems);
  return Response.json({ problems });
}
