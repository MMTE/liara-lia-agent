import React from 'react';
import type { Mood } from '../../types/agent';

const MASCOT_URL = "/fc3580b9-8c51-4b1d-958c-23c730603997.jpg";


const ring: Record<Mood, string> = {
  idle: 'ring-white/10',
  thinking: 'ring-violet-400/70',
  warning: 'ring-amber-400/80',
  success: 'ring-emerald-400/80'
};

interface MascotProps {
  mood?: Mood;
  size?: number;
  float?: boolean;
  className?: string;
}

export function Mascot({ mood = 'idle', size = 40, float = false, className = '' }: MascotProps) {
  return (
    <span
      className={[
      'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-950 ring-2 transition',
      ring[mood],
      float ? 'liri-float' : '',
      className].
      join(' ')}
      style={{ width: size, height: size }}>
      
      <img
        src={MASCOT_URL}
        alt="لیری، دستیار عملیاتی لیارا"
        className="h-[190%] w-[190%] max-w-none object-cover" />
      
      {mood === 'thinking' &&
      <span className="absolute inset-0 animate-pulse rounded-full bg-violet-500/20" aria-hidden />
      }
    </span>);

}