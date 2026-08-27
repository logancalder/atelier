import { revalidatePath } from "next/cache";
import { syncPlaidTransactions } from "@/lib/plaid";
import { currentUser } from "@/lib/auth";
import { firebaseAdminConfigured } from "@/lib/firebase-admin";

export async function POST() {
  const user = await currentUser();
  if (firebaseAdminConfigured && !user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = user?.uid ?? "local";
  try {
    const result = await syncPlaidTransactions(ownerId);
    revalidatePath("/", "layout");
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not sync transactions." }, { status: 500 });
  }
}
