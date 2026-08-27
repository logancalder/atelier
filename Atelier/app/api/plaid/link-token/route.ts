import { createPlaidLinkToken, plaidConfigured } from "@/lib/plaid";
import { currentUser } from "@/lib/auth";
import { firebaseAdminConfigured } from "@/lib/firebase-admin";

export async function POST() {
  const user = await currentUser();
  if (firebaseAdminConfigured && !user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = user?.uid ?? "local";
  if (!plaidConfigured()) return Response.json({ error: "Add PLAID_CLIENT_ID and PLAID_SECRET to .env.local first." }, { status: 503 });
  try {
    return Response.json({ linkToken: await createPlaidLinkToken(ownerId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not start Plaid Link." }, { status: 500 });
  }
}
