import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface StartScreenProps {
  onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-sky-200/40 backdrop-blur-md"
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="bg-white/90 backdrop-blur-xl p-8 md:p-14 rounded-3xl border-4 border-yellow-400 shadow-2xl max-w-lg w-[calc(100%-2rem)] mx-4 text-center flex flex-col items-center"
      >
        <div className="text-5xl md:text-6xl mb-4">🌻</div>
        <h1
          className="text-4xl md:text-6xl font-black text-yellow-500 mb-2 drop-shadow-sm tracking-tight"
          style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
        >
          Kaleshi Diva Returns
        </h1>
        <p className="text-lg md:text-xl text-gray-700 font-medium mb-6 md:mb-8">
          Collect Sunflowers! Grab Powerups!
        </p>

        <div className="flex justify-center gap-6 mb-10 w-full">
          <motion.div 
            animate={{ y: [-4, 4, -4] }} 
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} 
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl shadow-inner">
              💄
            </div>
            <span className="text-sm font-bold text-gray-600">Speed</span>
          </motion.div>
          <motion.div 
            animate={{ y: [-4, 4, -4] }} 
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.3 }} 
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl shadow-inner">
              ✨
            </div>
            <span className="text-sm font-bold text-gray-600">Shield</span>
          </motion.div>
          <motion.div 
            animate={{ y: [-4, 4, -4] }} 
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.6 }} 
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl shadow-inner">
              📿
            </div>
            <span className="text-sm font-bold text-gray-600">Magnet</span>
          </motion.div>
        </div>

        <p className="text-sm text-gray-500 font-medium mb-8 block md:hidden">
          Swipe to move, jump, and duck
        </p>
        <p className="text-sm text-gray-500 font-medium mb-8 hidden md:block">
          Use Arrow Keys to move, jump, and duck
        </p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="w-full py-5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-black text-2xl uppercase tracking-wider shadow-[0_10px_20px_rgba(251,191,36,0.4)] hover:shadow-[0_15px_25px_rgba(251,191,36,0.6)] transition-all"
        >
          Start Running
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
