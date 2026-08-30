const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

export async function POST() {
  return Response.json({ error: "Direct extension sessions are disabled. Use account pairing." }, { status: 410, headers: cors });
}

export function OPTIONS() { return new Response(null, { status: 204, headers: cors }); }
