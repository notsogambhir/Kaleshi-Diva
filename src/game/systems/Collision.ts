import { Player, COLLECT_CENTER_OFFSET } from "../entities/Player";
import { ObstacleItem } from "../entities/Obstacles";
import { SunflowerItem } from "../entities/Collectibles";
import { PowerupItem } from "../entities/Powerups";

export interface CollisionResult {
  hitObstacleIndex: number;
  collectedSunflowers: number[];
  collectedPowerupIndex: number;
  nearMissObstacleIndex: number;
}

export class CollisionSystem {
  /**
   * Performs swept AABB collision tests between player authoritative simPosition and active entities.
   * Swept z-segment [obs.prevZ, obs.mesh.position.z] prevents obstacle tunneling at high speeds.
   */
  public static checkCollisions(
    player: Player,
    obstacles: ObstacleItem[],
    sunflowers: SunflowerItem[],
    powerups: PowerupItem[],
    isInvincible: boolean
  ): CollisionResult {
    const result: CollisionResult = {
      hitObstacleIndex: -1,
      collectedSunflowers: [],
      collectedPowerupIndex: -1,
      nearMissObstacleIndex: -1,
    };

    const pX = player.simPosition.x;
    const pY = player.simPosition.y;
    const pMinX = pX - 0.45;
    const pMaxX = pX + 0.45;
    const pMinY = pY;
    const pMaxY = pY + (player.isDucking ? 1.0 : 2.2);
    const pMinZ = -0.4;
    const pMaxZ = 0.4;

    // 1. Obstacles (Swept AABB)
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (!obs.active) continue;

      const oX = obs.mesh.position.x;
      const oHalfW = obs.width / 2;
      const oMinX = oX - oHalfW;
      const oMaxX = oX + oHalfW;

      // Swept Z interval
      const currentZ = obs.mesh.position.z;
      const minObsZ = Math.min(obs.prevZ, currentZ) - 0.35;
      const maxObsZ = Math.max(obs.prevZ, currentZ) + 0.35;

      const overlapX = pMaxX > oMinX && pMinX < oMaxX;
      const overlapZ = pMaxZ >= minObsZ && pMinZ <= maxObsZ;

      if (overlapX && overlapZ) {
        const hitY = pMaxY > obs.minY && pMinY < obs.maxY;
        if (hitY) {
          result.hitObstacleIndex = i;
          break;
        } else if (!isInvincible && !obs.nearMissFired) {
          // Vertical Near-Miss: entered obstacle footprint and cleared it by ducking or jumping
          obs.nearMissFired = true;
          result.nearMissObstacleIndex = i;
        }
      }
    }

    // 2. Sunflowers (Tightened Y tolerance)
    for (let i = 0; i < sunflowers.length; i++) {
      const sun = sunflowers[i];
      if (!sun.active) continue;

      const sX = sun.mesh.position.x;
      const sY = sun.mesh.position.y;
      const sZ = sun.mesh.position.z;

      // Require jumping for high sunflowers (y >= 2.2) unless actively boosting
      const verticalTolerance = player.isBoosting ? 2.5 : 1.05;
      const inX = Math.abs(pX - sX) < 1.1;
      const inY = Math.abs((pY + COLLECT_CENTER_OFFSET) - sY) < verticalTolerance;
      const inZ = sZ >= -1.2 && sZ <= 1.2;

      if (inX && inY && inZ) {
        result.collectedSunflowers.push(i);
      }
    }

    // 3. Powerups
    for (let i = 0; i < powerups.length; i++) {
      const p = powerups[i];
      if (!p.active) continue;

      const pwrX = p.mesh.position.x;
      const pwrZ = p.mesh.position.z;

      const inX = Math.abs(pX - pwrX) < 1.3;
      const inZ = Math.abs(pwrZ) < 1.2;

      if (inX && inZ) {
        result.collectedPowerupIndex = i;
        break;
      }
    }

    return result;
  }
}
