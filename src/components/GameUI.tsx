import { Shield, Magnet, Rocket, Volume2, VolumeX } from "lucide-react";
import React from "react";

interface GameUIProps {
  score: number;
  highScore: number;
  powerups: { shield: boolean; magnet: boolean; speed: boolean };
  musicPlaying: boolean;
  onToggleMusic: () => void;
}

export const GameUI: React.FC<GameUIProps> = ({
  score,
  highScore,
  powerups,
  musicPlaying,
  onToggleMusic,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none pb-[max(1rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))]">
      {/* Top Bar Navigation / HUD */}
      <div className="flex justify-between items-start pt-4 px-4 sm:pt-6 sm:px-6">
        <div className="flex flex-col gap-2">
          <div className="bg-black/40 backdrop-blur-md rounded-full px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 border border-white/20 shadow-lg pointer-events-auto">
            <span className="text-2xl sm:text-3xl">🌻</span>
            <span className="text-3xl sm:text-4xl font-extrabold text-yellow-300 drop-shadow-md font-sans tracking-tight">
              {score}
            </span>
          </div>
          <div className="bg-black/30 backdrop-blur-md rounded-full px-3 sm:px-4 py-1 sm:py-1.5 flex items-center shadow pointer-events-auto w-fit">
            <span className="text-xs sm:text-sm font-semibold text-white/90">
              BEST: {Math.max(score, highScore)}
            </span>
          </div>
        </div>

        <button
          onClick={onToggleMusic}
          className="p-3 sm:p-4 bg-black/40 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-colors pointer-events-auto shadow-lg"
        >
          {musicPlaying ? <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
      </div>

      {/* Powerups Indicators */}
      <div className="absolute left-4 sm:left-6 top-32 sm:top-40 flex flex-col gap-2 sm:gap-3">
        {powerups.shield && (
          <div className="bg-blue-500/80 backdrop-blur-md p-2 sm:p-3 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_15px_rgba(59,130,246,0.8)]">
            <Shield className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}
        {powerups.magnet && (
          <div
            className="bg-purple-500/80 backdrop-blur-md p-2 sm:p-3 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_15px_rgba(168,85,247,0.8)]"
            style={{ animationDelay: "100ms" }}
          >
            <Magnet className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}
        {powerups.speed && (
          <div
            className="bg-red-500/80 backdrop-blur-md p-2 sm:p-3 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_15px_rgba(239,68,68,0.8)]"
            style={{ animationDelay: "200ms" }}
          >
            <Rocket className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}
      </div>
    </div>
  );
};
