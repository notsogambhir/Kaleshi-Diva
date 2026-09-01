import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BiomeType } from "../game/world/Biomes";

interface BiomeBannerProps {
  banner: {
    id: BiomeType;
    name: string;
  } | null;
  onDismiss: () => void;
}

const BIOME_META: Record<BiomeType, { icon: string; subtitle: string; gradient: string; border: string; glow: string }> = {
  park: {
    icon: "🌻",
    subtitle: "Blossoming Meadows",
    gradient: "from-emerald-900/90 via-teal-900/90 to-emerald-950/90",
    border: "border-emerald-400/50",
    glow: "shadow-[0_0_25px_rgba(52,211,153,0.35)]",
  },
  lake: {
    icon: "🪷",
    subtitle: "Cobblestone Waters",
    gradient: "from-cyan-950/90 via-sky-900/90 to-blue-950/90",
    border: "border-sky-400/50",
    glow: "shadow-[0_0_25px_rgba(56,189,248,0.35)]",
  },
  sunset: {
    icon: "🌅",
    subtitle: "Golden Twilight Canopy",
    gradient: "from-amber-950/90 via-orange-900/90 to-rose-950/90",
    border: "border-amber-400/50",
    glow: "shadow-[0_0_25px_rgba(251,191,36,0.35)]",
  },
  dino: {
    icon: "🦖",
    subtitle: "Prehistoric Valley",
    gradient: "from-stone-950/90 via-red-950/90 to-orange-950/90",
    border: "border-orange-500/50",
    glow: "shadow-[0_0_25px_rgba(249,115,22,0.35)]",
  },
};

export const BiomeBanner: React.FC<BiomeBannerProps> = ({ banner, onDismiss }) => {
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 3200);
    return () => clearTimeout(timer);
  }, [banner, onDismiss]);

  if (!banner) return null;

  const meta = BIOME_META[banner.id] || BIOME_META.park;

  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          key={`${banner.id}_${banner.name}`}
          initial={{ y: -60, opacity: 0, scale: 0.88 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -40, opacity: 0, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="fixed top-20 inset-x-0 mx-auto w-fit max-w-sm z-30 pointer-events-none px-4"
        >
          <div
            className={`flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r ${meta.gradient} backdrop-blur-xl border ${meta.border} ${meta.glow}`}
          >
            <span className="text-2xl filter drop-shadow animate-bounce">
              {meta.icon}
            </span>
            <div className="flex flex-col text-left">
              <div className="text-[10px] uppercase font-black tracking-widest text-white/60">
                Entering Zone
              </div>
              <div className="text-sm sm:text-base font-black text-white tracking-wide drop-shadow">
                {banner.name}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
