import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { GameEngine } from "../game/GameEngine";

export interface PursuerSpeechInfo {
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  active: boolean;
}

interface PursuerSpeechBubbleProps {
  speech: PursuerSpeechInfo | null;
  engineRef: React.MutableRefObject<GameEngine | null>;
}

export const PursuerSpeechBubble: React.FC<PursuerSpeechBubbleProps> = ({ speech, engineRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.onPursuerSpeechPosition = (x, y) => {
      if (containerRef.current) {
        const clampedX = Math.max(120, Math.min(window.innerWidth - 120, x));
        const clampedY = Math.max(80, Math.min(window.innerHeight - 100, y));
        containerRef.current.style.left = `${clampedX}px`;
        containerRef.current.style.top = `${clampedY}px`;
      }
    };

    return () => {
      if (engine) engine.onPursuerSpeechPosition = () => {};
    };
  }, [engineRef]);

  return (
    <AnimatePresence>
      {speech && speech.active && (
        <motion.div
          ref={containerRef}
          key={`${speech.title}_${speech.subtitle}`}
          initial={{ opacity: 0, scale: 0.7, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ type: "spring", stiffness: 450, damping: 26 }}
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -100%)",
            willChange: "left, top",
          }}
          className="fixed z-40 pointer-events-none select-none flex flex-col items-center"
        >
          {/* Comic Balloon Body */}
          <div className="relative bg-amber-50/95 backdrop-blur-md border-[2.5px] border-slate-900 rounded-2xl px-4 py-2.5 shadow-[0_8px_25px_rgba(0,0,0,0.35)] flex items-center gap-2.5 min-w-[180px] max-w-[280px]">
            <span className="text-2xl filter drop-shadow animate-bounce">
              {speech.emoji}
            </span>
            <div className="flex flex-col text-left">
              <div className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                {speech.title}
              </div>
              <div
                className="text-xs font-extrabold tracking-tight leading-snug mt-0.5"
                style={{ color: speech.color }}
              >
                {speech.subtitle}
              </div>
            </div>

            {/* Comic Tail Pointer */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-[9px] border-x-transparent border-t-[10px] border-t-slate-900" />
            <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-0 h-0 border-x-[7px] border-x-transparent border-t-[8px] border-t-amber-50" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

