import * as THREE from "three";
import { registerCurvedMaterial } from "../core/CurvedWorld";
import { ObjectPool } from "../core/Pool";
import { TextureGenerator } from "../TextureGenerator";
import { BiomeType } from "../world/Biomes";

export type ObstacleType = "low" | "high" | "dino_low" | "dino_high";

export interface ObstacleItem {
  mesh: THREE.Group;
  lane: number;
  type: ObstacleType;
  active: boolean;
  nearMissFired: boolean;
  prevZ: number;
  width: number;
  minY: number;
  maxY: number;
}

export class ObstacleManager {
  private container: THREE.Object3D;
  public activeItems: ObstacleItem[] = [];
  private pool: ObjectPool<THREE.Group>;

  // Materials
  private woodMat: THREE.MeshStandardMaterial;
  private rockMat: THREE.MeshStandardMaterial;
  private jumpChevronMat: THREE.MeshStandardMaterial;
  private amberCapMat: THREE.MeshStandardMaterial;
  private duckNeonMat: THREE.MeshStandardMaterial;
  private dinoSkinMat: THREE.MeshStandardMaterial;
  private dinoJumpPlateMat: THREE.MeshStandardMaterial;
  private dinoDuckFrillMat: THREE.MeshStandardMaterial;

  // Shared Geometry Templates
  private postLowGeo: THREE.BoxGeometry;
  private postHighGeo: THREE.BoxGeometry;
  private barLowGeo: THREE.BoxGeometry;
  private endCapGeo: THREE.BoxGeometry;
  private barHighGeo: THREE.BoxGeometry;
  private dinoTailGeo: THREE.CylinderGeometry;
  private dinoTailRingGeo: THREE.CylinderGeometry;
  private dinoPlateGeo: THREE.ConeGeometry;
  private dinoFrillGeo: THREE.TorusGeometry;
  private dinoLegGeo: THREE.BoxGeometry;

  constructor(container: THREE.Object3D) {
    this.container = container;

    this.woodMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("wood"),
        roughness: 0.85,
      })
    );
    this.rockMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 }));

    // Jump Bar: High-contrast chevron stripes with amber caps
    this.jumpChevronMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("obstacle_chevron"),
        roughness: 0.35,
      })
    );
    this.amberCapMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 })
    );

    // Duck Bar: Illuminated cyan/teal overhead arch
    this.duckNeonMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("obstacle_duck_arch"),
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.5,
        roughness: 0.25,
      })
    );

    this.dinoSkinMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.8 }));
    this.dinoJumpPlateMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.35,
        roughness: 0.3,
      })
    );
    this.dinoDuckFrillMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.5,
        roughness: 0.25,
      })
    );

    // Shared Geometries
    this.postLowGeo = new THREE.BoxGeometry(0.2, 1.4, 0.2);
    this.postHighGeo = new THREE.BoxGeometry(0.2, 2.5, 0.2);
    this.barLowGeo = new THREE.BoxGeometry(2.6, 0.45, 0.15);
    this.endCapGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
    this.barHighGeo = new THREE.BoxGeometry(2.6, 0.6, 0.15);
    this.dinoTailGeo = new THREE.CylinderGeometry(0.2, 0.45, 2.6, 8);
    this.dinoTailRingGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.15, 8);
    this.dinoPlateGeo = new THREE.ConeGeometry(0.25, 0.5, 4);
    this.dinoFrillGeo = new THREE.TorusGeometry(1.3, 0.25, 8, 16, Math.PI);
    // Legs span y=0..2.0 so the arch ends meet the ground instead of floating
    this.dinoLegGeo = new THREE.BoxGeometry(0.3, 2.0, 0.3);

    this.pool = new ObjectPool<THREE.Group>(
      () => new THREE.Group(),
      (group) => {
        while (group.children.length > 0) {
          group.remove(group.children[0]);
        }
        group.position.set(0, 0, 100);
        group.rotation.set(0, 0, 0);
      },
      25
    );
  }

  public spawn(zPos: number, lane: number, type: ObstacleType, biome: BiomeType): ObstacleItem {
    const laneWidth = 4;
    const xPos = (lane - 1) * laneWidth;

    const group = this.pool.acquire();
    this.buildObstacleMesh(group, type, biome);

    group.position.set(xPos, 0, zPos);
    this.container.add(group);

    let minY = 0;
    let maxY = 1.3;
    if (type === "high" || type === "dino_high") {
      minY = 1.5;
      maxY = 2.8;
    }

    const item: ObstacleItem = {
      mesh: group,
      lane,
      type,
      active: true,
      nearMissFired: false,
      prevZ: zPos,
      width: 2.6,
      minY,
      maxY,
    };

    this.activeItems.push(item);
    return item;
  }

  private buildObstacleMesh(group: THREE.Group, type: ObstacleType, biome: BiomeType): void {
    if (type === "low") {
      const mat = biome === "lake" ? this.rockMat : this.woodMat;
      const postL = new THREE.Mesh(this.postLowGeo, mat);
      postL.position.set(-1.2, 0.7, 0);
      postL.castShadow = true;

      const postR = new THREE.Mesh(this.postLowGeo, mat);
      postR.position.set(1.2, 0.7, 0);
      postR.castShadow = true;

      const bar = new THREE.Mesh(this.barLowGeo, this.jumpChevronMat);
      bar.position.set(0, 0.9, 0);
      bar.castShadow = true;

      const capL = new THREE.Mesh(this.endCapGeo, this.amberCapMat);
      capL.position.set(-1.3, 0.9, 0);
      capL.castShadow = true;

      const capR = new THREE.Mesh(this.endCapGeo, this.amberCapMat);
      capR.position.set(1.3, 0.9, 0);
      capR.castShadow = true;

      group.add(postL, postR, bar, capL, capR);
    } else if (type === "high") {
      const mat = biome === "lake" ? this.rockMat : this.woodMat;
      const postL = new THREE.Mesh(this.postHighGeo, mat);
      postL.position.set(-1.2, 1.25, 0);
      postL.castShadow = true;

      const postR = new THREE.Mesh(this.postHighGeo, mat);
      postR.position.set(1.2, 1.25, 0);
      postR.castShadow = true;

      const bar = new THREE.Mesh(this.barHighGeo, this.duckNeonMat);
      bar.position.set(0, 2.0, 0);
      bar.castShadow = true;

      group.add(postL, postR, bar);
    } else if (type === "dino_low") {
      const tail = new THREE.Mesh(this.dinoTailGeo, this.dinoSkinMat);
      tail.rotation.z = Math.PI / 2;
      tail.position.set(0, 0.4, 0);
      tail.castShadow = true;
      group.add(tail);

      // Amber hazard rings across the tail body for clear JUMP readability
      for (let r = 0; r < 3; r++) {
        const ring = new THREE.Mesh(this.dinoTailRingGeo, this.amberCapMat);
        ring.rotation.z = Math.PI / 2;
        ring.position.set((r - 1) * 0.75, 0.4, 0);
        ring.castShadow = true;
        group.add(ring);
      }

      for (let p = 0; p < 4; p++) {
        const plate = new THREE.Mesh(this.dinoPlateGeo, this.dinoJumpPlateMat);
        plate.position.set((p - 1.5) * 0.6, 0.7, 0);
        plate.castShadow = true;
        group.add(plate);
      }
    } else if (type === "dino_high") {
      const frill = new THREE.Mesh(this.dinoFrillGeo, this.dinoDuckFrillMat);
      frill.position.set(0, 2.0, 0);
      frill.castShadow = true;
      group.add(frill);

      // Grounded legs: the torus arc ends at local y=0, so without these the
      // arch hangs 2 units above the track and reads as floating at distance.
      const legL = new THREE.Mesh(this.dinoLegGeo, this.dinoSkinMat);
      legL.position.set(-1.3, 1.0, 0);
      legL.castShadow = true;

      const legR = new THREE.Mesh(this.dinoLegGeo, this.dinoSkinMat);
      legR.position.set(1.3, 1.0, 0);
      legR.castShadow = true;

      group.add(legL, legR);
    }
  }

  public update(speed: number, dt: number): void {
    const deltaMove = speed * (dt * 60);

    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      const item = this.activeItems[i];
      item.prevZ = item.mesh.position.z;
      item.mesh.position.z += deltaMove;

      if (item.mesh.position.z > 10) {
        this.removeAt(i);
      }
    }
  }

  public removeAt(index: number): void {
    const item = this.activeItems[index];
    if (!item) return;
    this.container.remove(item.mesh);
    this.pool.release(item.mesh);
    this.activeItems.splice(index, 1);
  }

  public reset(): void {
    for (const item of this.activeItems) {
      this.container.remove(item.mesh);
      this.pool.release(item.mesh);
    }
    this.activeItems = [];
  }

  public dispose(): void {
    this.reset();
    this.pool.clear();

    this.woodMat.dispose();
    this.rockMat.dispose();
    this.jumpChevronMat.dispose();
    this.amberCapMat.dispose();
    this.duckNeonMat.dispose();
    this.dinoSkinMat.dispose();
    this.dinoJumpPlateMat.dispose();
    this.dinoDuckFrillMat.dispose();

    this.postLowGeo.dispose();
    this.postHighGeo.dispose();
    this.barLowGeo.dispose();
    this.endCapGeo.dispose();
    this.barHighGeo.dispose();
    this.dinoTailGeo.dispose();
    this.dinoTailRingGeo.dispose();
    this.dinoPlateGeo.dispose();
    this.dinoFrillGeo.dispose();
    this.dinoLegGeo.dispose();
  }
}
