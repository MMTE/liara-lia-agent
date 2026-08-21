import DocsShell from "@/components/docs/DocsShell";
import { DEFAULT_ROUTE, getNav, resolvePage } from "@/lib/docs-pages.js";

export default function Home() {
  const page = resolvePage(DEFAULT_ROUTE)!;
  return <DocsShell nav={getNav()} page={page} />;
}
