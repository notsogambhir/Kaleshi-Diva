import React, { useEffect, useRef, useState } from "react";
import { GameEngine } from "./game/GameEngine";
import { GameUI } from "./components/GameUI";
import { StartScreen } from "./screens/StartScreen";
import { GameOverScreen } from "./screens/GameOverScreen";
import { AnimatePresence } from "motion/react";

type GameState = "START" | "PLAYING" | "GAME_OVER";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>("START");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  const [powerups, setPowerups] = useState({
    shield: false,
    magnet: false,
    speed: false,
  });
  const [musicPlaying, setMusicPlaying] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || engineRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    try {
      const savedHighScore = parseInt(
        localStorage.getItem("sunflowerRunHighScore") || "0",
      );
      setHighScore(savedHighScore);
    } catch (e) {}

    engine.onScoreUpdate = (newScore) => {
      setScore(newScore);
    };

    engine.onPowerupUpdate = (updates) => {
      setPowerups(updates);
    };

    engine.onGameOver = (finalScore, isNewHigh) => {
      setScore(finalScore);
      setIsNewHighScore(isNewHigh);
      if (isNewHigh) setHighScore(finalScore);
      setGameState("GAME_OVER");
    };

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleStart = () => {
    setGameState("PLAYING");
    setScore(0);
    setIsNewHighScore(false);
    setPowerups({ shield: false, magnet: false, speed: false });
    if (engineRef.current) {
      engineRef.current.startGame();
    }
  };

  const handleToggleMusic = () => {
    if (engineRef.current) {
      const isPlaying = engineRef.current.audio.toggleMusic();
      setMusicPlaying(isPlaying);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-300 font-sans select-none touch-none">
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
          powerups={powerups}
          musicPlaying={musicPlaying}
          onToggleMusic={handleToggleMusic}
        />
      )}

      <AnimatePresence>
        {gameState === "START" && <StartScreen onStart={handleStart} />}

        {gameState === "GAME_OVER" && (
          <GameOverScreen
            score={score}
            highScore={highScore}
            isNewHighScore={isNewHighScore}
            onRestart={handleStart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
