import React from "react";
import { motion } from "motion/react";

interface GameOverScreenProps {
  score: number;
  highScore: number;
  isNewHighScore: boolean;
  onRestart: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  highScore,
  isNewHighScore,
  onRestart,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="bg-white p-8 md:p-14 rounded-[2.5rem] border-4 border-red-500 shadow-2xl max-w-md w-[calc(100%-2rem)] mx-4 text-center relative overflow-hidden"
      >
        {/* Decorative background circle */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-50 rounded-full blur-3xl -z-10"></div>

        <h2 className="text-4xl md:text-5xl font-black text-red-600 mb-2 uppercase tracking-tighter">
          Caught You!
        </h2>

        <div className="my-6 md:my-8 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-dashed border-gray-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 md:px-4 text-xl md:text-3xl font-serif italic text-gray-700 min-w-max">
              "I'll always catch you,
              <br />
              won't let you run away bbg"
            </span>
          </div>
        </div>

        <span className="block text-right font-bold text-red-500 text-lg mb-8">
          - Gambhir
        </span>

        <div className="bg-gray-50 rounded-3xl p-6 mb-8 flex justify-between items-center border border-gray-100">
          <div className="flex flex-col text-left">
            <span className="text-gray-400 font-bold uppercase text-xs tracking-wider">
              Score
            </span>
            <span className="text-3xl font-black text-gray-800">{score}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-gray-400 font-bold uppercase text-xs tracking-wider">
              Best
            </span>
            <div className="flex items-center gap-2">
              {isNewHighScore && (
                <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                  New
                </span>
              )}
              <span className="text-3xl font-black text-gray-800">
                {highScore}
              </span>
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRestart}
          className="w-full py-5 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-xl uppercase tracking-wider shadow-[0_10px_20px_rgba(239,68,68,0.4)] hover:shadow-[0_15px_25px_rgba(239,68,68,0.6)] transition-all"
        >
          Try Again
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
