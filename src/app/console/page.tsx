import type { Metadata } from "next";
import { ConsoleHome } from "@/components/console/ConsoleHome";

export const metadata: Metadata = {
  title: "کنسول لیارا",
};

// Server shell around the client host: ConsoleHome owns the session phase
// (demo hero vs. connected apps list → detail) and the page-level LiaWidget.
export default function ConsolePage() {
  return <ConsoleHome />;
}
