import * as THREE from "three";
import { registerCurvedMaterial } from "../core/CurvedWorld";
import { ObjectPool } from "../core/Pool";
import { TextureGenerator } from "../TextureGenerator";
import { BiomeType } from "./Biomes";

export interface SceneryItem {
  mesh: THREE.Group;
  biome: BiomeType;
  type: string;
  phase: number;
  swaySpeed: number;
  isPlant: boolean;
  isWaterPlant: boolean;
  isDino: boolean;
}

export class SceneryManager {
  private container: THREE.Object3D;
  public activeItems: SceneryItem[] = [];
  private pool: ObjectPool<THREE.Group>;

  // Shared Materials
  private woodMat: THREE.MeshStandardMaterial;
  private leafMat: THREE.MeshStandardMaterial;
  private roseMat: THREE.MeshStandardMaterial;
  private redMat: THREE.MeshStandardMaterial;
  private whiteMat: THREE.MeshStandardMaterial;
  private goldMat: THREE.MeshStandardMaterial;
  private flowerHeadMat: THREE.MeshStandardMaterial;
  private rockMat: THREE.MeshStandardMaterial;
  private dinoMat: THREE.MeshStandardMaterial;
  private dinoHornMat: THREE.MeshStandardMaterial;

  // Shared Geometry Templates
  private trunkGeo: THREE.CylinderGeometry;
  private canopyLargeGeo: THREE.DodecahedronGeometry;
  private canopyMedGeo: THREE.DodecahedronGeometry;
  private appleGeo: THREE.SphereGeometry;
  private bushGeo1: THREE.DodecahedronGeometry;
  private bushGeo2: THREE.DodecahedronGeometry;
  private flowerHeadGeo: THREE.SphereGeometry;
  private flowerCenterGeo: THREE.SphereGeometry;
  private waterPadGeo: THREE.CylinderGeometry;
  private waterLotusGeo: THREE.SphereGeometry;
  private cattailStemGeo: THREE.CylinderGeometry;
  private cattailTopGeo: THREE.CylinderGeometry;
  private jungleTrunkGeo: THREE.CylinderGeometry;
  private jungleCanopy1Geo: THREE.DodecahedronGeometry;
  private jungleCanopy2Geo: THREE.DodecahedronGeometry;
  private fernFrondGeo: THREE.SphereGeometry;
  private cycadTrunkGeo: THREE.CylinderGeometry;
  private cycadFrondGeo: THREE.SphereGeometry;
  private rockLargeGeo: THREE.DodecahedronGeometry;
  private rockMedGeo: THREE.DodecahedronGeometry;

  // Ground Dino Geometries
  private brachioBodyGeo: THREE.SphereGeometry;
  private brachioNeckGeo: THREE.CylinderGeometry;
  private brachioHeadGeo: THREE.SphereGeometry;
  private brachioLegGeo: THREE.CylinderGeometry;
  private triceratopsBodyGeo: THREE.SphereGeometry;
  private triceratopsFrillGeo: THREE.CylinderGeometry;
  private triceratopsHornGeo: THREE.ConeGeometry;

  constructor(container: THREE.Object3D) {
    this.container = container;

    this.woodMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("wood"),
        roughness: 0.9,
      })
    );
    this.leafMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("leaf"),
        roughness: 0.8,
      })
    );
    this.roseMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("rose"),
        roughness: 0.8,
      })
    );
    this.redMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.5 }));
    this.whiteMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
    this.goldMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3 }));
    this.flowerHeadMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9 }));
    this.rockMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x616161, roughness: 0.95 }));
    this.dinoMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x365314, roughness: 0.85 }));
    this.dinoHornMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 }));

    this.trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 2, 8);
    this.canopyLargeGeo = new THREE.DodecahedronGeometry(1.2);
    this.canopyMedGeo = new THREE.DodecahedronGeometry(0.9);
    this.appleGeo = new THREE.SphereGeometry(0.12, 6, 6);
    this.bushGeo1 = new THREE.DodecahedronGeometry(0.8);
    this.bushGeo2 = new THREE.DodecahedronGeometry(0.6);
    this.flowerHeadGeo = new THREE.SphereGeometry(0.12, 6, 6);
    this.flowerCenterGeo = new THREE.SphereGeometry(0.06, 6, 6);
    this.waterPadGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.05, 12);
    this.waterLotusGeo = new THREE.SphereGeometry(0.28, 8, 8);
    this.cattailStemGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 4);
    this.cattailTopGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.45, 6);
    this.jungleTrunkGeo = new THREE.CylinderGeometry(0.65, 1.1, 5, 8);
    this.jungleCanopy1Geo = new THREE.DodecahedronGeometry(2.0);
    this.jungleCanopy2Geo = new THREE.DodecahedronGeometry(1.6);
    this.fernFrondGeo = new THREE.SphereGeometry(0.25, 6, 6);
    this.fernFrondGeo.scale(0.8, 6, 2.5);
    this.cycadTrunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 3, 6);
    this.cycadFrondGeo = new THREE.SphereGeometry(0.2, 6, 6);
    this.cycadFrondGeo.scale(0.6, 4, 1.8);
    this.rockLargeGeo = new THREE.DodecahedronGeometry(1.2);
    this.rockMedGeo = new THREE.DodecahedronGeometry(0.7);

    this.brachioBodyGeo = new THREE.SphereGeometry(2.2, 10, 10);
    this.brachioBodyGeo.scale(1.0, 0.8, 1.6);
    this.brachioNeckGeo = new THREE.CylinderGeometry(0.35, 0.6, 5.5, 8);
    this.brachioHeadGeo = new THREE.SphereGeometry(0.6, 8, 8);
    this.brachioLegGeo = new THREE.CylinderGeometry(0.35, 0.45, 2.8, 6);
    this.triceratopsBodyGeo = new THREE.SphereGeometry(1.4, 10, 10);
    this.triceratopsBodyGeo.scale(1.1, 0.9, 1.4);
    this.triceratopsFrillGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.15, 10);
    this.triceratopsHornGeo = new THREE.ConeGeometry(0.12, 0.8, 6);

    this.pool = new ObjectPool<THREE.Group>(
      () => new THREE.Group(),
      (group) => {
        while (group.children.length > 0) {
          group.remove(group.children[0]);
        }
        group.position.set(0, 0, 100);
        group.rotation.set(0, 0, 0);
      },
      35
    );
  }

  public spawn(zPos: number, currentBiome: BiomeType): void {
    const side = Math.random() > 0.5 ? -1 : 1;
    const isGroundDino = currentBiome === "dino" && Math.random() < 0.25;
    const distanceOffset = isGroundDino ? 22 + Math.random() * 12 : 7.5 + Math.random() * 8.5;
    const xPos = side * distanceOffset;

    const group = this.pool.acquire();
    this.populateSceneryMesh(group, currentBiome, isGroundDino);

    group.position.set(xPos, 0, zPos);
    this.container.add(group);

    const item: SceneryItem = {
      mesh: group,
      biome: currentBiome,
      type: isGroundDino ? "dino" : "scenery",
      phase: Math.random() * Math.PI * 2,
      swaySpeed: 1.5 + Math.random() * 1.0,
      isPlant: currentBiome !== "lake" && !isGroundDino,
      isWaterPlant: currentBiome === "lake",
      isDino: isGroundDino,
    };

    this.activeItems.push(item);
  }

  private populateSceneryMesh(group: THREE.Group, biome: BiomeType, isGroundDino = false): void {
    const rand = Math.random();

    if (isGroundDino) {
      if (rand > 0.5) {
        const body = new THREE.Mesh(this.brachioBodyGeo, this.dinoMat);
        body.position.y = 2.8;
        body.castShadow = true;
        group.add(body);

        const neckGroup = new THREE.Group();
        neckGroup.position.set(0, 3.2, 1.8);
        neckGroup.rotation.x = -Math.PI * 0.18;

        const neck = new THREE.Mesh(this.brachioNeckGeo, this.dinoMat);
        neck.position.y = 2.75;
        neckGroup.add(neck);

        const head = new THREE.Mesh(this.brachioHeadGeo, this.dinoMat);
        head.position.set(0, 5.5, 0.4);
        neckGroup.add(head);

        group.add(neckGroup);
        group.userData = { neckGroup };

        for (let i = 0; i < 4; i++) {
          const leg = new THREE.Mesh(this.brachioLegGeo, this.dinoMat);
          const lx = (i % 2 === 0 ? -1 : 1) * 0.9;
          const lz = (i < 2 ? -1 : 1) * 1.2;
          leg.position.set(lx, 1.4, lz);
          leg.castShadow = true;
          group.add(leg);
        }
      } else {
        const body = new THREE.Mesh(this.triceratopsBodyGeo, this.dinoMat);
        body.position.y = 1.4;
        body.castShadow = true;
        group.add(body);

        const frill = new THREE.Mesh(this.triceratopsFrillGeo, this.dinoMat);
        frill.position.set(0, 2.0, 1.4);
        frill.rotation.x = Math.PI * 0.35;
        group.add(frill);

        const horn1 = new THREE.Mesh(this.triceratopsHornGeo, this.dinoHornMat);
        horn1.position.set(-0.4, 2.2, 1.7);
        horn1.rotation.x = Math.PI * 0.4;
        const horn2 = new THREE.Mesh(this.triceratopsHornGeo, this.dinoHornMat);
        horn2.position.set(0.4, 2.2, 1.7);
        horn2.rotation.x = Math.PI * 0.4;
        group.add(horn1, horn2);
      }
      return;
    }

    if (biome === "park") {
      if (rand > 0.5) {
        const trunk = new THREE.Mesh(this.trunkGeo, this.woodMat);
        trunk.position.y = 1;
        trunk.castShadow = true;
        group.add(trunk);

        const leaf1 = new THREE.Mesh(this.canopyLargeGeo, this.leafMat);
        leaf1.position.set(0, 2.4, 0);
        leaf1.castShadow = true;
        const leaf2 = new THREE.Mesh(this.canopyMedGeo, this.leafMat);
        leaf2.position.set(0.5, 2.0, 0.4);
        leaf2.castShadow = true;
        const leaf3 = new THREE.Mesh(this.canopyMedGeo, this.leafMat);
        leaf3.position.set(-0.5, 2.0, -0.4);
        leaf3.castShadow = true;
        group.add(leaf1, leaf2, leaf3);

        for (let a = 0; a < 4; a++) {
          const apple = new THREE.Mesh(this.appleGeo, this.redMat);
          apple.position.set((Math.random() - 0.5) * 1.5, 1.8 + Math.random() * 0.9, (Math.random() - 0.5) * 1.5);
          group.add(apple);
        }
      } else if (rand > 0.25) {
        const b1 = new THREE.Mesh(this.bushGeo1, this.roseMat);
        b1.position.y = 0.6;
        b1.castShadow = true;
        const b2 = new THREE.Mesh(this.bushGeo2, this.roseMat);
        b2.position.set(0.5, 0.4, 0.2);
        b2.castShadow = true;
        group.add(b1, b2);
      } else {
        for (let f = 0; f < 3; f++) {
          const head = new THREE.Mesh(this.flowerHeadGeo, this.whiteMat);
          head.position.set((f - 1) * 0.5, 0.35, (Math.random() - 0.5) * 0.5);
          const center = new THREE.Mesh(this.flowerCenterGeo, this.goldMat);
          center.position.set((f - 1) * 0.5, 0.4, (Math.random() - 0.5) * 0.5);
          group.add(head, center);
        }
      }
    } else if (biome === "lake") {
      if (rand > 0.5) {
        const pad = new THREE.Mesh(this.waterPadGeo, this.leafMat);
        pad.position.y = 0.05;
        group.add(pad);

        const flower = new THREE.Mesh(this.waterLotusGeo, this.roseMat);
        flower.scale.set(1, 0.5, 1);
        flower.position.set(0.15, 0.15, 0.15);
        group.add(flower);
      } else {
        for (let c = 0; c < 3; c++) {
          const stem = new THREE.Mesh(this.cattailStemGeo, this.leafMat);
          stem.position.set((c - 1) * 0.35, 0.9, (Math.random() - 0.5) * 0.3);
          const top = new THREE.Mesh(this.cattailTopGeo, this.flowerHeadMat);
          top.position.set((c - 1) * 0.35, 1.5, (Math.random() - 0.5) * 0.3);
          group.add(stem, top);
        }
      }
    } else if (biome === "sunset") {
      if (rand > 0.45) {
        const trunk = new THREE.Mesh(this.jungleTrunkGeo, this.woodMat);
        trunk.position.y = 2.5;
        trunk.castShadow = true;
        group.add(trunk);

        const l1 = new THREE.Mesh(this.jungleCanopy1Geo, this.leafMat);
        l1.position.set(0, 5.2, 0);
        l1.scale.set(1, 0.6, 1);
        l1.castShadow = true;
        const l2 = new THREE.Mesh(this.jungleCanopy2Geo, this.leafMat);
        l2.position.set(1.2, 4.4, 1.0);
        l2.scale.set(1, 0.6, 1);
        l2.castShadow = true;
        group.add(l1, l2);
      } else {
        for (let f = 0; f < 4; f++) {
          const frond = new THREE.Mesh(this.fernFrondGeo, this.leafMat);
          frond.position.y = 1.6;
          frond.castShadow = true;
          const pivot = new THREE.Group();
          pivot.add(frond);
          pivot.rotation.y = (f / 4) * Math.PI * 2;
          pivot.rotation.x = Math.PI * 0.28;
          group.add(pivot);
        }
      }
    } else if (biome === "dino") {
      if (rand > 0.5) {
        const trunk = new THREE.Mesh(this.cycadTrunkGeo, this.woodMat);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        group.add(trunk);

        for (let i = 0; i < 5; i++) {
          const frond = new THREE.Mesh(this.cycadFrondGeo, this.leafMat);
          frond.position.y = 1.2;
          const pivot = new THREE.Group();
          pivot.add(frond);
          pivot.position.y = 3.0;
          pivot.rotation.y = (i / 5) * Math.PI * 2;
          pivot.rotation.x = Math.PI * 0.35;
          group.add(pivot);
        }
      } else {
        const rock1 = new THREE.Mesh(this.rockLargeGeo, this.rockMat);
        rock1.position.set(0, 0.8, 0);
        rock1.scale.set(1.2, 0.8, 1.0);
        rock1.castShadow = true;

        const rock2 = new THREE.Mesh(this.rockMedGeo, this.rockMat);
        rock2.position.set(0.8, 0.4, 0.4);
        rock2.castShadow = true;

        group.add(rock1, rock2);
      }
    }
  }

  public update(speed: number, dt: number, simTime: number): void {
    const deltaMove = speed * (dt * 60);

    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      const item = this.activeItems[i];
      item.mesh.position.z += deltaMove;

      if (item.isPlant) {
        item.mesh.rotation.z = Math.sin(simTime * item.swaySpeed + item.phase) * 0.05;
        item.mesh.rotation.x = Math.sin(simTime * item.swaySpeed * 0.8 + item.phase) * 0.025;
      } else if (item.isWaterPlant) {
        item.mesh.position.y = Math.sin(simTime * 2.0 + item.phase) * 0.05;
      } else if (item.isDino) {
        const neck = item.mesh.userData.neckGroup as THREE.Group | undefined;
        if (neck) {
          neck.rotation.z = Math.sin(simTime * 0.8 + item.phase) * 0.08;
          neck.rotation.x = -Math.PI * 0.18 + Math.sin(simTime * 0.5 + item.phase) * 0.05;
        }
      }

      if (item.mesh.position.z > 20) {
        this.container.remove(item.mesh);
        this.pool.release(item.mesh);
        this.activeItems.splice(i, 1);
      }
    }
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
    this.leafMat.dispose();
    this.roseMat.dispose();
    this.redMat.dispose();
    this.whiteMat.dispose();
    this.goldMat.dispose();
    this.flowerHeadMat.dispose();
    this.rockMat.dispose();
    this.dinoMat.dispose();
    this.dinoHornMat.dispose();

    this.trunkGeo.dispose();
    this.canopyLargeGeo.dispose();
    this.canopyMedGeo.dispose();
    this.appleGeo.dispose();
    this.bushGeo1.dispose();
    this.bushGeo2.dispose();
    this.flowerHeadGeo.dispose();
    this.flowerCenterGeo.dispose();
    this.waterPadGeo.dispose();
    this.waterLotusGeo.dispose();
    this.cattailStemGeo.dispose();
    this.cattailTopGeo.dispose();
    this.jungleTrunkGeo.dispose();
    this.jungleCanopy1Geo.dispose();
    this.jungleCanopy2Geo.dispose();
    this.fernFrondGeo.dispose();
    this.cycadTrunkGeo.dispose();
    this.cycadFrondGeo.dispose();
    this.rockLargeGeo.dispose();
    this.rockMedGeo.dispose();

    this.brachioBodyGeo.dispose();
    this.brachioNeckGeo.dispose();
    this.brachioHeadGeo.dispose();
    this.brachioLegGeo.dispose();
    this.triceratopsBodyGeo.dispose();
    this.triceratopsFrillGeo.dispose();
    this.triceratopsHornGeo.dispose();
  }
}
