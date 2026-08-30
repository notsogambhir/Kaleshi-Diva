import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { PERSONAL_CONTENT } from "../content/personal";

interface GameOverScreenProps {
  score: number;
  highScore: number;
  distance: number;
  maxCombo: number;
  topSpeed: number;
  isNewHighScore: boolean;
  onRestart: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  highScore,
  distance,
  maxCombo,
  topSpeed,
  isNewHighScore,
  onRestart,
}) => {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const randomIndex = Math.floor(
      Math.random() * PERSONAL_CONTENT.gameOverQuotes.length
    );
    setQuoteIndex(randomIndex);
  }, []);

  const activeQuote = PERSONAL_CONTENT.gameOverQuotes[quoteIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
        className="bg-white p-6 md:p-10 rounded-[2.5rem] border-4 border-red-500 shadow-2xl max-w-md w-[calc(100%-2rem)] mx-4 text-center relative overflow-hidden"
      >
        {/* Decorative ambient background circle */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-100 rounded-full blur-3xl -z-10"></div>

        <h2 className="text-3xl md:text-5xl font-black text-red-600 mb-1 uppercase tracking-tighter">
          Caught You!
        </h2>

        <div className="my-4 md:my-5 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-dashed border-gray-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 md:px-4 text-base md:text-xl font-serif italic text-gray-700 leading-snug">
              "{activeQuote.quote}"
            </span>
          </div>
        </div>

        <span className="block text-right font-bold text-red-500 text-sm mb-5">
          - {activeQuote.author}
        </span>

        {/* Rich Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-yellow-50 rounded-2xl p-3.5 border border-yellow-100 flex flex-col text-left">
            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">
              Sunflowers
            </span>
            <span className="text-2xl md:text-3xl font-black text-yellow-600 flex items-center gap-1">
              <span>🌻</span>
              {score}
            </span>
          </div>

          <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 flex flex-col text-left">
            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">
              Best Score
            </span>
            <div className="flex items-center gap-1.5">
              {isNewHighScore && (
                <span className="bg-red-100 text-red-600 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">
                  NEW!
                </span>
              )}
              <span className="text-2xl md:text-3xl font-black text-gray-800">
                {highScore}
              </span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl p-3.5 border border-blue-100 flex flex-col text-left">
            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">
              Distance
            </span>
            <span className="text-xl md:text-2xl font-black text-blue-600">
              {distance}m
            </span>
          </div>

          <div className="bg-orange-50 rounded-2xl p-3.5 border border-orange-100 flex flex-col text-left">
            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">
              Max Combo / Speed
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xl md:text-2xl font-black text-orange-600">
                {maxCombo}x 🔥
              </span>
              <span className="text-xs font-bold text-gray-500">
                {topSpeed} km/h
              </span>
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onRestart}
          className="w-full py-4 md:py-5 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-xl uppercase tracking-wider shadow-[0_10px_20px_rgba(239,68,68,0.4)] hover:shadow-[0_15px_25px_rgba(239,68,68,0.6)] transition-all"
        >
          Try Again
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
