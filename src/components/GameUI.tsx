import { Shield, Magnet, Rocket, Volume2, VolumeX, Pause, Play, Flame, Vibrate } from "lucide-react";
import React from "react";

interface GameUIProps {
  score: number;
  highScore: number;
  distance: number;
  combo: number;
  pursuerDistance: number;
  powerups: { shield: boolean; magnet: boolean; speed: boolean; dino?: boolean };
  musicPlaying: boolean;
  isPaused: boolean;
  musicVolume: number;
  sfxVolume: number;
  hapticsEnabled: boolean;
  qualityTier: "low" | "medium" | "high";
  onToggleMusic: () => void;
  onTogglePause: () => void;
  onChangeMusicVolume: (vol: number) => void;
  onChangeSfxVolume: (vol: number) => void;
  onToggleHaptics: () => void;
  onChangeQuality: (tier: "low" | "medium" | "high") => void;
}

export const GameUI: React.FC<GameUIProps> = ({
  score,
  highScore,
  distance,
  combo,
  pursuerDistance,
  powerups,
  musicPlaying,
  isPaused,
  musicVolume,
  sfxVolume,
  hapticsEnabled,
  qualityTier,
  onToggleMusic,
  onTogglePause,
  onChangeMusicVolume,
  onChangeSfxVolume,
  onToggleHaptics,
  onChangeQuality,
}) => {
  const dangerRatio = Math.max(0, Math.min(1, (8.0 - pursuerDistance) / 7.0));
  const isCritical = pursuerDistance <= 4.8;

  return (
    <div className="absolute inset-0 pointer-events-none pb-[max(1rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))]">
      {/* Top Bar Navigation / HUD */}
      <div className="flex justify-between items-start pt-4 px-4 sm:pt-6 sm:px-6">
        {/* Left: Sunflower Score & Best */}
        <div className="flex flex-col gap-2">
          <div className="bg-black/40 backdrop-blur-md rounded-full px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 border border-white/20 shadow-lg pointer-events-auto">
            <span className="text-2xl sm:text-3xl">🌻</span>
            <span className="text-3xl sm:text-4xl font-extrabold text-yellow-300 drop-shadow-md font-sans tracking-tight">
              {score}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-black/30 backdrop-blur-md rounded-full px-3 py-1 flex items-center shadow pointer-events-auto w-fit">
              <span className="text-xs sm:text-sm font-semibold text-white/90">
                BEST: {Math.max(score, highScore)}
              </span>
            </div>

            <div className="bg-black/30 backdrop-blur-md rounded-full px-3 py-1 flex items-center shadow pointer-events-auto w-fit">
              <span className="text-xs sm:text-sm font-semibold text-white/80">
                {distance}m
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls (Pause + Sound) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onTogglePause}
            className="p-3 sm:p-4 bg-black/40 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-colors pointer-events-auto shadow-lg"
          >
            {isPaused ? <Play className="w-5 h-5 sm:w-6 sm:h-6" /> : <Pause className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          <button
            onClick={onToggleMusic}
            className="p-3 sm:p-4 bg-black/40 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-colors pointer-events-auto shadow-lg"
          >
            {musicPlaying ? <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </div>
      </div>

      {/* Top Center: Pursuer Proximity Danger Meter */}
      <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow">
          <span className="text-xs font-bold text-white/90 flex items-center gap-1">
            🏃‍♂️ Gambhir
          </span>
          <span className={`text-xs font-black ${isCritical ? "text-red-400 animate-pulse" : "text-emerald-300"}`}>
            {pursuerDistance.toFixed(1)}m
          </span>
        </div>
        <div className="w-32 sm:w-40 h-2 bg-black/40 rounded-full overflow-hidden border border-white/20">
          <div
            className={`h-full transition-all duration-200 ${
              isCritical
                ? "bg-gradient-to-r from-yellow-400 to-red-500 animate-pulse"
                : "bg-gradient-to-r from-emerald-400 to-amber-400"
            }`}
            style={{ width: `${dangerRatio * 100}%` }}
          />
        </div>
      </div>

      {/* Center Left: Combo Multiplier Badge */}
      {combo >= 2 && (
        <div className="absolute left-4 sm:left-6 top-28 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-full font-black text-sm shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-bounce">
          <Flame className="w-4 h-4 fill-white" />
          <span>{Math.min(combo, 4)}x COMBO</span>
        </div>
      )}

      {/* Left Center: Active Powerups Badges */}
      <div className="absolute left-4 sm:left-6 top-40 sm:top-44 flex flex-col gap-2 sm:gap-3">
        {powerups.shield && (
          <div className="bg-blue-500/80 backdrop-blur-md p-2.5 sm:p-3 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_15px_rgba(59,130,246,0.8)]">
            <Shield className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}
        {powerups.magnet && (
          <div
            className="bg-cyan-600/90 border-2 border-cyan-300 backdrop-blur-md p-2.5 sm:p-3 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_20px_rgba(6,182,212,0.9)] ring-4 ring-cyan-400/40"
            style={{ animationDelay: "100ms" }}
          >
            <Magnet className="text-white w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </div>
        )}
        {powerups.speed && (
          <div
            className="bg-red-500/80 backdrop-blur-md p-2.5 sm:p-3 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_15px_rgba(239,68,68,0.8)]"
            style={{ animationDelay: "200ms" }}
          >
            <Rocket className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}
        {powerups.dino && (
          <div
            className="bg-green-500/80 backdrop-blur-md p-2 sm:p-2.5 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_15px_rgba(34,197,94,0.8)]"
            style={{ animationDelay: "300ms" }}
          >
            <span className="text-2xl leading-none">🦕</span>
          </div>
        )}
      </div>

      {/* Rich Pause Settings Modal */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center pointer-events-auto z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] border-4 border-yellow-400 shadow-2xl max-w-sm w-full text-center flex flex-col gap-4">
            <h3 className="text-2xl sm:text-3xl font-black text-gray-800 uppercase tracking-tight">
              Settings & Pause
            </h3>

            {/* Sliders & Switches */}
            <div className="flex flex-col gap-3.5 text-left bg-yellow-50/70 p-4 rounded-2xl border border-yellow-200">
              {/* Music Volume */}
              <div>
                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>Music Volume</span>
                  <span>{Math.round(musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVolume}
                  onChange={(e) => onChangeMusicVolume(parseFloat(e.target.value))}
                  className="w-full accent-yellow-500"
                />
              </div>

              {/* SFX Volume */}
              <div>
                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>SFX Volume</span>
                  <span>{Math.round(sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVolume}
                  onChange={(e) => onChangeSfxVolume(parseFloat(e.target.value))}
                  className="w-full accent-yellow-500"
                />
              </div>

              {/* Haptics Switch */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Vibrate className="w-4 h-4 text-yellow-600" />
                  Haptic Vibration
                </span>
                <button
                  onClick={onToggleHaptics}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    hapticsEnabled ? "bg-yellow-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                      hapticsEnabled ? "left-6" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Quality Tier Selector */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-gray-700">Graphics Tier</span>
                <div className="flex bg-gray-200 rounded-lg p-0.5 text-[10px] font-bold">
                  <button
                    onClick={() => onChangeQuality("low")}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      qualityTier === "low" ? "bg-yellow-400 text-gray-900 shadow" : "text-gray-600"
                    }`}
                  >
                    Low
                  </button>
                  <button
                    onClick={() => onChangeQuality("high")}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      qualityTier === "high" ? "bg-yellow-400 text-gray-900 shadow" : "text-gray-600"
                    }`}
                  >
                    High
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={onTogglePause}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-black text-lg uppercase tracking-wider shadow-lg hover:brightness-105 transition-all mt-1"
            >
              Resume Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
