import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { LiriContext } from '../../types/context';
import { useLiri } from '../../hooks/useLiri';
import { LiriPanel } from './LiriPanel';
import { Mascot } from './Mascot';

export interface ProactiveNudge {
  text: string;
  cta: string;
  prompt: string;
  scenarioId?: string;
}

export interface LiriRequest {
  text: string;
  scenarioId?: string;
  /** increment to trigger a new request from outside the widget */
  nonce: number;
}

interface LiriProps {
  context: LiriContext;
  nudge?: ProactiveNudge;
  request?: LiriRequest;
  onOpenDoc?: (path: string) => void;
}

export function Liri({ context, nudge, request, onOpenDoc }: LiriProps) {
  const [open, setOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const liri = useLiri(context.surface);

  const handledNonce = useRef(request?.nonce ?? 0);

  useEffect(() => {
    if (!request || request.nonce === 0 || request.nonce === handledNonce.current) return;
    handledNonce.current = request.nonce;
    setOpen(true);
    setShowNudge(false);
    if (request.text) liri.ask(request.text, request.scenarioId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce]);

  useEffect(() => {
    if (!nudge) {
      setShowNudge(false);
      return;
    }
    const t = setTimeout(() => setShowNudge(true), 1800);
    return () => clearTimeout(t);
  }, [nudge]);

  const startNudge = () => {
    if (!nudge) return;
    setShowNudge(false);
    setOpen(true);
    liri.ask(nudge.prompt, nudge.scenarioId);
  };

  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-50 flex flex-col items-start gap-3">
      <AnimatePresence>
        {open &&
        <motion.div
          key="panel"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="pointer-events-auto origin-bottom-left">
          
            <LiriPanel context={context} liri={liri} onClose={() => setOpen(false)} onOpenDoc={onOpenDoc} />
          </motion.div>
        }
      </AnimatePresence>

      <AnimatePresence>
        {!open && showNudge && nudge &&
        <motion.div
          key="nudge"
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          className="pointer-events-auto w-[19rem] rounded-2xl border border-white/10 bg-zinc-950 p-3 text-zinc-100 shadow-2xl shadow-black/40">
          
            <div className="flex items-start gap-2.5">
              <Mascot mood="warning" size={30} />
              <p className="flex-1 text-[12.5px] leading-6 text-zinc-200">{nudge.text}</p>
              <button
              type="button"
              onClick={() => setShowNudge(false)}
              aria-label="بستن اعلان"
              className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300">
              
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
            type="button"
            onClick={startNudge}
            className="mt-2.5 w-full rounded-xl bg-white py-1.5 text-[12.5px] font-medium text-zinc-900 transition hover:bg-zinc-200">
            
              {nudge.cta}
            </button>
          </motion.div>
        }
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'بستن لیری' : 'گفت‌وگو با لیری'}
        aria-expanded={open}
        className="pointer-events-auto group flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950 py-1.5 pe-3 ps-1.5 shadow-xl shadow-black/30 transition hover:border-violet-400/40">
        
        <Mascot mood={liri.mood} size={34} float={!open} />
        <span className="text-[12.5px] text-zinc-200 group-hover:text-white">
          {open ? 'بستن' : 'لیری'}
        </span>
        {!open && context.state === 'failed' &&
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
        }
      </button>
    </div>);

}