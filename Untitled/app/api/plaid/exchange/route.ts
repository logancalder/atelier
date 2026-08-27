import { exchangePlaidToken } from "@/lib/plaid";
import { currentUser } from "@/lib/auth";
import { firebaseAdminConfigured } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  const user = await currentUser();
  if (firebaseAdminConfigured && !user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = user?.uid ?? "local";
  try {
    const body = await request.json() as { publicToken?: string; institutionName?: string };
    if (!body.publicToken) return Response.json({ error: "A public token is required." }, { status: 400 });
    return Response.json(await exchangePlaidToken(body.publicToken, body.institutionName, ownerId));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not connect the bank." }, { status: 500 });
  }
}
