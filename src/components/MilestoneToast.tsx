import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MilestoneNote } from "../content/personal";

interface MilestoneToastProps {
  note: MilestoneNote | null;
  onDismiss: () => void;
}

export const MilestoneToast: React.FC<MilestoneToastProps> = ({ note, onDismiss }) => {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const currentDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!note) {
      currentDistanceRef.current = null;
      return;
    }

    // Only set timer once when a new milestone note arrives
    if (currentDistanceRef.current === note.distance) {
      return;
    }
    currentDistanceRef.current = note.distance;

    const timer = setTimeout(() => {
      onDismissRef.current();
    }, 4500);

    return () => clearTimeout(timer);
  }, [note?.distance]); // Depend strictly on milestone distance identity (Fixes defect #9)

  return (
    <AnimatePresence>
      {note && (
        <motion.div
          initial={{ y: -90, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -90, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="fixed top-6 inset-x-4 max-w-sm mx-auto z-40 pointer-events-auto"
        >
          <div className="bg-white/95 backdrop-blur-xl border-2 border-yellow-400 p-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <div className="text-3xl">🌻</div>
            <div className="flex-1 text-left">
              <h4 className="font-extrabold text-sm text-yellow-600 tracking-tight">
                {note.title}
              </h4>
              <p className="text-xs text-gray-700 font-medium leading-tight mt-0.5">
                {note.message}
              </p>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 text-base font-bold px-1.5 py-1"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
