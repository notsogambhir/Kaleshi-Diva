import * as THREE from "three";
import { registerCurvedMaterial } from "../core/CurvedWorld";
import { ObjectPool } from "../core/Pool";
import { TextureGenerator } from "../TextureGenerator";
import { JUMP_APEX, COLLECT_CENTER_OFFSET } from "./Player";

export const BASE_SUNFLOWER_Y = 1.5;

export interface SunflowerItem {
  mesh: THREE.Group;
  headGroup: THREE.Group;
  lane: number;
  active: boolean;
  baseY: number;
  phase: number;
  isSky: boolean;
}

export class CollectibleManager {
  private container: THREE.Object3D;
  public activeItems: SunflowerItem[] = [];
  private pool: ObjectPool<THREE.Group>;

  // Shared Materials
  private flowerHeadMat: THREE.MeshStandardMaterial;
  private petalMat: THREE.MeshStandardMaterial;
  private leafMat: THREE.MeshStandardMaterial;
  private glowSpriteMat: THREE.SpriteMaterial;

  // Shared Geometry Templates
  private headGeo: THREE.CylinderGeometry;
  private petalGeo: THREE.SphereGeometry;
  private stalkGeo: THREE.CylinderGeometry;
  private leafGeo: THREE.SphereGeometry;

  constructor(container: THREE.Object3D) {
    this.container = container;

    this.flowerHeadMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9 }));
    this.petalMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xffeb3b,
        emissive: 0xffaa00,
        emissiveIntensity: 0.55,
        roughness: 0.25,
      })
    );
    this.leafMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.7 }));

    this.glowSpriteMat = registerCurvedMaterial(
      new THREE.SpriteMaterial({
        map: TextureGenerator.getTexture("glow_radial"),
        blending: THREE.AdditiveBlending,
        color: 0xffcc00,
        transparent: true,
        opacity: 0.65,
      })
    );

    this.headGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16);
    this.petalGeo = new THREE.SphereGeometry(0.14, 8, 8);
    this.petalGeo.scale(1.0, 0.2, 2.0);
    this.stalkGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6);
    this.leafGeo = new THREE.SphereGeometry(0.15, 6, 6);
    this.leafGeo.scale(1, 0.2, 0.5);

    this.pool = new ObjectPool<THREE.Group>(
      () => this.createSunflowerMesh(),
      (group) => {
        group.position.set(0, 0, 100);
        group.rotation.set(0, 0, 0);
      },
      45
    );
  }

  private createSunflowerMesh(): THREE.Group {
    const group = new THREE.Group();
    const headGroup = new THREE.Group();

    const head = new THREE.Mesh(this.headGeo, this.flowerHeadMat);
    head.rotation.x = Math.PI / 2;
    headGroup.add(head);

    for (let i = 0; i < 12; i++) {
      const petal = new THREE.Mesh(this.petalGeo, this.petalMat);
      const angle = (i / 12) * Math.PI * 2;
      petal.position.set(Math.cos(angle) * 0.35, Math.sin(angle) * 0.35, 0);
      petal.rotation.z = angle;
      headGroup.add(petal);
    }

    const glowSprite = new THREE.Sprite(this.glowSpriteMat);
    glowSprite.scale.set(1.4, 1.4, 1.4);
    glowSprite.position.set(0, 0, 0.08);
    headGroup.add(glowSprite);

    group.add(headGroup);

    const stalk = new THREE.Mesh(this.stalkGeo, this.leafMat);
    stalk.position.y = -0.75;
    group.add(stalk);

    const leaf1 = new THREE.Mesh(this.leafGeo, this.leafMat);
    leaf1.position.set(0.15, -0.6, 0);
    leaf1.rotation.z = Math.PI / 4;
    group.add(leaf1);

    const leaf2 = new THREE.Mesh(this.leafGeo, this.leafMat);
    leaf2.position.set(-0.15, -1.0, 0);
    leaf2.rotation.z = -Math.PI / 4;
    group.add(leaf2);

    group.userData = { headGroup, stalk, leaf1, leaf2 };
    return group;
  }

  public spawnSingle(zPos: number, lane: number, yPos = 1.5, isSky = false): SunflowerItem {
    const laneWidth = 4;
    const xPos = (lane - 1) * laneWidth;

    const group = this.pool.acquire();
    group.position.set(xPos, yPos, zPos);

    const stalk = group.userData.stalk as THREE.Mesh;
    const leaf1 = group.userData.leaf1 as THREE.Mesh;
    const leaf2 = group.userData.leaf2 as THREE.Mesh;
    const isFloating = yPos > 2.0 || isSky;
    if (stalk) stalk.visible = !isFloating;
    if (leaf1) leaf1.visible = !isFloating;
    if (leaf2) leaf2.visible = !isFloating;

    this.container.add(group);

    const item: SunflowerItem = {
      mesh: group,
      headGroup: group.userData.headGroup as THREE.Group,
      lane,
      active: true,
      baseY: yPos,
      phase: Math.random() * Math.PI * 2,
      isSky,
    };

    this.activeItems.push(item);
    return item;
  }

  public spawnLine(zPos: number, lane: number, count = 4, isSky = false): void {
    for (let j = 0; j < count; j++) {
      this.spawnSingle(zPos - j * 3.2, lane, isSky ? 4.0 : 1.5, isSky);
    }
  }

  public spawnArc(zPos: number, lane: number, count = 5): void {
    const peak = JUMP_APEX + COLLECT_CENTER_OFFSET;
    for (let j = 0; j < count; j++) {
      const progress = j / (count - 1);
      const arcY = BASE_SUNFLOWER_Y + Math.sin(progress * Math.PI) * (peak - BASE_SUNFLOWER_Y);
      this.spawnSingle(zPos - j * 3.0, lane, arcY, false);
    }
  }

  public update(
    speed: number,
    dt: number,
    simTime: number,
    magnetActive: boolean,
    playerPos: THREE.Vector3
  ): void {
    const deltaMove = speed * (dt * 60);

    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      const item = this.activeItems[i];
      item.mesh.position.z += deltaMove;

      item.mesh.position.y = item.baseY + Math.sin(simTime * 4 + item.phase) * 0.15;
      if (item.headGroup) {
        item.headGroup.rotation.x = Math.sin(simTime * 3 + item.phase) * 0.15;
        item.headGroup.rotation.y = Math.sin(simTime * 2 + item.phase) * 0.1;
      }

      if (magnetActive && item.active) {
        // Speed-compensated capture distance: ensures far flowers start pulling in sooner at high speeds
        const maxMagnetDistance = 34 + speed * 35;
        const targetY = playerPos.y + 1.2;
        const dx = playerPos.x - item.mesh.position.x;
        const dy = targetY - item.mesh.position.y;
        const dz = playerPos.z - item.mesh.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);

        if (dist < maxMagnetDistance && item.mesh.position.z < playerPos.z + 1.5) {
          // Quadratic accelerating suction factor
          const pullProgress = Math.max(0, 1 - dist / maxMagnetDistance);
          const acceleration = (0.18 + pullProgress * pullProgress * 0.52) * (dt * 60);

          // Inward swirling vortex component (swirls items gently as they fly in)
          const swirlFactor = Math.sin(simTime * 8 + item.phase) * (1 - pullProgress) * 0.08;

          item.mesh.position.x += (dx + swirlFactor) * acceleration;
          item.mesh.position.y += dy * acceleration;
          item.mesh.position.z += (dz + 1.5) * acceleration;

          // Extra forward suction to guarantee catching before player passes
          item.mesh.position.z += (0.35 + pullProgress * 0.75) * (dt * 60);

          // Fast spinning head effect while flying into magnet
          if (item.headGroup) {
            item.headGroup.rotation.z += (0.25 + pullProgress * 0.7) * (dt * 60);
          }
        }
      }

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
    this.flowerHeadMat.dispose();
    this.petalMat.dispose();
    this.leafMat.dispose();
    this.glowSpriteMat.dispose();

    this.headGeo.dispose();
    this.petalGeo.dispose();
    this.stalkGeo.dispose();
    this.leafGeo.dispose();
  }
}
