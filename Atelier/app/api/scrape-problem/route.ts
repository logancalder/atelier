import { currentUser } from "@/lib/auth";

type Site = "LC" | "NC";
type Metadata = { title: string; problemNo: string; site: Site };

const LEETCODE_HOSTS = new Set(["leetcode.com", "www.leetcode.com"]);
const NEETCODE_HOSTS = new Set(["neetcode.io", "www.neetcode.io"]);
const PROBLEM_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

function parseProblemUrl(value: string): { site: Site; slug: string } | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (LEETCODE_HOSTS.has(url.hostname.toLowerCase()) && parts[0] === "problems" && PROBLEM_SLUG.test(parts[1] || "")) {
      return { site: "LC", slug: parts[1] };
    }
    if (NEETCODE_HOSTS.has(url.hostname.toLowerCase()) && ["problems", "solutions"].includes(parts[0]) && PROBLEM_SLUG.test(parts[1] || "")) {
      return { site: "NC", slug: parts[1] };
    }
  } catch { /* Invalid URLs are handled by the caller. */ }
  return null;
}

async function leetCodeMetadata(slug: string): Promise<Omit<Metadata, "site"> | null> {
  const response = await fetch("https://leetcode.com/graphql/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Atelier problem metadata" },
    body: JSON.stringify({
      query: "query ProblemMetadata($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId title } }",
      variables: { titleSlug: slug },
    }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = await response.json() as { data?: { question?: { questionFrontendId?: string; title?: string } } };
  const question = data.data?.question;
  if (!question?.title) return null;
  return { title: question.title.trim(), problemNo: question.questionFrontendId?.trim() || "" };
}

function plainText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function neetCodeMetadata(slug: string): Promise<Omit<Metadata, "site"> | null> {
  const response = await fetch(`https://neetcode.io/solutions/${encodeURIComponent(slug)}`, {
    headers: { "User-Agent": "Atelier problem metadata" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const html = await response.text();
  const linkedSlug = html.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i)?.[1];
  if (linkedSlug && PROBLEM_SLUG.test(linkedSlug)) {
    const linked = await leetCodeMetadata(linkedSlug);
    if (linked) return linked;
  }
  const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    || "";
  const text = plainText(heading).replace(/^NeetCode\s*[-|:]\s*/i, "");
  const number = text.match(/^#?(\d{1,5})[.:\s-]+/)?.[1]
    || html.match(/LeetCode\s+(\d{1,5})/i)?.[1]
    || "";
  const title = text.replace(/^#?\d{1,5}[.:\s-]+/, "").trim();
  return title ? { title, problemNo: number } : null;
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = parseProblemUrl(new URL(request.url).searchParams.get("url") || "");
  if (!parsed) return Response.json({ error: "Enter a valid LeetCode or NeetCode problem URL." }, { status: 400 });

  try {
    const metadata = parsed.site === "LC" ? await leetCodeMetadata(parsed.slug) : await neetCodeMetadata(parsed.slug);
    if (!metadata) return Response.json({ error: "Problem details could not be found." }, { status: 404 });
    return Response.json({ ...metadata, site: parsed.site } satisfies Metadata);
  } catch (error) {
    console.error("Problem metadata lookup failed", error);
    return Response.json({ error: "Problem details could not be loaded." }, { status: 502 });
  }
}
