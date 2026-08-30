import React from "react";
import { motion } from "motion/react";
import { PERSONAL_CONTENT, OutfitOption } from "../content/personal";
import { OutfitId } from "../game/entities/Player";

interface StartScreenProps {
  highScore: number;
  selectedOutfit: OutfitId;
  onSelectOutfit: (outfit: OutfitId) => void;
  onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  highScore,
  selectedOutfit,
  onSelectOutfit,
  onStart,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08, filter: "blur(8px)" }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-sky-200/35 backdrop-blur-sm overflow-y-auto py-6"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.45 }}
        className="bg-white/95 backdrop-blur-xl p-6 md:p-10 rounded-[2.5rem] border-4 border-yellow-400 shadow-2xl max-w-lg w-[calc(100%-2rem)] mx-4 text-center flex flex-col items-center"
      >
        <div className="text-4xl md:text-5xl mb-2">🌻</div>
        <h1
          className="text-3xl md:text-5xl font-black text-yellow-500 mb-1 drop-shadow-sm tracking-tight"
          style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
        >
          {PERSONAL_CONTENT.playerName}
        </h1>
        <p className="text-sm md:text-base text-gray-700 font-medium mb-5">
          Collect Sunflowers & Outrun Gambhir!
        </p>

        {/* Outfit Selection Bar (Fixes skipped feature #25) */}
        <div className="w-full bg-yellow-50/80 p-3 rounded-2xl border border-yellow-200 mb-5 flex flex-col gap-2">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-left">
            Choose Outfit:
          </span>
          <div className="grid grid-cols-2 gap-2">
            {PERSONAL_CONTENT.outfits.map((outfit: OutfitOption) => {
              const isUnlocked = highScore >= outfit.unlockedAt;
              const isSelected = selectedOutfit === outfit.id;

              return (
                <button
                  key={outfit.id}
                  disabled={!isUnlocked}
                  onClick={() => onSelectOutfit(outfit.id)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                    isSelected
                      ? "bg-yellow-400 border-yellow-500 text-gray-900 shadow-md font-bold"
                      : isUnlocked
                      ? "bg-white border-yellow-200 text-gray-700 hover:bg-yellow-100/60"
                      : "bg-gray-100 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <span className="text-2xl">{outfit.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-black leading-none">{outfit.name}</span>
                    <span className="text-[9px] text-gray-500 mt-0.5">
                      {isUnlocked ? "Unlocked" : `Unlock at ${outfit.unlockedAt} 🌻`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Powerups Showcase */}
        <div className="grid grid-cols-4 gap-2 md:gap-3 mb-6 w-full">
          <motion.div
            animate={{ y: [-3, 3, -3] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-10 md:w-11 md:h-11 bg-red-100 rounded-full flex items-center justify-center text-lg md:text-xl shadow-inner">
              💄
            </div>
            <span className="text-[10px] font-bold text-gray-600">Speed</span>
          </motion.div>

          <motion.div
            animate={{ y: [-3, 3, -3] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.2 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-10 md:w-11 md:h-11 bg-yellow-100 rounded-full flex items-center justify-center text-lg md:text-xl shadow-inner">
              ✨
            </div>
            <span className="text-[10px] font-bold text-gray-600">Shield</span>
          </motion.div>

          <motion.div
            animate={{ y: [-3, 3, -3] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.4 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-10 md:w-11 md:h-11 bg-purple-100 rounded-full flex items-center justify-center text-lg md:text-xl shadow-inner">
              📿
            </div>
            <span className="text-[10px] font-bold text-gray-600">Magnet</span>
          </motion.div>

          <motion.div
            animate={{ y: [-3, 3, -3] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.6 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-10 md:w-11 md:h-11 bg-green-100 rounded-full flex items-center justify-center text-lg md:text-xl shadow-inner">
              🦖
            </div>
            <span className="text-[10px] font-bold text-gray-600">Dino Ride</span>
          </motion.div>
        </div>

        <p className="text-xs text-gray-500 font-medium mb-5 block md:hidden">
          Swipe to switch lanes, tap / swipe up to jump, swipe down to duck
        </p>
        <p className="text-xs text-gray-500 font-medium mb-5 hidden md:block">
          Use Arrow Keys / WASD to move, Space / Up to jump, Down to duck
        </p>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onStart}
          className="w-full py-4 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-black text-xl md:text-2xl uppercase tracking-wider shadow-[0_10px_20px_rgba(251,191,36,0.4)] hover:shadow-[0_15px_25px_rgba(251,191,36,0.6)] transition-all"
        >
          Start Running
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
