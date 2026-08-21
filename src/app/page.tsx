import { redirect } from "next/navigation";

// Preserve the query string through the redirect: the Chrome extension loads
// `/?embed=1` (extension/content.js) and must land on the compact `/chat?embed=1`.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) for (const v of value) qs.append(key, v);
  }
  const query = qs.toString();
  redirect(query ? `/chat?${query}` : "/chat");
}
