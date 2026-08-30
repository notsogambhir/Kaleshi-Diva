import { BiomeType, BIOME_SEQUENCE, DISTANCE_PER_BIOME } from "../world/Biomes";
import { CollectibleManager } from "../entities/Collectibles";
import { ObstacleManager, ObstacleType } from "../entities/Obstacles";
import { PowerupManager, PowerupType } from "../entities/Powerups";
import { SceneryManager } from "../world/Scenery";

export class SpawnerSystem {
  private distanceRun = 0;
  private nextObstacleDist = 25;
  private nextSunflowerDist = 10;
  private nextPowerupDist = 70;
  private nextSceneryDist = 0;

  public currentBiome: BiomeType = "park";
  public onBiomeChange?: (newBiome: BiomeType) => void;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.distanceRun = 0;
    this.nextObstacleDist = 25;
    this.nextSunflowerDist = 8;
    this.nextPowerupDist = 65;
    this.nextSceneryDist = 0;
    this.currentBiome = "park";
  }

  public update(
    distanceDelta: number,
    isDashing: boolean,
    collectibles: CollectibleManager,
    obstacles: ObstacleManager,
    powerups: PowerupManager,
    scenery: SceneryManager
  ): void {
    this.distanceRun += distanceDelta;

    // 1. Biome Progression by Distance
    const biomeIndex = Math.floor(this.distanceRun / DISTANCE_PER_BIOME) % BIOME_SEQUENCE.length;
    const targetBiome = BIOME_SEQUENCE[biomeIndex];
    if (targetBiome !== this.currentBiome) {
      this.currentBiome = targetBiome;
      if (this.onBiomeChange) {
        this.onBiomeChange(targetBiome);
      }
    }

    // 2. Scenery (road-side spacing)
    if (this.distanceRun >= this.nextSceneryDist) {
      scenery.spawn(-110, this.currentBiome);
      this.nextSceneryDist = this.distanceRun + (8 + Math.random() * 6);
    }

    // 3. Dashing Sky Flight mode vs Ground mode (Lipgloss Dash only)
    if (isDashing) {
      if (this.distanceRun >= this.nextSunflowerDist) {
        const lane = Math.floor(Math.random() * 3);
        collectibles.spawnLine(-100, lane, 5, true);
        this.nextSunflowerDist = this.distanceRun + 20;
      }
      return;
    }

    // 4. Powerups Spawning
    if (this.distanceRun >= this.nextPowerupDist) {
      const lane = Math.floor(Math.random() * 3);
      const types: PowerupType[] = ["shield", "magnet", "speed", "dino"];
      const chosenType = types[Math.floor(Math.random() * types.length)];
      powerups.spawn(-100, lane, chosenType);
      this.nextPowerupDist = this.distanceRun + (80 + Math.random() * 50);
    }

    // 5. Difficulty-Tiered Authored Obstacle & Sunflower Chunks
    if (this.distanceRun >= this.nextObstacleDist) {
      this.spawnAuthoredChunk(-100, collectibles, obstacles);
      const spacing = this.distanceRun < 400 ? 28 : this.distanceRun < 1000 ? 24 : 20;
      this.nextObstacleDist = this.distanceRun + spacing + Math.random() * 10;
    } else if (this.distanceRun >= this.nextSunflowerDist) {
      const lane = Math.floor(Math.random() * 3);
      collectibles.spawnLine(-100, lane, 4, false);
      this.nextSunflowerDist = this.distanceRun + (18 + Math.random() * 10);
    }
  }

  private spawnAuthoredChunk(
    baseZ: number,
    collectibles: CollectibleManager,
    obstacles: ObstacleManager
  ): void {
    const lowType: ObstacleType = this.currentBiome === "dino" ? "dino_low" : "low";
    const highType: ObstacleType = this.currentBiome === "dino" ? "dino_high" : "high";

    // Difficulty Tiering based on distance run (Fixes skipped feature #27)
    let availablePatterns = [0, 1]; // Tier 1: simple jump arcs and gentle ducks
    if (this.distanceRun >= 300) availablePatterns = [0, 1, 2, 4]; // Tier 2: two-lane squeeze, tunnels
    if (this.distanceRun >= 800) availablePatterns = [0, 1, 2, 3, 4]; // Tier 3: all patterns including rapid weaves

    const chunkType = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];

    switch (chunkType) {
      case 0: {
        // Pattern 1: Jump Arc (Single hurdle with parabolic sunflower arc over it)
        const lane = Math.floor(Math.random() * 3);
        obstacles.spawn(baseZ, lane, lowType, this.currentBiome);
        collectibles.spawnArc(baseZ + 6, lane, 5);
        break;
      }
      case 1: {
        // Pattern 2: Duck & Jump Rhythm (WIDENED SPACING: 28 units so jump clears cleanly - Fixes defect #3)
        const lane = Math.floor(Math.random() * 3);
        obstacles.spawn(baseZ, lane, highType, this.currentBiome);
        obstacles.spawn(baseZ - 28, lane, lowType, this.currentBiome);
        collectibles.spawnSingle(baseZ, lane, 0.7, false);
        collectibles.spawnSingle(baseZ - 28, lane, 2.5, false);
        break;
      }
      case 2: {
        // Pattern 3: Two-Lane Squeeze (Blocks 2 lanes, leaving 1 safe lane full of sunflowers)
        const safeLane = Math.floor(Math.random() * 3);
        for (let l = 0; l < 3; l++) {
          if (l !== safeLane) {
            obstacles.spawn(baseZ, l, lowType, this.currentBiome);
          }
        }
        collectibles.spawnLine(baseZ + 4, safeLane, 5, false);
        break;
      }
      case 3: {
        // Pattern 4: Lane Weave (Obstacle in Lane 0 at baseZ, Lane 1 at baseZ - 16)
        const startLane = Math.random() > 0.5 ? 0 : 2;
        obstacles.spawn(baseZ, startLane, lowType, this.currentBiome);
        obstacles.spawn(baseZ - 18, 1, lowType, this.currentBiome);
        collectibles.spawnLine(baseZ + 4, 1, 3, false);
        collectibles.spawnLine(baseZ - 12, startLane === 0 ? 2 : 0, 3, false);
        break;
      }
      case 4:
      default: {
        // Pattern 5: High Tunnel (Single arch requiring one duck, with low sunflowers underneath as reward)
        const lane = Math.floor(Math.random() * 3);
        obstacles.spawn(baseZ, lane, highType, this.currentBiome);
        collectibles.spawnSingle(baseZ + 3, lane, 0.7, false);
        collectibles.spawnSingle(baseZ, lane, 0.7, false);
        collectibles.spawnSingle(baseZ - 3, lane, 0.7, false);
        break;
      }
    }
  }

  public getDistanceRun(): number {
    return Math.floor(this.distanceRun);
  }
}
