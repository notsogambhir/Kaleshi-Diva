import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
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
  public onSunflowerMissed?: () => void;
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
  private combinedPetalsGeo: THREE.BufferGeometry;
  private combinedStalkLeavesGeo: THREE.BufferGeometry;

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
        depthWrite: false,
        fog: false,
      })
    );

    this.headGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16);
    this.petalGeo = new THREE.SphereGeometry(0.14, 8, 8);
    this.petalGeo.scale(1.0, 0.2, 2.0);
    this.stalkGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6);
    this.leafGeo = new THREE.SphereGeometry(0.15, 6, 6);
    this.leafGeo.scale(1, 0.2, 0.5);

    // Pre-merge 12 Petals into a single high-performance static BufferGeometry
    const petalGeometries: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 12; i++) {
      const pGeo = this.petalGeo.clone();
      const angle = (i / 12) * Math.PI * 2;
      pGeo.rotateZ(angle);
      pGeo.translate(Math.cos(angle) * 0.35, Math.sin(angle) * 0.35, 0);
      petalGeometries.push(pGeo);
    }
    this.combinedPetalsGeo = mergeGeometries(petalGeometries, false)!;
    petalGeometries.forEach((g) => g.dispose());

    // Pre-merge Stalk and 2 Leaves into a single high-performance static BufferGeometry
    const stalkGeoClone = this.stalkGeo.clone();
    stalkGeoClone.translate(0, -0.75, 0);

    const leaf1Clone = this.leafGeo.clone();
    leaf1Clone.rotateZ(Math.PI / 4);
    leaf1Clone.translate(0.15, -0.6, 0);

    const leaf2Clone = this.leafGeo.clone();
    leaf2Clone.rotateZ(-Math.PI / 4);
    leaf2Clone.translate(-0.15, -1.0, 0);

    this.combinedStalkLeavesGeo = mergeGeometries([stalkGeoClone, leaf1Clone, leaf2Clone], false)!;
    stalkGeoClone.dispose();
    leaf1Clone.dispose();
    leaf2Clone.dispose();

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

    const petals = new THREE.Mesh(this.combinedPetalsGeo, this.petalMat);
    headGroup.add(petals);

    const glowSprite = new THREE.Sprite(this.glowSpriteMat);
    glowSprite.scale.set(1.4, 1.4, 1.4);
    glowSprite.position.set(0, 0, 0.08);
    headGroup.add(glowSprite);

    group.add(headGroup);

    const stalkAndLeaves = new THREE.Mesh(this.combinedStalkLeavesGeo, this.leafMat);
    group.add(stalkAndLeaves);

    group.userData = { headGroup, stalkAndLeaves };
    return group;
  }

  public spawnSingle(zPos: number, lane: number, yPos = 1.5, isSky = false): SunflowerItem {
    const laneWidth = 4;
    const xPos = (lane - 1) * laneWidth;

    const group = this.pool.acquire();
    group.position.set(xPos, yPos, zPos);

    const stalkAndLeaves = group.userData.stalkAndLeaves as THREE.Mesh;
    const isFloating = yPos > 2.0 || isSky;
    if (stalkAndLeaves) stalkAndLeaves.visible = !isFloating;

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
        const maxMagnetDistance = 36 + speed * 38;
        const targetY = playerPos.y + 1.1;
        const dx = playerPos.x - item.mesh.position.x;
        const dy = targetY - item.mesh.position.y;
        const dz = playerPos.z - item.mesh.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);

        if (dist < maxMagnetDistance && item.mesh.position.z < playerPos.z + 1.8) {
          // Gravitational acceleration curve (eased exponential)
          const pullProgress = Math.max(0, 1 - dist / maxMagnetDistance);
          const acceleration = (0.22 + pullProgress * pullProgress * 0.58) * (dt * 60);

          // Inward swirling vortex component (swirls items smoothly into player)
          const swirlAngle = simTime * 10 + item.phase;
          const swirlRadius = (1 - pullProgress) * 0.14;
          const swirlX = Math.cos(swirlAngle) * swirlRadius;
          const swirlY = Math.sin(swirlAngle) * (swirlRadius * 0.5);

          item.mesh.position.x += (dx + swirlX) * acceleration;
          item.mesh.position.y += (dy + swirlY) * acceleration;
          item.mesh.position.z += (dz + 1.4) * acceleration;

          // Forward suction to guarantee catching
          item.mesh.position.z += (0.38 + pullProgress * 0.8) * (dt * 60);

          // Fast spinning head effect while flying into magnet
          if (item.headGroup) {
            item.headGroup.rotation.z += (0.3 + pullProgress * 0.8) * (dt * 60);
          }
        }
      }

      // Check if active flower was missed and passed behind the player
      if (item.active && item.mesh.position.z > playerPos.z + 1.2) {
        item.active = false;
        if (this.onSunflowerMissed) {
          this.onSunflowerMissed();
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
    this.combinedPetalsGeo.dispose();
    this.combinedStalkLeavesGeo.dispose();
  }
}
