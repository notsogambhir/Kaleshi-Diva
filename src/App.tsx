import { useEffect, useRef, useState, useCallback } from "react";
import { GameEngine } from "./game/GameEngine";
import { GameUI } from "./components/GameUI";
import { MilestoneToast } from "./components/MilestoneToast";
import { StartScreen } from "./screens/StartScreen";
import { GameOverScreen } from "./screens/GameOverScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { AnimatePresence } from "motion/react";
import { PERSONAL_CONTENT, MilestoneNote } from "./content/personal";
import { OutfitId } from "./game/entities/Player";
import { TextureGenerator } from "./game/TextureGenerator";
import { HapticsManager } from "./game/core/Haptics";

type GameState = "START" | "PLAYING" | "GAME_OVER";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Asset Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState("");

  const [gameState, setGameState] = useState<GameState>("START");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [topSpeed, setTopSpeed] = useState(40);
  const [pursuerDistance, setPursuerDistance] = useState(8.0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Settings state
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [sfxVolume, setSfxVolume] = useState(0.7);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [qualityTier, setQualityTier] = useState<"low" | "medium" | "high">("high");

  const [selectedOutfit, setSelectedOutfit] = useState<OutfitId>("sunflower");
  const [activeMilestone, setActiveMilestone] = useState<MilestoneNote | null>(null);

  const [powerups, setPowerups] = useState({
    shield: false,
    magnet: false,
    speed: false,
    dino: false,
  });
  const [musicPlaying, setMusicPlaying] = useState(false);

  // Preload textures on launch
  useEffect(() => {
    let isMounted = true;

    async function loadAssets() {
      await TextureGenerator.preloadAll((progress, item) => {
        if (isMounted) {
          setLoadProgress(progress);
          setCurrentItem(item);
        }
      });
      if (isMounted) {
        setIsLoading(false);
      }
    }

    loadAssets();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize GameEngine once canvas and assets are ready
  useEffect(() => {
    if (isLoading || !canvasRef.current || engineRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    try {
      const savedHighScore = parseInt(
        localStorage.getItem("sunflowerRunHighScore") || "0",
        10
      );
      setHighScore(savedHighScore);
    } catch (e) {}

    engine.onScoreUpdate = (newScore) => {
      setScore(newScore);

      const matchedMilestone = PERSONAL_CONTENT.milestoneNotes.find(
        (m) => m.distance === newScore
      );
      if (matchedMilestone) {
        setActiveMilestone(matchedMilestone);
        engine.audio.milestone();
      }
    };

    engine.onComboUpdate = (newCombo) => {
      setCombo(newCombo);
    };

    engine.onDistanceUpdate = (newDistance) => {
      setDistance(newDistance);
    };

    engine.onPursuerDistanceUpdate = (newDist) => {
      setPursuerDistance(newDist);
    };

    engine.onPowerupUpdate = (updates) => {
      setPowerups(updates);
    };

    engine.onGameOver = (finalScore, isNewHigh, finalDistance, finalMaxCombo, finalTopSpeed) => {
      setScore(finalScore);
      setIsNewHighScore(isNewHigh);
      if (isNewHigh) setHighScore(finalScore);
      setDistance(finalDistance);
      setMaxCombo(finalMaxCombo);
      setTopSpeed(finalTopSpeed);
      setIsPaused(false);
      setGameState("GAME_OVER");
    };

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [isLoading]);

  const handleStart = () => {
    setGameState("PLAYING");
    setScore(0);
    setDistance(0);
    setCombo(0);
    setMaxCombo(0);
    setIsNewHighScore(false);
    setIsPaused(false);
    setPowerups({ shield: false, magnet: false, speed: false, dino: false });
    if (engineRef.current) {
      engineRef.current.setOutfit(selectedOutfit);
      engineRef.current.startGame();
      setMusicPlaying(true);
    }
  };

  const handleSelectOutfit = (outfit: OutfitId) => {
    setSelectedOutfit(outfit);
    if (engineRef.current) {
      engineRef.current.setOutfit(outfit);
    }
  };

  const handleToggleMusic = () => {
    if (engineRef.current) {
      const isPlaying = engineRef.current.audio.toggleMusic();
      setMusicPlaying(isPlaying);
    }
  };

  const handleTogglePause = () => {
    if (engineRef.current) {
      const paused = engineRef.current.togglePause();
      setIsPaused(paused);
    }
  };

  const handleChangeMusicVolume = (vol: number) => {
    setMusicVolume(vol);
    if (engineRef.current) {
      engineRef.current.audio.setMusicVolume(vol);
    }
  };

  const handleChangeSfxVolume = (vol: number) => {
    setSfxVolume(vol);
    if (engineRef.current) {
      engineRef.current.audio.setSfxVolume(vol);
    }
  };

  const handleToggleHaptics = () => {
    const nextVal = !hapticsEnabled;
    setHapticsEnabled(nextVal);
    HapticsManager.setEnabled(nextVal);
  };

  const handleChangeQuality = (tier: "low" | "medium" | "high") => {
    setQualityTier(tier);
    TextureGenerator.setResolution(tier === "low" ? 256 : 512);
  };

  const handleDismissMilestone = useCallback(() => {
    setActiveMilestone(null);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-300 font-sans select-none touch-none">
      {/* Loading Screen during preloading */}
      {isLoading && (
        <LoadingScreen progress={loadProgress} currentItem={currentItem} />
      )}

      {/* The WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
      />

      {/* UI Overlays */}
      {gameState === "PLAYING" && (
        <GameUI
          score={score}
          highScore={highScore}
          distance={distance}
          combo={combo}
          pursuerDistance={pursuerDistance}
          powerups={powerups}
          musicPlaying={musicPlaying}
          isPaused={isPaused}
          musicVolume={musicVolume}
          sfxVolume={sfxVolume}
          hapticsEnabled={hapticsEnabled}
          qualityTier={qualityTier}
          onToggleMusic={handleToggleMusic}
          onTogglePause={handleTogglePause}
          onChangeMusicVolume={handleChangeMusicVolume}
          onChangeSfxVolume={handleChangeSfxVolume}
          onToggleHaptics={handleToggleHaptics}
          onChangeQuality={handleChangeQuality}
        />
      )}

      {/* Milestone Love Notes Toast */}
      <MilestoneToast
        note={activeMilestone}
        onDismiss={handleDismissMilestone}
      />

      <AnimatePresence>
        {gameState === "START" && !isLoading && (
          <StartScreen
            highScore={highScore}
            selectedOutfit={selectedOutfit}
            onSelectOutfit={handleSelectOutfit}
            onStart={handleStart}
          />
        )}

        {gameState === "GAME_OVER" && (
          <GameOverScreen
            score={score}
            highScore={highScore}
            distance={distance}
            maxCombo={maxCombo}
            topSpeed={topSpeed}
            isNewHighScore={isNewHighScore}
            onRestart={handleStart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
