import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { registerCurvedMaterial } from "../core/CurvedWorld";
import { TextureGenerator } from "../TextureGenerator";

export type OutfitId = "sunflower" | "dino";

export const JUMP_FORCE = 0.31;
export const JUMP_GRAVITY = -0.022;
export const JUMP_APEX = (JUMP_FORCE ** 2) / (2 * Math.abs(JUMP_GRAVITY));
export const COLLECT_CENTER_OFFSET = 0.9;

export class Player {
  public mesh: THREE.Group;
  public laneWidth = 4;
  public currentLane = 1; // 0: Left, 1: Center, 2: Right

  // State
  public isJumping = false;
  public isDucking = false;
  public isBoosting = false;
  public isMounted = false;

  // Authoritative simulation & previous tick state for render interpolation (Fixes defect #12)
  public simPosition: THREE.Vector3 = new THREE.Vector3();
  public prevPosition: THREE.Vector3 = new THREE.Vector3();

  private jumpVelocity = 0;
  private duckTimer = 0;
  private targetX = 0;
  private velocityX = 0;

  // Impact tumble physics
  public impactY = 0;
  public impactZ = 0;
  public impactRotX = 0;

  // Body parts
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private bodyGroup: THREE.Group;
  private headGroup: THREE.Group;
  private contactShadow: THREE.Mesh;
  private shieldMesh: THREE.Group;
  private dinoMountGroup: THREE.Group;

  // Materials
  private skinMat: THREE.MeshStandardMaterial;
  private dressMat: THREE.MeshStandardMaterial;
  private hairMat: THREE.MeshStandardMaterial;
  private blackMat: THREE.MeshStandardMaterial;
  private goldMat: THREE.MeshStandardMaterial;
  private shadowMat: THREE.MeshBasicMaterial;
  private dinoMountSkinMat: THREE.MeshStandardMaterial;
  private dinoMountBellyMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Group();
    this.mesh.rotation.y = Math.PI;

    // 1. Materials - All wrapped in registerCurvedMaterial
    this.skinMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.5 }));
    this.dressMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("dress"),
        roughness: 0.4,
      })
    );
    this.hairMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9 }));
    this.blackMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
    this.goldMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.15, metalness: 0.85 }));
    
    this.shadowMat = registerCurvedMaterial(
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      })
    );

    this.dinoMountSkinMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 }));
    this.dinoMountBellyMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8 }));

    // 2. Legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8);
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.2, 0.8, 0);
    const legMeshL = new THREE.Mesh(legGeo, this.skinMat);
    legMeshL.position.y = -0.35;
    legMeshL.castShadow = true;
    this.leftLeg.add(legMeshL);
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.2, 0.8, 0);
    const legMeshR = new THREE.Mesh(legGeo, this.skinMat);
    legMeshR.position.y = -0.35;
    legMeshR.castShadow = true;
    this.rightLeg.add(legMeshR);
    this.mesh.add(this.rightLeg);

    // 3. Body Group
    this.bodyGroup = new THREE.Group();
    this.mesh.add(this.bodyGroup);

    // Skirt
    const skirtGeo = new THREE.ConeGeometry(0.5, 0.8, 24, 1, true);
    const skirt = new THREE.Mesh(skirtGeo, this.dressMat);
    skirt.position.y = 0.9;
    skirt.castShadow = true;
    this.bodyGroup.add(skirt);

    // Torso
    const torsoGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.6, 16);
    const torso = new THREE.Mesh(torsoGeo, this.dressMat);
    torso.position.y = 1.5;
    torso.castShadow = true;
    this.bodyGroup.add(torso);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8);
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.35, 1.7, 0);
    const armMeshL = new THREE.Mesh(armGeo, this.skinMat);
    armMeshL.position.y = -0.3;
    armMeshL.castShadow = true;
    this.leftArm.add(armMeshL);
    this.bodyGroup.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.35, 1.7, 0);
    const armMeshR = new THREE.Mesh(armGeo, this.skinMat);
    armMeshR.position.y = -0.3;
    armMeshR.castShadow = true;
    this.rightArm.add(armMeshR);
    this.bodyGroup.add(this.rightArm);

    // Head
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 1.9;
    this.bodyGroup.add(this.headGroup);

    const headGeo = new THREE.SphereGeometry(0.32, 24, 24);
    const head = new THREE.Mesh(headGeo, this.skinMat);
    head.castShadow = true;
    this.headGroup.add(head);

    // Face
    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeo, this.blackMat);
    leftEye.position.set(-0.1, 0.05, 0.28);
    this.headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, this.blackMat);
    rightEye.position.set(0.1, 0.05, 0.28);
    this.headGroup.add(rightEye);

    const smileGeo = new THREE.TorusGeometry(0.08, 0.02, 2, 8, Math.PI);
    const smile = new THREE.Mesh(smileGeo, this.blackMat);
    smile.position.set(0, -0.1, 0.28);
    smile.rotation.z = Math.PI;
    this.headGroup.add(smile);

    // Hair accessory
    const accGeo = new THREE.CircleGeometry(0.14, 8);
    const acc = new THREE.Mesh(accGeo, this.goldMat);
    acc.position.set(0.32, 0.1, 0.2);
    acc.rotation.y = Math.PI / 2;
    this.headGroup.add(acc);

    // Full 240 merged curls
    this.buildFullMergedHair();

    // 4. Shield Aura Group
    this.shieldMesh = new THREE.Group();
    const shieldDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7),
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      })
    );
    this.shieldMesh.add(shieldDome);
    this.shieldMesh.position.y = 1.2;
    this.shieldMesh.visible = false;
    this.mesh.add(this.shieldMesh);

    // 5. 3D Dino Mount (Activated during Dino Ride powerup)
    this.dinoMountGroup = this.buildDinoMount();
    this.dinoMountGroup.visible = false;
    this.mesh.add(this.dinoMountGroup);

    // 6. Soft Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(1.2, 0.8);
    this.contactShadow = new THREE.Mesh(shadowGeo, this.shadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.02;
    scene.add(this.contactShadow);

    scene.add(this.mesh);
  }

  private buildFullMergedHair(): void {
    const capGeo = new THREE.SphereGeometry(0.31, 24, 24);
    capGeo.translate(0, 0.05, -0.05);

    const curlGeometries: THREE.BufferGeometry[] = [capGeo];
    const baseCurl = new THREE.SphereGeometry(0.12, 6, 6);

    for (let i = 0; i < 150; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.36;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      if (z > 0.15 && y > -0.15 && y < 0.3) continue;

      const g = baseCurl.clone();
      const scale = 0.8 + Math.random() * 0.4;
      g.scale(scale, scale, scale);
      g.translate(x, y, z);
      curlGeometries.push(g);
    }

    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.38 + Math.random() * 0.05;
      const lx = Math.cos(angle) * radius;
      const lz = Math.sin(angle) * radius;
      if (lz > 0.15) continue;
      const ly = -0.1 - Math.random() * 0.55;

      const g = baseCurl.clone();
      g.translate(lx, ly, lz);
      curlGeometries.push(g);
    }

    const mergedHairGeo = mergeGeometries(curlGeometries, false);
    const mergedHairMesh = new THREE.Mesh(mergedHairGeo, this.hairMat);
    mergedHairMesh.castShadow = true;
    this.headGroup.add(mergedHairMesh);

    baseCurl.dispose();
  }

  private buildDinoMount(): THREE.Group {
    const mount = new THREE.Group();

    const bodyGeo = new THREE.SphereGeometry(0.65, 16, 16);
    const body = new THREE.Mesh(bodyGeo, this.dinoMountSkinMat);
    body.scale.set(1.1, 0.8, 1.4);
    body.position.set(0, 0.7, 0);
    body.castShadow = true;
    mount.add(body);

    const bellyGeo = new THREE.SphereGeometry(0.5, 12, 12);
    const belly = new THREE.Mesh(bellyGeo, this.dinoMountBellyMat);
    belly.scale.set(0.9, 0.7, 1.1);
    belly.position.set(0, 0.55, 0.1);
    mount.add(belly);

    const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const head = new THREE.Mesh(headGeo, this.dinoMountSkinMat);
    head.position.set(0, 1.1, 0.7);
    mount.add(head);

    const snoutGeo = new THREE.SphereGeometry(0.22, 10, 10);
    const snout = new THREE.Mesh(snoutGeo, this.dinoMountSkinMat);
    snout.scale.set(1, 0.8, 1.3);
    snout.position.set(0, 1.05, 1.0);
    mount.add(snout);

    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, this.blackMat);
    eyeL.position.set(-0.2, 1.25, 0.85);
    const eyeR = new THREE.Mesh(eyeGeo, this.blackMat);
    eyeR.position.set(0.2, 1.25, 0.85);
    mount.add(eyeL, eyeR);

    const dinoLegGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.6, 8);
    const legFL = new THREE.Mesh(dinoLegGeo, this.dinoMountSkinMat);
    legFL.position.set(-0.4, 0.3, 0.4);
    const legFR = new THREE.Mesh(dinoLegGeo, this.dinoMountSkinMat);
    legFR.position.set(0.4, 0.3, 0.4);
    const legBL = new THREE.Mesh(dinoLegGeo, this.dinoMountSkinMat);
    legBL.position.set(-0.4, 0.3, -0.4);
    const legBR = new THREE.Mesh(dinoLegGeo, this.dinoMountSkinMat);
    legBR.position.set(0.4, 0.3, -0.4);
    mount.add(legFL, legFR, legBL, legBR);

    const tailGeo = new THREE.ConeGeometry(0.2, 0.8, 8);
    const tail = new THREE.Mesh(tailGeo, this.dinoMountSkinMat);
    tail.rotation.x = -Math.PI / 3;
    tail.position.set(0, 0.7, -0.9);
    mount.add(tail);

    mount.userData = { legFL, legFR, legBL, legBR, tail };
    return mount;
  }

  public setOutfit(outfitId: OutfitId): void {
    if (outfitId === "dino") {
      this.dressMat.map = TextureGenerator.getTexture("dress_dino");
    } else {
      this.dressMat.map = TextureGenerator.getTexture("dress");
    }
    this.dressMat.needsUpdate = true;
  }

  public setDinoMount(mounted: boolean): void {
    this.isMounted = mounted;
    this.dinoMountGroup.visible = mounted;
  }

  public moveLeft(): boolean {
    if (this.currentLane > 0) {
      this.currentLane--;
      return true;
    }
    return false;
  }

  public moveRight(): boolean {
    if (this.currentLane < 2) {
      this.currentLane++;
      return true;
    }
    return false;
  }

  public jump(): boolean {
    if (this.isDucking) {
      this.cancelDuck();
    }

    if (!this.isJumping && !this.isBoosting) {
      this.isJumping = true;
      this.jumpVelocity = JUMP_FORCE;
      return true;
    }
    return false;
  }

  public duck(): boolean {
    if (this.isJumping) {
      this.jumpVelocity = -0.35;
      return true;
    }
    if (!this.isJumping && !this.isDucking && !this.isBoosting) {
      this.isDucking = true;
      this.duckTimer = 28;
      return true;
    }
    return false;
  }

  public cancelDuck(): void {
    if (this.isDucking) {
      this.isDucking = false;
      this.duckTimer = 0;
      this.bodyGroup.scale.y = 1.0;
      this.bodyGroup.position.y = 0;
    }
  }

  public setShield(visible: boolean): void {
    this.shieldMesh.visible = visible;
  }

  public triggerImpact(): void {
    this.impactY = 0.4;
    this.impactZ = 0.5;
    this.impactRotX = -0.5;
  }

  public reset(): void {
    this.currentLane = 1;
    this.targetX = 0;
    this.velocityX = 0;
    this.isJumping = false;
    this.isDucking = false;
    this.isBoosting = false;
    this.isMounted = false;
    this.jumpVelocity = 0;
    this.duckTimer = 0;
    this.impactY = 0;
    this.impactZ = 0;
    this.impactRotX = 0;

    this.simPosition.set(0, 0, 0);
    this.prevPosition.set(0, 0, 0);
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, Math.PI, 0);
    this.bodyGroup.scale.y = 1.0;
    this.bodyGroup.position.y = 0;
    this.shieldMesh.visible = false;
    this.dinoMountGroup.visible = false;
  }

  public interpolateRender(alpha: number): void {
    // Pure visual interpolation between discrete simulation states
    this.mesh.position.lerpVectors(this.prevPosition, this.simPosition, alpha);
    this.contactShadow.position.x = this.mesh.position.x;
    this.contactShadow.position.z = this.mesh.position.z;
  }

  public update(dt: number, simTime: number): void {
    // Capture state before physics for render interpolation (Fixes defect #12)
    this.prevPosition.copy(this.simPosition);

    // 1. Horizontal lane transition spring physics (authoritative on simPosition)
    this.targetX = (this.currentLane - 1) * this.laneWidth;
    this.velocityX += (this.targetX - this.simPosition.x) * 0.08 * (dt * 60);
    this.velocityX *= Math.pow(0.82, dt * 60);
    this.simPosition.x += this.velocityX * (dt * 60);

    // 2. Vertical Jump / Boost / Duck Physics
    if (this.isBoosting) {
      this.simPosition.y = THREE.MathUtils.lerp(this.simPosition.y, 3.0, 0.12 * (dt * 60));
      this.leftLeg.rotation.x = 0.4;
      this.rightLeg.rotation.x = 0.4;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
    } else if (this.isJumping) {
      this.simPosition.y += this.jumpVelocity * (dt * 60);
      this.jumpVelocity += JUMP_GRAVITY * (dt * 60);

      if (this.simPosition.y <= 0) {
        this.simPosition.y = 0;
        this.isJumping = false;
        this.jumpVelocity = 0;
      }

      this.leftLeg.rotation.x = -0.5;
      this.rightLeg.rotation.x = -0.2;
      this.leftArm.rotation.x = -2.5;
      this.rightArm.rotation.x = -2.5;
    } else if (this.isDucking) {
      this.duckTimer -= dt * 60;
      if (this.duckTimer <= 0) {
        this.cancelDuck();
      } else {
        this.bodyGroup.scale.y = 0.5;
        this.bodyGroup.position.y = 0;
      }
    } else {
      if (this.simPosition.y > 0.05) {
        this.simPosition.y = THREE.MathUtils.lerp(this.simPosition.y, 0, 0.15 * (dt * 60));
      } else {
        this.simPosition.y = 0;
      }

      if (this.isMounted) {
        // Seated gripping riding pose
        const t = simTime * 16;
        this.leftLeg.rotation.x = 0.55;
        this.leftLeg.rotation.z = -0.25;
        this.rightLeg.rotation.x = 0.55;
        this.rightLeg.rotation.z = 0.25;
        this.leftArm.rotation.x = 0.45;
        this.rightArm.rotation.x = 0.45;
        this.bodyGroup.position.y = Math.sin(t) * 0.04;

        const dInfo = this.dinoMountGroup.userData as {
          legFL?: THREE.Mesh;
          legFR?: THREE.Mesh;
          legBL?: THREE.Mesh;
          legBR?: THREE.Mesh;
          tail?: THREE.Mesh;
        };
        if (dInfo.legFL) {
          dInfo.legFL.rotation.x = Math.sin(t) * 0.6;
          if (dInfo.legBR) dInfo.legBR.rotation.x = Math.sin(t) * 0.6;
          if (dInfo.legFR) dInfo.legFR.rotation.x = Math.sin(t + Math.PI) * 0.6;
          if (dInfo.legBL) dInfo.legBL.rotation.x = Math.sin(t + Math.PI) * 0.6;
          if (dInfo.tail) dInfo.tail.rotation.y = Math.sin(t * 0.5) * 0.3;
        }
      } else {
        // Standard running stride pose
        this.leftLeg.rotation.z = 0;
        this.rightLeg.rotation.z = 0;
        this.bodyGroup.position.y = 0;

        const t = simTime * 12;
        this.leftLeg.rotation.x = Math.sin(t) * 0.65;
        this.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.65;
        this.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.65;
        this.rightArm.rotation.x = Math.sin(t) * 0.65;
      }
    }

    // 3. Dynamic banking & tilts
    const bankAngle = -this.velocityX * 0.45;
    this.mesh.rotation.z = Math.sin(simTime * 8) * 0.04 + bankAngle;
    this.mesh.rotation.x = this.isJumping ? 0.25 : this.isDucking ? 0.75 : 0.12;

    // 4. Shield aura spin
    if (this.shieldMesh.visible) {
      this.shieldMesh.rotation.y += 0.08 * (dt * 60);
      this.shieldMesh.position.y = 1.2 + Math.sin(simTime * 4) * 0.1;
    }

    // Shadow scaling
    const shadowScale = Math.max(0.3, 1 - this.simPosition.y / 4);
    this.contactShadow.scale.set(shadowScale, shadowScale, shadowScale);
    this.shadowMat.opacity = 0.35 * shadowScale;
  }

  public updateTumble(dt: number): void {
    if (this.impactY !== 0 || this.impactZ !== 0) {
      this.simPosition.y += this.impactY * (dt * 60);
      this.simPosition.z += this.impactZ * (dt * 60);
      this.mesh.rotation.x += this.impactRotX * (dt * 60);

      this.impactY += JUMP_GRAVITY * 1.6 * (dt * 60);
      this.impactZ *= Math.pow(0.9, dt * 60);
      this.impactRotX *= Math.pow(0.95, dt * 60);

      if (this.simPosition.y <= 0) {
        this.simPosition.y = 0;
        this.impactY = 0;
        this.impactZ = 0;
        this.impactRotX = 0;
        this.mesh.rotation.x = -Math.PI / 2 + 0.15;
      }
    }
  }

  public dispose(): void {
    this.skinMat.dispose();
    this.dressMat.dispose();
    this.hairMat.dispose();
    this.blackMat.dispose();
    this.goldMat.dispose();
    this.shadowMat.dispose();
    this.dinoMountSkinMat.dispose();
    this.dinoMountBellyMat.dispose();
    this.contactShadow.geometry.dispose();
  }
}
