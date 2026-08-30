import React from "react";
import { motion } from "motion/react";

interface LoadingScreenProps {
  progress: number; // 0.0 to 1.0
  currentItem: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, currentItem }) => {
  const percentage = Math.round(progress * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-sky-300 via-amber-100 to-yellow-200">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6 max-w-xs w-full px-6 text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          className="text-7xl drop-shadow-lg select-none"
        >
          🌻
        </motion.div>

        <div>
          <h2 className="text-3xl font-black text-yellow-600 uppercase tracking-tight">
            Kaleshi Diva
          </h2>
          <p className="text-xs font-semibold text-gray-600 mt-1">
            Planting sunflowers & tuning textures...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/80 rounded-full h-4 p-1 shadow-inner border border-yellow-300">
          <motion.div
            className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full rounded-full"
            style={{ width: `${percentage}%` }}
            transition={{ ease: "easeOut", duration: 0.2 }}
          />
        </div>

        <div className="flex justify-between w-full text-[11px] font-bold text-gray-500 px-1">
          <span className="truncate max-w-[160px] text-left">{currentItem || "Preparing world..."}</span>
          <span>{percentage}%</span>
        </div>
      </motion.div>
    </div>
  );
};
