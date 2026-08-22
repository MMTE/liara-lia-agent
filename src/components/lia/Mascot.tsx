"use client";

import { motion } from "framer-motion";
import type { LiaMood } from "./types";
/** Mood → posture badge (ADR-0010 §2): idle / thinking / alert / aha / worried. */
const BADGE: Record<LiaMood, string> = {
  idle: "/lia/idle.png",
  thinking: "/lia/thinking.png",
  warning: "/lia/alert.png",
  success: "/lia/success.png",
  error: "/lia/worried.png",
};

interface MascotProps {
  mood?: LiaMood;
  size?: number;
  float?: boolean;
  className?: string;
  /** override the mood badge, e.g. the animated wave GIF */
  src?: string;
}

export function Mascot({ mood = "idle", size = 40, float = false, className = "", src }: MascotProps) {
  const avatar = (
    <span
      className={[
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--bg)] ring-2 ring-[var(--accent)] transition",
        className,
      ].join(" ")}
      style={{ width: size, height: size }}
    >
      <img
        src={src ?? BADGE[mood]}
        alt="لیا، دستیار عملیاتی لیارا"
        className="h-full w-full object-cover"
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
