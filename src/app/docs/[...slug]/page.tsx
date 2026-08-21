import { notFound } from "next/navigation";
import DocsShell from "@/components/docs/DocsShell";
import { getNav, resolvePage } from "@/lib/docs-pages.js";

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = resolvePage((slug ?? []).join("/"));
  if (!page) notFound();
  return <DocsShell nav={getNav()} page={page} />;
}
