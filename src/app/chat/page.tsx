import { LiriWidget } from "@/components/liri/LiriWidget";

export const metadata = {
  title: "ایجنت لیارا — اپراتور ابری هوشمند",
};

// Full-page Liri mount: the panel renders inline (no floating bubble) and
// fills the viewport. ?embed=1 (docs-site iframe / extension) needs no extra
// handling — there is no page-level chrome around the widget in any mode.
export default function ChatPage() {
  return <LiriWidget fullPage surface="docs" scopeLabel="ایجنت لیارا" />;
}
