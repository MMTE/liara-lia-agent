"use client";

import { motion } from "framer-motion";
import type { LiriMood } from "./types";

const RING: Record<LiriMood, string> = {
  idle: "ring-[var(--border)]",
  thinking: "ring-[var(--accent)]",
  warning: "ring-[var(--warn)]",
  success: "ring-[var(--ok)]",
};

interface MascotProps {
  mood?: LiriMood;
  size?: number;
  float?: boolean;
  className?: string;
}

export function Mascot({ mood = "idle", size = 40, float = false, className = "" }: MascotProps) {
  const avatar = (
    <span
      className={[
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--bg)] ring-2 transition",
        RING[mood],
        className,
      ].join(" ")}
      style={{ width: size, height: size }}
    >
      <img
        src="/liri.jpg"
        alt="لیری، دستیار عملیاتی لیارا"
        className="h-[190%] w-[190%] max-w-none object-cover"
      />
      {mood === "thinking" && (
        <span className="absolute inset-0 animate-pulse rounded-full bg-[var(--accent)]/20" aria-hidden />
      )}
    </span>
  );

  if (!float) return avatar;
  return (
    <motion.span
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      className="inline-flex"
    >
      {avatar}
    </motion.span>
  );
}
