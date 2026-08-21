import { LiriWidget } from "@/components/liri/LiriWidget";

export const metadata = {
  title: "ایجنت لیارا — اپراتور ابری هوشمند",
};

// Full-page Liri mount: the panel renders inline (no floating bubble) and
// fills the viewport. Read server-side from searchParams (same pattern as
// src/app/page.tsx) so the correct scope label renders on first paint.
export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // ?embed=1 (docs-site iframe / extension) → docs-assistant branding;
  // direct visits keep the agent branding.
  const embed = params.embed === "1";
  return (
    <LiriWidget
      fullPage
      surface="docs"
      scopeLabel={embed ? "دستیار مستندات لیارا" : "ایجنت لیارا"}
    />
  );
}
