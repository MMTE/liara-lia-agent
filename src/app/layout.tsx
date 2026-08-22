import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const vazirmatn = localFont({
  src: [
    { path: "../fonts/Vazirmatn-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Vazirmatn-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Vazirmatn-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-vazir",
});

export const metadata: Metadata = {
  title: "ایجنت لیارا — اپراتور ابری هوشمند",
  description:
    "دستیار هوشمند مستندات و زیرساخت لیارا: جستجوی مستندات، عیب‌یابی دیپلوی و مدیریت منابع با زبان طبیعی.",
};

export const viewport: Viewport = {
  themeColor: "#151722",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body>{children}</body>
    </html>
  );
}
