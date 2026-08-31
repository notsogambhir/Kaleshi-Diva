import * as THREE from "three";
import { createToonMaterial, attachInvertedHull } from "../core/ToonPipeline";
import { TextureGenerator } from "../TextureGenerator";

export class SpikeManager {
  private static isSpikeActive = false;

  public static isToonSpikeEnabled(): boolean {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("spike") === "toon" || urlParams.get("toon") === "1") {
        return true;
      }
    }
    return this.isSpikeActive;
  }

  public static setToonSpikeEnabled(enabled: boolean): void {
    this.isSpikeActive = enabled;
  }

  /**
   * Applies MeshToonMaterial to the track road & ground during the Phase 0 spike.
   */
  public static applyTrackToonSpike(
    roadMesh: THREE.Mesh,
    groundMesh: THREE.Mesh,
    maxAnisotropy = 4
  ): void {
    const roadTex = TextureGenerator.getTexture("road_asphalt", maxAnisotropy);
    roadTex.repeat.set(1, 10);
    const toonRoadMat = createToonMaterial({
      map: roadTex,
    });
    roadMesh.material = toonRoadMat;

    const grassTex = TextureGenerator.getTexture("grass", maxAnisotropy);
    grassTex.repeat.set(10, 20);
    const toonGrassMat = createToonMaterial({
      map: grassTex,
    });
    groundMesh.material = toonGrassMat;
  }

  /**
   * Applies MeshToonMaterial and inverted hull outline to a low obstacle mesh during the Phase 0 spike.
   */
  public static applyObstacleToonSpike(obstacleMesh: THREE.Group): void {
    obstacleMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name !== "inverted_hull_outline") {
        const origMat = child.material as THREE.MeshStandardMaterial;
        const toonMat = createToonMaterial({
          color: origMat.color,
          map: origMat.map || null,
        });
        child.material = toonMat;
        attachInvertedHull(child, 0.05, 0x111111);
      }
    });
  }
}
