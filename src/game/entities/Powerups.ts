import * as THREE from "three";
import { registerCurvedMaterial } from "../core/CurvedWorld";
import { ObjectPool } from "../core/Pool";
import { TextureGenerator } from "../TextureGenerator";

export type PowerupType = "shield" | "magnet" | "speed" | "dino";

export interface PowerupItem {
  mesh: THREE.Group;
  lane: number;
  type: PowerupType;
  active: boolean;
  phase: number;
}

export class PowerupManager {
  private container: THREE.Object3D;
  public activeItems: PowerupItem[] = [];
  private pool: ObjectPool<THREE.Group>;

  // Materials
  private goldMetalMat: THREE.MeshStandardMaterial;
  private goldShieldMat: THREE.MeshStandardMaterial;
  private darkMetalMat: THREE.MeshStandardMaterial;
  private redSpeedMat: THREE.MeshStandardMaterial;
  private blackMat: THREE.MeshStandardMaterial;
  private whiteMat: THREE.MeshStandardMaterial;
  private blueMat: THREE.MeshStandardMaterial;
  private greenDinoMat: THREE.MeshStandardMaterial;
  private amberDinoMat: THREE.MeshStandardMaterial;
  private glowSpriteMat: THREE.SpriteMaterial;

  // Shared Geometry Templates
  private chainGeo: THREE.TorusGeometry;
  private beadGeo: THREE.SphereGeometry;
  private spacerGeo: THREE.SphereGeometry;
  private eyeOuterGeo: THREE.CylinderGeometry;
  private eyeInnerGeo: THREE.CylinderGeometry;
  private eyePupilGeo: THREE.CylinderGeometry;
  private shieldStudGeo: THREE.SphereGeometry;
  private shieldConnGeo: THREE.CylinderGeometry;
  private shieldDomeGeo: THREE.SphereGeometry;
  private shieldDanglerGeo: THREE.SphereGeometry;
  private speedBaseGeo: THREE.CylinderGeometry;
  private speedTipGeo: THREE.CylinderGeometry;
  private dinoBodyGeo: THREE.SphereGeometry;
  private dinoHeadGeo: THREE.BoxGeometry;
  private dinoNeckGeo: THREE.CylinderGeometry;
  private dinoTailGeo: THREE.ConeGeometry;
  private dinoLegGeo: THREE.CylinderGeometry;
  private dinoArmGeo: THREE.CylinderGeometry;
  private dinoSpikeGeo: THREE.ConeGeometry;
  private dinoEyeGeo: THREE.SphereGeometry;

  constructor(container: THREE.Object3D) {
    this.container = container;

    this.goldMetalMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.15,
        emissive: 0x443300,
        emissiveIntensity: 0.25,
      })
    );
    this.goldShieldMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.85,
        roughness: 0.18,
        emissive: 0x553300,
        emissiveIntensity: 0.35,
      })
    );
    this.darkMetalMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.2 })
    );
    this.redSpeedMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xff3b30,
        roughness: 0.2,
        metalness: 0.4,
        emissive: 0xff1744,
        emissiveIntensity: 0.45,
      })
    );
    this.blackMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
    this.whiteMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
    this.blueMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.25,
        metalness: 0.3,
        emissive: 0x0369a1,
        emissiveIntensity: 0.2,
      })
    );
    this.greenDinoMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.5,
        metalness: 0.2,
        emissive: 0x15803d,
        emissiveIntensity: 0.25,
      })
    );
    this.amberDinoMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.4 })
    );

    this.glowSpriteMat = registerCurvedMaterial(
      new THREE.SpriteMaterial({
        map: TextureGenerator.getTexture("glow_radial"),
        blending: THREE.AdditiveBlending,
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        fog: false,
      })
    );

    this.chainGeo = new THREE.TorusGeometry(0.2, 0.015, 8, 24);
    this.beadGeo = new THREE.SphereGeometry(0.045, 8, 8);
    this.spacerGeo = new THREE.SphereGeometry(0.02, 6, 6);
    this.eyeOuterGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
    this.eyeInnerGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.025, 16);
    this.eyePupilGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8);
    this.shieldStudGeo = new THREE.SphereGeometry(0.08, 12, 12);
    this.shieldConnGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.15);
    this.shieldDomeGeo = new THREE.SphereGeometry(0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    this.shieldDanglerGeo = new THREE.SphereGeometry(0.03, 6, 6);
    this.speedBaseGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16);
    this.speedTipGeo = new THREE.CylinderGeometry(0.08, 0.02, 0.2, 16);
    this.dinoBodyGeo = new THREE.SphereGeometry(0.13, 10, 10);
    this.dinoHeadGeo = new THREE.BoxGeometry(0.12, 0.09, 0.16);
    this.dinoNeckGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.12, 6);
    this.dinoTailGeo = new THREE.ConeGeometry(0.065, 0.35, 8);
    this.dinoLegGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.16, 6);
    this.dinoArmGeo = new THREE.CylinderGeometry(0.02, 0.015, 0.08, 4);
    this.dinoSpikeGeo = new THREE.ConeGeometry(0.025, 0.06, 4);
    this.dinoEyeGeo = new THREE.SphereGeometry(0.02, 6, 6);

    this.pool = new ObjectPool<THREE.Group>(
      () => new THREE.Group(),
      (group) => {
        while (group.children.length > 0) {
          group.remove(group.children[0]);
        }
        group.position.set(0, 0, 100);
        group.rotation.set(0, 0, 0);
      },
      12
    );
  }

  public spawn(zPos: number, lane: number, type: PowerupType): PowerupItem {
    const laneWidth = 4;
    const xPos = (lane - 1) * laneWidth;

    const group = this.pool.acquire();
    this.buildPowerupMesh(group, type);

    const glow = new THREE.Sprite(this.glowSpriteMat);
    glow.scale.set(0.9, 0.9, 0.9);
    glow.position.set(0, 0, 0);
    group.add(glow);

    group.scale.set(2.4, 2.4, 2.4);
    group.position.set(xPos, 1.5, zPos);
    this.container.add(group);

    const item: PowerupItem = {
      mesh: group,
      lane,
      type,
      active: true,
      phase: Math.random() * Math.PI * 2,
    };

    this.activeItems.push(item);
    return item;
  }

  private buildPowerupMesh(group: THREE.Group, type: PowerupType): void {
    if (type === "magnet") {
      const chain = new THREE.Mesh(this.chainGeo, this.goldMetalMat);
      group.add(chain);

      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const bead = new THREE.Mesh(this.beadGeo, i % 2 === 0 ? this.blackMat : this.whiteMat);
        bead.position.set(Math.cos(angle) * 0.2, Math.sin(angle) * 0.2, 0);
        group.add(bead);

        const nextAngle = ((i + 0.5) / 16) * Math.PI * 2;
        const spacer = new THREE.Mesh(this.spacerGeo, this.goldMetalMat);
        spacer.position.set(Math.cos(nextAngle) * 0.2, Math.sin(nextAngle) * 0.2, 0);
        group.add(spacer);
      }

      const charmGroup = new THREE.Group();
      charmGroup.position.set(0, -0.25, 0);

      const eyeOuter = new THREE.Mesh(this.eyeOuterGeo, this.blueMat);
      eyeOuter.rotation.x = Math.PI / 2;
      charmGroup.add(eyeOuter);

      const eyeInner = new THREE.Mesh(this.eyeInnerGeo, this.whiteMat);
      eyeInner.rotation.x = Math.PI / 2;
      charmGroup.add(eyeInner);

      const eyePupil = new THREE.Mesh(this.eyePupilGeo, this.blackMat);
      eyePupil.rotation.x = Math.PI / 2;
      charmGroup.add(eyePupil);

      group.add(charmGroup);
    } else if (type === "shield") {
      const stud = new THREE.Mesh(this.shieldStudGeo, this.goldShieldMat);
      stud.position.y = 0.3;
      group.add(stud);

      const conn = new THREE.Mesh(this.shieldConnGeo, this.goldShieldMat);
      conn.position.y = 0.2;
      group.add(conn);

      const dome = new THREE.Mesh(this.shieldDomeGeo, this.goldShieldMat);
      dome.material.side = THREE.DoubleSide;
      dome.rotation.x = Math.PI;
      dome.position.y = 0.0;
      group.add(dome);

      for (let i = 0; i < 8; i++) {
        const dangler = new THREE.Mesh(this.shieldDanglerGeo, this.goldShieldMat);
        const ang = (i / 8) * Math.PI * 2;
        dangler.position.set(Math.cos(ang) * 0.14, -0.05, Math.sin(ang) * 0.14);
        group.add(dangler);
      }
    } else if (type === "speed") {
      const base = new THREE.Mesh(this.speedBaseGeo, this.darkMetalMat);
      const tip = new THREE.Mesh(this.speedTipGeo, this.redSpeedMat);
      tip.position.y = 0.25;
      tip.rotation.z = -0.15;
      group.add(base, tip);
    } else if (type === "dino") {
      const dinoGroup = new THREE.Group();

      // Sloping Sauropod Torso
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), this.greenDinoMat);
      body.scale.set(1.0, 0.85, 1.4);
      body.position.set(0, -0.02, 0);
      dinoGroup.add(body);

      // Long Arched Neck
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.26, 8), this.greenDinoMat);
      neck.position.set(0, 0.12, 0.11);
      neck.rotation.x = -0.55;
      dinoGroup.add(neck);

      // Head with Nasal Dome Crest
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), this.greenDinoMat);
      head.position.set(0, 0.24, 0.18);
      dinoGroup.add(head);

      const crest = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), this.amberDinoMat);
      crest.position.set(0, 0.28, 0.19);
      dinoGroup.add(crest);

      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), this.greenDinoMat);
      snout.position.set(0, 0.22, 0.23);
      dinoGroup.add(snout);

      // Eyes
      const eyeL = new THREE.Mesh(this.dinoEyeGeo, this.blackMat);
      eyeL.position.set(-0.045, 0.25, 0.2);
      const eyeR = new THREE.Mesh(this.dinoEyeGeo, this.blackMat);
      eyeR.position.set(0.045, 0.25, 0.2);
      dinoGroup.add(eyeL, eyeR);

      // Long Whiplash Tail
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.32, 6), this.greenDinoMat);
      tail.position.set(0, -0.04, -0.22);
      tail.rotation.x = -Math.PI / 2.3;
      dinoGroup.add(tail);

      // 4 Pillar Legs (Taller Front Legs)
      const frontLegGeo = new THREE.CylinderGeometry(0.035, 0.042, 0.2, 6);
      const hindLegGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.16, 6);

      const legFL = new THREE.Mesh(frontLegGeo, this.greenDinoMat);
      legFL.position.set(-0.1, -0.13, 0.1);
      const legFR = new THREE.Mesh(frontLegGeo, this.greenDinoMat);
      legFR.position.set(0.1, -0.13, 0.1);

      const legBL = new THREE.Mesh(hindLegGeo, this.greenDinoMat);
      legBL.position.set(-0.09, -0.15, -0.1);
      const legBR = new THREE.Mesh(hindLegGeo, this.greenDinoMat);
      legBR.position.set(0.09, -0.15, -0.1);

      dinoGroup.add(legFL, legFR, legBL, legBR);

      group.add(dinoGroup);
    }
  }

  public update(speed: number, dt: number, simTime: number): void {
    const deltaMove = speed * (dt * 60);

    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      const item = this.activeItems[i];
      item.mesh.position.z += deltaMove;
      item.mesh.rotation.y += 0.08 * (dt * 60);
      item.mesh.position.y = 1.5 + Math.sin(simTime * 3 + item.phase) * 0.2;

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

    this.goldMetalMat.dispose();
    this.goldShieldMat.dispose();
    this.darkMetalMat.dispose();
    this.redSpeedMat.dispose();
    this.blackMat.dispose();
    this.whiteMat.dispose();
    this.blueMat.dispose();
    this.greenDinoMat.dispose();
    this.amberDinoMat.dispose();
    this.glowSpriteMat.dispose();

    this.chainGeo.dispose();
    this.beadGeo.dispose();
    this.spacerGeo.dispose();
    this.eyeOuterGeo.dispose();
    this.eyeInnerGeo.dispose();
    this.eyePupilGeo.dispose();
    this.shieldStudGeo.dispose();
    this.shieldConnGeo.dispose();
    this.shieldDomeGeo.dispose();
    this.shieldDanglerGeo.dispose();
    this.speedBaseGeo.dispose();
    this.speedTipGeo.dispose();
    this.dinoBodyGeo.dispose();
    this.dinoHeadGeo.dispose();
    this.dinoNeckGeo.dispose();
    this.dinoTailGeo.dispose();
    this.dinoLegGeo.dispose();
    this.dinoArmGeo.dispose();
    this.dinoSpikeGeo.dispose();
    this.dinoEyeGeo.dispose();
  }
}
