import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { registerCurvedMaterial } from "../core/CurvedWorld";
import { TextureGenerator } from "../TextureGenerator";
import { EffectsSystem } from "../systems/Effects";

export type OutfitId = "sunflower" | "dino";

export const JUMP_FORCE = 0.33;
export const JUMP_GRAVITY = -0.022;
export const JUMP_APEX_GRAVITY_MULT = 0.55;
export const JUMP_FALL_GRAVITY_MULT = 1.38;
export const DIVE_FORCE = -0.52;
export const JUMP_APEX = (JUMP_FORCE ** 2) / (2 * Math.abs(JUMP_GRAVITY));
export const COLLECT_CENTER_OFFSET = 0.9;

export class Player {
  public mesh: THREE.Group;
  public laneWidth = 4;
  public currentLane = 1; // 0: Left, 1: Center, 2: Right

  // State
  public isJumping = false;
  public isDiving = false;
  public isDucking = false;
  public isBoosting = false;
  public isMounted = false;

  // Authoritative simulation & previous tick state for render interpolation (Fixes defect #12)
  public simPosition: THREE.Vector3 = new THREE.Vector3();
  public prevPosition: THREE.Vector3 = new THREE.Vector3();

  public previousLane = 1;
  public stumbleTimer = 0;
  public velocityX = 0;
  public lateralAccX = 0;
  private jumpVelocity = 0;
  private duckTimer = 0;
  private targetX = 0;
  private landingSquash = 1.0;
  private squashVelocity = 0;
  private lastStepPhase = 0;
  public landedThisFrame: "normal" | "dive" | null = null;

  // Impact tumble physics
  public impactY = 0;
  public impactZ = 0;
  public impactRotX = 0;

  // Articulated Skeleton Groups
  private bodyGroup: THREE.Group;
  private headGroup: THREE.Group;
  private skirtMesh: THREE.Mesh;
  private scarfRibbonL: THREE.Mesh;
  private scarfRibbonR: THREE.Mesh;

  // Left Leg Chain
  private leftLeg: THREE.Group; // Hip
  private leftShin: THREE.Group; // Knee
  private leftFoot: THREE.Group; // Ankle

  // Right Leg Chain
  private rightLeg: THREE.Group; // Hip
  private rightShin: THREE.Group; // Knee
  private rightFoot: THREE.Group; // Ankle

  // Left Arm Chain
  private leftArm: THREE.Group; // Shoulder
  private leftForearm: THREE.Group; // Elbow

  // Right Arm Chain
  private rightArm: THREE.Group; // Shoulder
  private rightForearm: THREE.Group; // Elbow

  // Facial Animation Elements
  private leftEyelid: THREE.Mesh;
  private rightEyelid: THREE.Mesh;
  private leftEyebrow: THREE.Mesh;
  private rightEyebrow: THREE.Mesh;
  private hairCrownGroup: THREE.Group;

  // Powerups & Aux
  private contactShadow: THREE.Mesh;
  private shieldMesh: THREE.Group;
  private dinoMountGroup: THREE.Group;
  private magnetAuraGroup: THREE.Group;

  // Materials
  private skinMat: THREE.MeshStandardMaterial;
  private dressMat: THREE.MeshStandardMaterial;
  private hairMat: THREE.MeshStandardMaterial;
  private sneakerMat: THREE.MeshStandardMaterial;
  private blackMat: THREE.MeshStandardMaterial;
  private whiteMat: THREE.MeshStandardMaterial;
  private goldMat: THREE.MeshStandardMaterial;
  private blushMat: THREE.MeshBasicMaterial;
  private scarfMat: THREE.MeshStandardMaterial;
  private shadowMat: THREE.MeshBasicMaterial;
  private dinoMountSkinMat: THREE.MeshStandardMaterial;
  private dinoMountBellyMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Group();
    this.mesh.rotation.y = Math.PI;

    // 1. Stylized Materials
    this.skinMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xffd2a0,
        roughness: 0.45,
        metalness: 0.05,
      })
    );
    this.dressMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("dress"),
        roughness: 0.35,
        metalness: 0.1,
      })
    );
    this.hairMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x3d2314,
        roughness: 0.85,
        metalness: 0.05,
      })
    );
    this.sneakerMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("sneaker_diva"),
        roughness: 0.4,
        metalness: 0.15,
      })
    );
    this.blackMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.3,
      })
    );
    this.whiteMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
      })
    );
    this.goldMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.15,
        metalness: 0.9,
      })
    );
    this.blushMat = registerCurvedMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xff4081,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    this.scarfMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.3,
        side: THREE.DoubleSide,
      })
    );

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

    // 2. Articulated Legs (Thigh -> Knee/Shin -> Ankle/Sneaker)
    const legGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.36, 12);
    const shinGeo = new THREE.CylinderGeometry(0.072, 0.065, 0.36, 12);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.19, 0.82, 0);

    const thighMeshL = new THREE.Mesh(legGeo, this.skinMat);
    thighMeshL.position.y = -0.18;
    thighMeshL.castShadow = true;
    this.leftLeg.add(thighMeshL);

    this.leftShin = new THREE.Group();
    this.leftShin.position.set(0, -0.36, 0);

    const shinMeshL = new THREE.Mesh(shinGeo, this.skinMat);
    shinMeshL.position.y = -0.18;
    shinMeshL.castShadow = true;
    this.leftShin.add(shinMeshL);

    this.leftFoot = new THREE.Group();
    this.leftFoot.position.set(0, -0.36, 0);
    this.buildSneaker(this.leftFoot);
    this.leftShin.add(this.leftFoot);

    this.leftLeg.add(this.leftShin);
    this.mesh.add(this.leftLeg);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.19, 0.82, 0);

    const thighMeshR = new THREE.Mesh(legGeo, this.skinMat);
    thighMeshR.position.y = -0.18;
    thighMeshR.castShadow = true;
    this.rightLeg.add(thighMeshR);

    this.rightShin = new THREE.Group();
    this.rightShin.position.set(0, -0.36, 0);

    const shinMeshR = new THREE.Mesh(shinGeo, this.skinMat);
    shinMeshR.position.y = -0.18;
    shinMeshR.castShadow = true;
    this.rightShin.add(shinMeshR);

    this.rightFoot = new THREE.Group();
    this.rightFoot.position.set(0, -0.36, 0);
    this.buildSneaker(this.rightFoot);
    this.rightShin.add(this.rightFoot);

    this.rightLeg.add(this.rightShin);
    this.mesh.add(this.rightLeg);

    // 3. Body Group (Torso, Flared Pleated Skirt, Trailing Scarf)
    this.bodyGroup = new THREE.Group();
    this.mesh.add(this.bodyGroup);

    // Flared Pleated Skirt
    const skirtGeo = new THREE.ConeGeometry(0.52, 0.72, 24, 1, true);
    this.skirtMesh = new THREE.Mesh(skirtGeo, this.dressMat);
    this.skirtMesh.position.y = 0.92;
    this.skirtMesh.castShadow = true;
    this.bodyGroup.add(this.skirtMesh);

    // Upper Torso
    const torsoGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.55, 16);
    const torso = new THREE.Mesh(torsoGeo, this.dressMat);
    torso.position.y = 1.48;
    torso.castShadow = true;
    this.bodyGroup.add(torso);

    // Golden Choker Necklace
    const necklaceGeo = new THREE.TorusGeometry(0.18, 0.025, 8, 24);
    const necklace = new THREE.Mesh(necklaceGeo, this.goldMat);
    necklace.position.set(0, 1.76, 0);
    necklace.rotation.x = Math.PI / 2;
    this.bodyGroup.add(necklace);

    // Trailing Scarf Ribbons (attached behind neck)
    const ribbonGeo = new THREE.PlaneGeometry(0.12, 0.7, 4, 8);
    this.scarfRibbonL = new THREE.Mesh(ribbonGeo, this.scarfMat);
    this.scarfRibbonL.position.set(-0.14, 1.7, -0.18);
    this.scarfRibbonL.rotation.x = 0.5;
    this.bodyGroup.add(this.scarfRibbonL);

    this.scarfRibbonR = new THREE.Mesh(ribbonGeo, this.scarfMat);
    this.scarfRibbonR.position.set(0.14, 1.7, -0.18);
    this.scarfRibbonR.rotation.x = 0.5;
    this.bodyGroup.add(this.scarfRibbonR);

    // 4. Articulated Arms (Shoulder -> UpperArm -> Elbow -> Forearm -> Hand + Bangles)
    const upperArmGeo = new THREE.CylinderGeometry(0.065, 0.058, 0.28, 10);
    const forearmGeo = new THREE.CylinderGeometry(0.058, 0.05, 0.26, 10);
    const handGeo = new THREE.SphereGeometry(0.055, 10, 10);
    const bangleGeo = new THREE.TorusGeometry(0.065, 0.016, 6, 16);

    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.34, 1.68, 0);

    const upperArmL = new THREE.Mesh(upperArmGeo, this.skinMat);
    upperArmL.position.y = -0.14;
    upperArmL.castShadow = true;
    this.leftArm.add(upperArmL);

    this.leftForearm = new THREE.Group();
    this.leftForearm.position.set(0, -0.28, 0);

    const forearmMeshL = new THREE.Mesh(forearmGeo, this.skinMat);
    forearmMeshL.position.y = -0.13;
    forearmMeshL.castShadow = true;
    this.leftForearm.add(forearmMeshL);

    const handL = new THREE.Mesh(handGeo, this.skinMat);
    handL.position.y = -0.26;
    this.leftForearm.add(handL);

    const bangleL1 = new THREE.Mesh(bangleGeo, this.goldMat);
    bangleL1.position.y = -0.22;
    bangleL1.rotation.x = Math.PI / 2;
    this.leftForearm.add(bangleL1);

    this.leftArm.add(this.leftForearm);
    this.bodyGroup.add(this.leftArm);

    // Right Arm
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.34, 1.68, 0);

    const upperArmR = new THREE.Mesh(upperArmGeo, this.skinMat);
    upperArmR.position.y = -0.14;
    upperArmR.castShadow = true;
    this.rightArm.add(upperArmR);

    this.rightForearm = new THREE.Group();
    this.rightForearm.position.set(0, -0.28, 0);

    const forearmMeshR = new THREE.Mesh(forearmGeo, this.skinMat);
    forearmMeshR.position.y = -0.13;
    forearmMeshR.castShadow = true;
    this.rightForearm.add(forearmMeshR);

    const handR = new THREE.Mesh(handGeo, this.skinMat);
    handR.position.y = -0.26;
    this.rightForearm.add(handR);

    const bangleR1 = new THREE.Mesh(bangleGeo, this.goldMat);
    bangleR1.position.y = -0.22;
    bangleR1.rotation.x = Math.PI / 2;
    this.rightForearm.add(bangleR1);

    this.rightArm.add(this.rightForearm);
    this.bodyGroup.add(this.rightArm);

    // 5. Stylized Head & Expressive Animated Face
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 1.9;
    this.bodyGroup.add(this.headGroup);

    const headGeo = new THREE.SphereGeometry(0.33, 24, 24);
    const head = new THREE.Mesh(headGeo, this.skinMat);
    head.castShadow = true;
    this.headGroup.add(head);

    // Stylized Large Eyes with Sclera, Iris, Glint, and Animated Eyelids
    const eyeWhiteGeo = new THREE.SphereGeometry(0.065, 12, 12);
    const irisGeo = new THREE.SphereGeometry(0.04, 10, 10);
    const glintGeo = new THREE.SphereGeometry(0.016, 6, 6);
    const eyelidGeo = new THREE.SphereGeometry(0.07, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);

    // Left Eye
    const eyeWhiteL = new THREE.Mesh(eyeWhiteGeo, this.whiteMat);
    eyeWhiteL.scale.set(0.9, 1.1, 0.4);
    eyeWhiteL.position.set(-0.11, 0.05, 0.28);
    this.headGroup.add(eyeWhiteL);

    const irisL = new THREE.Mesh(irisGeo, this.blackMat);
    irisL.position.set(-0.11, 0.05, 0.31);
    this.headGroup.add(irisL);

    const glintL = new THREE.Mesh(glintGeo, this.whiteMat);
    glintL.position.set(-0.095, 0.07, 0.33);
    this.headGroup.add(glintL);

    this.leftEyelid = new THREE.Mesh(eyelidGeo, this.skinMat);
    this.leftEyelid.position.set(-0.11, 0.06, 0.28);
    this.leftEyelid.rotation.x = 0;
    this.leftEyelid.scale.set(1, 0.1, 1);
    this.headGroup.add(this.leftEyelid);

    // Right Eye
    const eyeWhiteR = new THREE.Mesh(eyeWhiteGeo, this.whiteMat);
    eyeWhiteR.scale.set(0.9, 1.1, 0.4);
    eyeWhiteR.position.set(0.11, 0.05, 0.28);
    this.headGroup.add(eyeWhiteR);

    const irisR = new THREE.Mesh(irisGeo, this.blackMat);
    irisR.position.set(0.11, 0.05, 0.31);
    this.headGroup.add(irisR);

    const glintR = new THREE.Mesh(glintGeo, this.whiteMat);
    glintR.position.set(0.125, 0.07, 0.33);
    this.headGroup.add(glintR);

    this.rightEyelid = new THREE.Mesh(eyelidGeo, this.skinMat);
    this.rightEyelid.position.set(0.11, 0.06, 0.28);
    this.rightEyelid.rotation.x = 0;
    this.rightEyelid.scale.set(1, 0.1, 1);
    this.headGroup.add(this.rightEyelid);

    // Arched Stylized Eyebrows
    const browGeo = new THREE.BoxGeometry(0.08, 0.018, 0.02);
    this.leftEyebrow = new THREE.Mesh(browGeo, this.hairMat);
    this.leftEyebrow.position.set(-0.11, 0.14, 0.3);
    this.leftEyebrow.rotation.z = -0.15;
    this.headGroup.add(this.leftEyebrow);

    this.rightEyebrow = new THREE.Mesh(browGeo, this.hairMat);
    this.rightEyebrow.position.set(0.11, 0.14, 0.3);
    this.rightEyebrow.rotation.z = 0.15;
    this.headGroup.add(this.rightEyebrow);

    // Rosy Blush Cheek Ovals
    const blushGeo = new THREE.CircleGeometry(0.045, 12);
    const blushL = new THREE.Mesh(blushGeo, this.blushMat);
    blushL.position.set(-0.16, -0.04, 0.29);
    blushL.rotation.y = -0.3;
    this.headGroup.add(blushL);

    const blushR = new THREE.Mesh(blushGeo, this.blushMat);
    blushR.position.set(0.16, -0.04, 0.29);
    blushR.rotation.y = 0.3;
    this.headGroup.add(blushR);

    // Cheerful Smile
    const smileGeo = new THREE.TorusGeometry(0.07, 0.018, 4, 12, Math.PI * 0.85);
    const smile = new THREE.Mesh(smileGeo, this.blackMat);
    smile.position.set(0, -0.1, 0.29);
    smile.rotation.z = Math.PI * 0.92;
    this.headGroup.add(smile);

    // Golden Hoop Earrings
    const hoopGeo = new THREE.TorusGeometry(0.06, 0.015, 6, 16);
    const hoopL = new THREE.Mesh(hoopGeo, this.goldMat);
    hoopL.position.set(-0.34, -0.02, 0);
    hoopL.rotation.y = Math.PI / 2;
    this.headGroup.add(hoopL);

    const hoopR = new THREE.Mesh(hoopGeo, this.goldMat);
    hoopR.position.set(0.34, -0.02, 0);
    hoopR.rotation.y = Math.PI / 2;
    this.headGroup.add(hoopR);

    // Golden Sunflower Hair Brooch
    const broochGroup = new THREE.Group();
    broochGroup.position.set(0.3, 0.18, 0.16);
    broochGroup.rotation.y = Math.PI / 3;

    const centerMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12), this.blackMat);
    centerMesh.rotation.x = Math.PI / 2;
    broochGroup.add(centerMesh);

    const petalGeo = new THREE.ConeGeometry(0.025, 0.07, 4);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, this.goldMat);
      petal.position.set(Math.cos(ang) * 0.065, Math.sin(ang) * 0.065, 0);
      petal.rotation.z = ang - Math.PI / 2;
      broochGroup.add(petal);
    }
    this.headGroup.add(broochGroup);

    // Voluminous Curly Hair + Dynamic Crown Bun
    this.hairCrownGroup = new THREE.Group();
    this.headGroup.add(this.hairCrownGroup);
    this.buildFullMergedHair();

    // 6. Shield & Magnet FX
    this.shieldMesh = this.buildShield();
    this.mesh.add(this.shieldMesh);

    this.dinoMountGroup = this.buildDinoMount();
    this.dinoMountGroup.visible = false;
    this.mesh.add(this.dinoMountGroup);

    this.magnetAuraGroup = this.buildMagnetAura();
    this.magnetAuraGroup.visible = false;
    this.mesh.add(this.magnetAuraGroup);

    // 7. Soft Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(1.2, 0.8);
    this.contactShadow = new THREE.Mesh(shadowGeo, this.shadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.02;
    scene.add(this.contactShadow);

    scene.add(this.mesh);
  }

  private buildSneaker(parent: THREE.Group): void {
    const soleGeo = new THREE.BoxGeometry(0.15, 0.07, 0.3);
    const sole = new THREE.Mesh(soleGeo, this.sneakerMat);
    sole.position.set(0, -0.04, 0.04);
    sole.castShadow = true;
    parent.add(sole);

    const toeCapGeo = new THREE.SphereGeometry(0.075, 8, 8);
    const toeCap = new THREE.Mesh(toeCapGeo, this.whiteMat);
    toeCap.scale.set(1.0, 0.6, 1.2);
    toeCap.position.set(0, -0.02, 0.12);
    parent.add(toeCap);
  }

  private buildFullMergedHair(): void {
    const capGeo = new THREE.SphereGeometry(0.32, 24, 24);
    capGeo.translate(0, 0.05, -0.05);

    const curlGeometries: THREE.BufferGeometry[] = [capGeo];
    const baseCurl = new THREE.SphereGeometry(0.12, 6, 6);

    for (let i = 0; i < 160; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.36;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      if (z > 0.16 && y > -0.15 && y < 0.3) continue;

      const g = baseCurl.clone();
      const scale = 0.8 + Math.random() * 0.45;
      g.scale(scale, scale, scale);
      g.translate(x, y, z);
      curlGeometries.push(g);
    }

    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.38 + Math.random() * 0.06;
      const lx = Math.cos(angle) * radius;
      const lz = Math.sin(angle) * radius;
      if (lz > 0.15) continue;
      const ly = -0.1 - Math.random() * 0.6;

      const g = baseCurl.clone();
      g.translate(lx, ly, lz);
      curlGeometries.push(g);
    }

    const mergedHairGeo = mergeGeometries(curlGeometries, false);
    const mergedHairMesh = new THREE.Mesh(mergedHairGeo, this.hairMat);
    mergedHairMesh.castShadow = true;
    this.hairCrownGroup.add(mergedHairMesh);

    baseCurl.dispose();
  }

  private buildShield(): THREE.Group {
    const shield = new THREE.Group();
    const shieldDome = new THREE.Mesh(
      new THREE.SphereGeometry(1.08, 24, 24),
      registerCurvedMaterial(
        new THREE.MeshStandardMaterial({
          color: 0xffd54f,
          emissive: 0xffa000,
          emissiveIntensity: 0.6,
          roughness: 0.1,
          metalness: 0.4,
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide,
        })
      )
    );
    shield.add(shieldDome);

    const shieldRingGeo = new THREE.TorusGeometry(1.22, 0.045, 8, 32);
    const shieldRing = new THREE.Mesh(
      shieldRingGeo,
      registerCurvedMaterial(
        new THREE.MeshStandardMaterial({
          color: 0xffeb3b,
          emissive: 0xffd700,
          emissiveIntensity: 0.9,
          roughness: 0.2,
          metalness: 0.8,
        })
      )
    );
    shieldRing.name = "shield_energy_ring";
    shieldRing.rotation.x = Math.PI / 2;
    shield.add(shieldRing);

    shield.position.y = 1.2;
    shield.visible = false;
    return shield;
  }

  private buildDinoMount(): THREE.Group {
    const mount = new THREE.Group();

    // 1. Sloping Sauropod Torso with Higher Shoulders & Lower Hips
    const bodyGeo = new THREE.SphereGeometry(0.68, 16, 16);
    const body = new THREE.Mesh(bodyGeo, this.dinoMountSkinMat);
    body.scale.set(1.05, 0.9, 1.45);
    body.position.set(0, 0.82, 0);
    body.rotation.x = -0.15; // Sloping back down towards hips
    body.castShadow = true;
    mount.add(body);

    // Cream / Butter Belly
    const bellyGeo = new THREE.SphereGeometry(0.55, 12, 12);
    const belly = new THREE.Mesh(bellyGeo, this.dinoMountBellyMat);
    belly.scale.set(0.9, 0.75, 1.2);
    belly.position.set(0, 0.68, 0.08);
    belly.rotation.x = -0.15;
    mount.add(belly);

    // 2. Saddle for Diva
    const saddleGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.12, 16);
    const saddle = new THREE.Mesh(saddleGeo, this.goldMat);
    saddle.position.set(0, 1.22, -0.05);
    saddle.scale.set(0.9, 0.8, 1.2);
    mount.add(saddle);

    // 3. Multi-Segment Towering Arched Neck & Head with Dome Crest
    const neckGroup = new THREE.Group();
    neckGroup.position.set(0, 1.15, 0.65);

    // Lower Neck (Angling up from high shoulders)
    const lowerNeckGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.65, 12);
    const lowerNeck = new THREE.Mesh(lowerNeckGeo, this.dinoMountSkinMat);
    lowerNeck.position.set(0, 0.28, 0.12);
    lowerNeck.rotation.x = -0.45;
    neckGroup.add(lowerNeck);

    // Upper Neck (Rising vertically)
    const upperNeckGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.7, 12);
    const upperNeck = new THREE.Mesh(upperNeckGeo, this.dinoMountSkinMat);
    upperNeck.position.set(0, 0.78, 0.3);
    upperNeck.rotation.x = -0.22;
    neckGroup.add(upperNeck);

    // Head Group (at top of neck)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.15, 0.38);

    // Skull
    const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
    const head = new THREE.Mesh(headGeo, this.dinoMountSkinMat);
    head.scale.set(0.9, 0.85, 1.25);
    headGroup.add(head);

    // Signature Brachiosaurus Nasal Dome Crest
    const crestGeo = new THREE.SphereGeometry(0.15, 10, 10);
    const crest = new THREE.Mesh(crestGeo, this.dinoMountSkinMat);
    crest.position.set(0, 0.14, 0.08);
    crest.scale.set(0.85, 1.1, 1.1);
    headGroup.add(crest);

    // Snout
    const snoutGeo = new THREE.SphereGeometry(0.16, 10, 10);
    const snout = new THREE.Mesh(snoutGeo, this.dinoMountSkinMat);
    snout.position.set(0, -0.04, 0.2);
    snout.scale.set(0.85, 0.75, 1.1);
    headGroup.add(snout);

    // Friendly Eyes
    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const glintGeo = new THREE.SphereGeometry(0.015, 6, 6);

    const eyeL = new THREE.Mesh(eyeGeo, this.blackMat);
    eyeL.position.set(-0.14, 0.05, 0.1);
    const glintL = new THREE.Mesh(glintGeo, this.whiteMat);
    glintL.position.set(-0.15, 0.065, 0.12);
    headGroup.add(eyeL, glintL);

    const eyeR = new THREE.Mesh(eyeGeo, this.blackMat);
    eyeR.position.set(0.14, 0.05, 0.1);
    const glintR = new THREE.Mesh(glintGeo, this.whiteMat);
    glintR.position.set(0.15, 0.065, 0.12);
    headGroup.add(eyeR, glintR);

    neckGroup.add(headGroup);
    mount.add(neckGroup);

    // 4. Pillar Legs (Front Legs notably taller than Hind Legs)
    const frontLegGeo = new THREE.CylinderGeometry(0.13, 0.16, 0.85, 10);
    const hindLegGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.65, 10);
    const footGeo = new THREE.SphereGeometry(0.16, 8, 8);

    // Front Left (Tall)
    const legFL = new THREE.Group();
    legFL.position.set(-0.42, 0.42, 0.45);
    const legMeshFL = new THREE.Mesh(frontLegGeo, this.dinoMountSkinMat);
    legMeshFL.position.y = -0.42;
    const footFL = new THREE.Mesh(footGeo, this.dinoMountSkinMat);
    footFL.scale.set(1.0, 0.5, 1.2);
    footFL.position.set(0, -0.8, 0.04);
    legFL.add(legMeshFL, footFL);

    // Front Right (Tall)
    const legFR = new THREE.Group();
    legFR.position.set(0.42, 0.42, 0.45);
    const legMeshFR = new THREE.Mesh(frontLegGeo, this.dinoMountSkinMat);
    legMeshFR.position.y = -0.42;
    const footFR = new THREE.Mesh(footGeo, this.dinoMountSkinMat);
    footFR.scale.set(1.0, 0.5, 1.2);
    footFR.position.set(0, -0.8, 0.04);
    legFR.add(legMeshFR, footFR);

    // Back Left (Shorter)
    const legBL = new THREE.Group();
    legBL.position.set(-0.38, 0.32, -0.45);
    const legMeshBL = new THREE.Mesh(hindLegGeo, this.dinoMountSkinMat);
    legMeshBL.position.y = -0.32;
    const footBL = new THREE.Mesh(footGeo, this.dinoMountSkinMat);
    footBL.scale.set(1.0, 0.5, 1.2);
    footBL.position.set(0, -0.62, 0.04);
    legBL.add(legMeshBL, footBL);

    // Back Right (Shorter)
    const legBR = new THREE.Group();
    legBR.position.set(0.38, 0.32, -0.45);
    const legMeshBR = new THREE.Mesh(hindLegGeo, this.dinoMountSkinMat);
    legMeshBR.position.y = -0.32;
    const footBR = new THREE.Mesh(footGeo, this.dinoMountSkinMat);
    footBR.scale.set(1.0, 0.5, 1.2);
    footBR.position.set(0, -0.62, 0.04);
    legBR.add(legMeshBR, footBR);

    mount.add(legFL, legFR, legBL, legBR);

    // 5. Long Serpentine Whiplash Tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.75, -0.9);

    const tailBaseGeo = new THREE.ConeGeometry(0.2, 0.9, 10);
    const tailBase = new THREE.Mesh(tailBaseGeo, this.dinoMountSkinMat);
    tailBase.rotation.x = -Math.PI / 2.4;
    tailBase.position.set(0, -0.15, -0.35);
    tailGroup.add(tailBase);

    const tailTipGeo = new THREE.ConeGeometry(0.1, 0.8, 8);
    const tailTip = new THREE.Mesh(tailTipGeo, this.dinoMountSkinMat);
    tailTip.rotation.x = -Math.PI / 2.2;
    tailTip.position.set(0, -0.35, -0.95);
    tailGroup.add(tailTip);

    mount.add(tailGroup);

    mount.userData = { legFL, legFR, legBL, legBR, tail: tailGroup, neck: neckGroup };
    return mount;
  }

  private buildMagnetAura(): THREE.Group {
    const group = new THREE.Group();

    // 1. Orbiting Charm Container
    const charm = new THREE.Group();
    charm.name = "orbiting_nazar_charm";

    const chainGeo = new THREE.TorusGeometry(0.22, 0.02, 8, 24);
    const chain = new THREE.Mesh(chainGeo, this.goldMat);
    charm.add(chain);

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 6, 6),
        i % 2 === 0 ? this.blackMat : this.whiteMat
      );
      bead.position.set(Math.cos(angle) * 0.22, Math.sin(angle) * 0.22, 0);
      charm.add(bead);
    }

    const eyeOuterMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      })
    );
    const eyeOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 16), eyeOuterMat);
    eyeOuter.rotation.x = Math.PI / 2;
    charm.add(eyeOuter);

    const eyeInner = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.035, 16), this.whiteMat);
    eyeInner.rotation.x = Math.PI / 2;
    charm.add(eyeInner);

    const eyePupil = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 8), this.blackMat);
    eyePupil.rotation.x = Math.PI / 2;
    charm.add(eyePupil);

    const glowGeo = new THREE.SphereGeometry(0.28, 12, 12);
    const glowMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.35,
        roughness: 0.1,
      })
    );
    charm.add(new THREE.Mesh(glowGeo, glowMat));

    group.add(charm);

    // 2. Ground Magnetic Field Ring
    const groundRingGeo = new THREE.TorusGeometry(1.1, 0.035, 6, 28);
    const groundRingMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.7,
        roughness: 0.2,
      })
    );
    const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
    groundRing.name = "magnet_ground_ring";
    groundRing.rotation.x = Math.PI / 2;
    groundRing.position.y = 0.08;
    group.add(groundRing);

    return group;
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

  public setMagnet(visible: boolean): void {
    this.magnetAuraGroup.visible = visible;
  }

  public moveLeft(): boolean {
    if (this.currentLane > 0) {
      this.previousLane = this.currentLane;
      this.currentLane--;
      return true;
    }
    return false;
  }

  public moveRight(): boolean {
    if (this.currentLane < 2) {
      this.previousLane = this.currentLane;
      this.currentLane++;
      return true;
    }
    return false;
  }

  public bounceOffSide(): void {
    // Revert lane to the origin lane
    this.currentLane = this.previousLane;
    this.targetX = (this.currentLane - 1) * this.laneWidth;
    // Rebound lateral impulse away from collision
    const dir = this.simPosition.x > this.targetX ? -1 : 1;
    this.velocityX = dir * 0.16;
  }

  public triggerStumble(): void {
    this.stumbleTimer = 0.55;
  }

  public jump(): boolean {
    if (this.isDucking) {
      // Slide-Jump Cancel with extra crisp athletic leap
      this.cancelDuck();
      this.isJumping = true;
      this.isDiving = false;
      this.jumpVelocity = JUMP_FORCE * 1.06;
      return true;
    }

    if (!this.isJumping && !this.isBoosting) {
      this.isJumping = true;
      this.isDiving = false;
      this.jumpVelocity = JUMP_FORCE;
      return true;
    }
    return false;
  }

  public duck(): boolean {
    if (this.isJumping) {
      // Fast-Fall Air Dive
      if (!this.isDiving) {
        this.isDiving = true;
        this.jumpVelocity = DIVE_FORCE;
        return true;
      }
      return false;
    }
    if (!this.isJumping && !this.isDucking && !this.isBoosting) {
      this.isDucking = true;
      this.duckTimer = 32;
      return true;
    }
    return false;
  }

  public cancelDuck(): void {
    if (this.isDucking) {
      this.isDucking = false;
      this.duckTimer = 0;
      this.bodyGroup.position.y = 0;
      this.bodyGroup.rotation.x = 0;
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
    this.previousLane = 1;
    this.stumbleTimer = 0;
    this.targetX = 0;
    this.velocityX = 0;
    this.lateralAccX = 0;
    this.isJumping = false;
    this.isDiving = false;
    this.isDucking = false;
    this.isBoosting = false;
    this.isMounted = false;
    this.jumpVelocity = 0;
    this.duckTimer = 0;
    this.landingSquash = 1.0;
    this.squashVelocity = 0;
    this.landedThisFrame = null;
    this.impactY = 0;
    this.impactZ = 0;
    this.impactRotX = 0;

    this.simPosition.set(0, 0, 0);
    this.prevPosition.set(0, 0, 0);
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, Math.PI, 0);
    this.bodyGroup.position.set(0, 0, 0);
    this.bodyGroup.rotation.set(0, 0, 0);
    this.bodyGroup.scale.set(1, 1, 1);
    this.leftArm.rotation.set(0, 0, 0);
    this.rightArm.rotation.set(0, 0, 0);
    this.shieldMesh.visible = false;
    this.dinoMountGroup.visible = false;
    this.magnetAuraGroup.visible = false;
  }

  public interpolateRender(alpha: number): void {
    // Pure visual interpolation between discrete simulation states
    this.mesh.position.lerpVectors(this.prevPosition, this.simPosition, alpha);
    this.contactShadow.position.x = this.mesh.position.x;
    this.contactShadow.position.z = this.mesh.position.z;
  }

  public update(dt: number, simTime: number, pursuerDistance = 8.0, effects?: EffectsSystem): void {
    // Capture state before physics for render interpolation
    this.prevPosition.copy(this.simPosition);
    this.landedThisFrame = null;

    // 1. Critically Damped Harmonic Spring for Lateral Lane Transitions
    this.targetX = (this.currentLane - 1) * this.laneWidth;
    const distToTarget = this.targetX - this.simPosition.x;
    const springK = 0.16;
    const damping = 0.72;
    this.lateralAccX = (distToTarget * springK - this.velocityX * damping) * (dt * 60);
    this.velocityX += this.lateralAccX;
    this.simPosition.x += this.velocityX * (dt * 60);

    // 2. Vertical Jump / Air Dive / Boost Kinematics
    if (this.isBoosting) {
      this.simPosition.y = THREE.MathUtils.lerp(this.simPosition.y, 3.0, 0.12 * (dt * 60));
      // Superwoman flying pose
      this.leftLeg.rotation.x = 0.2;
      this.rightLeg.rotation.x = 0.2;
      this.leftShin.rotation.x = 0.1;
      this.rightShin.rotation.x = 0.1;
      this.leftArm.rotation.x = -2.8;
      this.rightArm.rotation.x = -2.8;
      this.leftForearm.rotation.x = 0;
      this.rightForearm.rotation.x = 0;
    } else if (this.isJumping) {
      let currentGravity = JUMP_GRAVITY;
      if (this.isDiving) {
        currentGravity = JUMP_GRAVITY * 1.6;
      } else if (Math.abs(this.jumpVelocity) < 0.08) {
        // Apex float window: grants floaty responsiveness near top of jump
        currentGravity = JUMP_GRAVITY * JUMP_APEX_GRAVITY_MULT;
      } else if (this.jumpVelocity < 0) {
        // Asymmetric heavier fall gravity: punchy, athletic descent
        currentGravity = JUMP_GRAVITY * JUMP_FALL_GRAVITY_MULT;
      }

      this.simPosition.y += this.jumpVelocity * (dt * 60);
      this.jumpVelocity += currentGravity * (dt * 60);

      if (this.simPosition.y <= 0) {
        this.simPosition.y = 0;
        const wasDiving = this.isDiving;
        this.isJumping = false;
        this.isDiving = false;
        this.jumpVelocity = 0;
        this.landedThisFrame = wasDiving ? "dive" : "normal";

        if (wasDiving) {
          this.landingSquash = 0.65;
          this.squashVelocity = 0.15;
          // Auto-chain into athletic baseball slide
          this.isDucking = true;
          this.duckTimer = 22;
          if (effects) {
            effects.emitAirDiveSlam(this.simPosition);
          }
        } else {
          this.landingSquash = 0.80;
          this.squashVelocity = 0.08;
          if (effects) {
            effects.emitFootstepDust(this.simPosition);
          }
        }
      }

      if (this.isDiving) {
        // Aerodynamic diving posture
        this.bodyGroup.position.y = -0.25;
        this.bodyGroup.rotation.x = 0.55;
        this.leftLeg.rotation.x = -1.1;
        this.leftShin.rotation.x = 1.3;
        this.rightLeg.rotation.x = -1.1;
        this.rightShin.rotation.x = 1.3;
        this.leftArm.rotation.x = 1.1;
        this.rightArm.rotation.x = 1.1;
        this.leftForearm.rotation.x = 0.3;
        this.rightForearm.rotation.x = 0.3;
      } else {
        // Athletic airborne leap with tucked knees
        this.leftLeg.rotation.x = -0.75;
        this.leftShin.rotation.x = 1.15;
        this.rightLeg.rotation.x = -0.45;
        this.rightShin.rotation.x = 0.85;

        this.leftArm.rotation.x = -2.2;
        this.leftForearm.rotation.x = -0.6;
        this.rightArm.rotation.x = -2.2;
        this.rightForearm.rotation.x = -0.6;

        this.hairCrownGroup.position.y = 0.05;
        this.hairCrownGroup.rotation.x = -0.2;
      }
    } else if (this.isDucking) {
      this.duckTimer -= dt * 60;
      if (this.duckTimer <= 0) {
        this.cancelDuck();
      } else {
        // True Athletic Baseball Slide Crouch Pose
        this.bodyGroup.position.y = -0.42;
        this.bodyGroup.rotation.x = -0.55;

        // Right leg extended forward
        this.rightLeg.rotation.x = -1.25;
        this.rightShin.rotation.x = 0.2;
        this.rightFoot.rotation.x = -0.3;

        // Left leg tucked under
        this.leftLeg.rotation.x = 0.95;
        this.leftShin.rotation.x = 1.4;

        // Arms out for slide balance
        this.leftArm.rotation.x = -0.3;
        this.leftForearm.rotation.x = -0.9;
        this.rightArm.rotation.x = 0.8;
        this.rightForearm.rotation.x = -0.4;

        if (effects && Math.random() < 0.6) {
          effects.emitSlideSparks(this.simPosition);
        }
      }
    } else {
      // Grounded running
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
        this.leftShin.rotation.x = 0.6;
        this.rightLeg.rotation.x = 0.55;
        this.rightLeg.rotation.z = 0.25;
        this.rightShin.rotation.x = 0.6;
        this.leftArm.rotation.x = 0.45;
        this.rightArm.rotation.x = 0.45;
        this.bodyGroup.position.y = Math.sin(t) * 0.04;

        const dInfo = this.dinoMountGroup.userData as {
          legFL?: THREE.Group;
          legFR?: THREE.Group;
          legBL?: THREE.Group;
          legBR?: THREE.Group;
          tail?: THREE.Group;
          neck?: THREE.Group;
        };
        if (dInfo.legFL) {
          dInfo.legFL.rotation.x = Math.sin(t) * 0.55;
          if (dInfo.legBR) dInfo.legBR.rotation.x = Math.sin(t) * 0.55;
          if (dInfo.legFR) dInfo.legFR.rotation.x = Math.sin(t + Math.PI) * 0.55;
          if (dInfo.legBL) dInfo.legBL.rotation.x = Math.sin(t + Math.PI) * 0.55;
          if (dInfo.tail) dInfo.tail.rotation.y = Math.sin(t * 0.5) * 0.35;
          if (dInfo.neck) {
            dInfo.neck.rotation.x = Math.sin(t) * 0.08;
            dInfo.neck.rotation.y = Math.cos(t * 0.5) * 0.06;
          }
        }
      } else {
        // Advanced Multi-Joint Articulated Running Stride
        const t = simTime * 13;
        this.bodyGroup.position.y = Math.abs(Math.sin(t)) * 0.06;
        this.bodyGroup.rotation.y = Math.sin(t) * 0.08;
        this.skirtMesh.rotation.y = -Math.sin(t) * 0.12;

        // Left Leg: Forward swing & knee kickback
        const leftPhase = Math.sin(t);
        this.leftLeg.rotation.x = leftPhase * 0.65;
        this.leftShin.rotation.x = Math.max(0, -leftPhase) * 0.85; // Knee bends on kickback
        this.leftFoot.rotation.x = leftPhase * 0.2;

        // Right Leg: Anti-phase
        const rightPhase = Math.sin(t + Math.PI);
        this.rightLeg.rotation.x = rightPhase * 0.65;
        this.rightShin.rotation.x = Math.max(0, -rightPhase) * 0.85;
        this.rightFoot.rotation.x = rightPhase * 0.2;

        // Arms: Pump with natural elbow articulation
        this.leftArm.rotation.x = rightPhase * 0.65;
        this.leftForearm.rotation.x = -0.45 + Math.abs(rightPhase) * 0.35;

        this.rightArm.rotation.x = leftPhase * 0.65;
        this.rightForearm.rotation.x = -0.45 + Math.abs(leftPhase) * 0.35;

        // Footstep ground contact detection for dust
        const stepPhase = Math.sin(t);
        if (this.lastStepPhase < 0 && stepPhase >= 0 && effects && Math.random() < 0.4) {
          effects.emitFootstepDust(this.simPosition);
        }
        this.lastStepPhase = stepPhase;

        // Hair secondary spring bounce
        this.hairCrownGroup.rotation.x = Math.sin(t) * 0.08;
        this.hairCrownGroup.position.y = Math.cos(t) * 0.03;
      }
    }

    // Volume-preserving squash & stretch elastic oscillator
    const squashDiff = 1.0 - this.landingSquash;
    this.squashVelocity += squashDiff * 0.28 * (dt * 60);
    this.squashVelocity *= Math.pow(0.72, dt * 60);
    this.landingSquash += this.squashVelocity * (dt * 60);

    const clampedSquashY = THREE.MathUtils.clamp(this.landingSquash, 0.48, 1.4);
    const radialScale = Math.sqrt(1.0 / clampedSquashY);
    this.bodyGroup.scale.set(radialScale, clampedSquashY, radialScale);

    // 3. Dynamic Scarf Spring Lag & Wind Flutter
    const windFreq = simTime * 18;
    const verticalScarfLag = this.jumpVelocity * 1.5;
    const lateralScarfLag = this.velocityX * 1.2;

    this.scarfRibbonL.rotation.x = 0.6 - verticalScarfLag + Math.sin(windFreq) * 0.18;
    this.scarfRibbonL.rotation.z = Math.cos(windFreq * 0.8) * 0.12 - lateralScarfLag;
    this.scarfRibbonR.rotation.x = 0.6 - verticalScarfLag + Math.sin(windFreq + 1.0) * 0.18;
    this.scarfRibbonR.rotation.z = -Math.cos(windFreq * 0.8) * 0.12 - lateralScarfLag;

    // 4. Expressive Facial Blinking & Proximity Look-Back
    const blinkCycle = simTime % 3.8;
    const isBlinking = blinkCycle > 0.0 && blinkCycle < 0.14;
    this.leftEyelid.scale.y = isBlinking ? 1.0 : 0.1;
    this.rightEyelid.scale.y = isBlinking ? 1.0 : 0.1;

    // Look back over shoulder if Pursuer is dangerously close (< 3.5m)
    if (pursuerDistance < 3.5 && !this.isDucking && !this.isJumping) {
      const targetLookBack = Math.sin(simTime * 4) > 0.1 ? 0.65 : 0.0;
      this.headGroup.rotation.y = THREE.MathUtils.lerp(this.headGroup.rotation.y, targetLookBack, 0.12 * (dt * 60));
      this.leftEyebrow.position.y = 0.16; // Arch eyebrows up in playful shock
      this.rightEyebrow.position.y = 0.16;
    } else {
      this.headGroup.rotation.y = THREE.MathUtils.lerp(this.headGroup.rotation.y, 0, 0.15 * (dt * 60));
      this.leftEyebrow.position.y = 0.14;
      this.rightEyebrow.position.y = 0.14;
    }

    // 5. Dynamic banking & tilts
    const bankAngle = -this.velocityX * 0.5 - this.lateralAccX * 0.35;
    this.mesh.rotation.z = Math.sin(simTime * 8) * 0.03 + bankAngle;
    this.mesh.rotation.x = this.isDiving ? 0.45 : this.isJumping ? 0.22 : this.isDucking ? 0.65 : 0.08;

    // 5b. Stumble lateral wobble & off-balance arms
    if (this.stumbleTimer > 0) {
      this.stumbleTimer = Math.max(0, this.stumbleTimer - dt);
      const ratio = this.stumbleTimer / 0.55;
      const wobble = Math.sin(simTime * 32) * 0.22 * ratio;
      this.bodyGroup.rotation.z = wobble;
      this.bodyGroup.rotation.y += wobble * 0.4;
      this.leftArm.rotation.z = -0.45 * ratio;
      this.rightArm.rotation.z = 0.45 * ratio;
      this.leftEyebrow.position.y = 0.17;
      this.rightEyebrow.position.y = 0.17;
    } else {
      this.bodyGroup.rotation.z = 0;
      this.leftArm.rotation.z = 0;
      this.rightArm.rotation.z = 0;
    }

    // 6. Shield aura spin & pulse
    if (this.shieldMesh.visible) {
      this.shieldMesh.rotation.y += 0.05 * (dt * 60);
      const ring = this.shieldMesh.getObjectByName("shield_energy_ring");
      if (ring) {
        ring.rotation.z += 0.12 * (dt * 60);
        ring.rotation.x = Math.PI / 2 + Math.sin(simTime * 5) * 0.2;
      }
      const pulse = 1.0 + Math.sin(simTime * 6) * 0.05;
      this.shieldMesh.scale.set(pulse, pulse, pulse);
      this.shieldMesh.position.y = 1.2 + Math.sin(simTime * 4) * 0.08;
    }

    // 7. Magnet Nazar aura orbital spin & pulse
    if (this.magnetAuraGroup.visible) {
      const charm = this.magnetAuraGroup.getObjectByName("orbiting_nazar_charm");
      if (charm) {
        const orbitAngle = simTime * 3.8;
        charm.position.set(
          Math.cos(orbitAngle) * 0.95,
          1.25 + Math.sin(simTime * 5) * 0.15,
          Math.sin(orbitAngle) * 0.95
        );
        charm.rotation.y = orbitAngle + Math.PI / 2;
        charm.rotation.z = Math.sin(simTime * 4) * 0.2;
      }
      const groundRing = this.magnetAuraGroup.getObjectByName("magnet_ground_ring");
      if (groundRing) {
        groundRing.rotation.z += 0.08 * (dt * 60);
        const vPulse = 1.0 + Math.sin(simTime * 6) * 0.08;
        groundRing.scale.set(vPulse, vPulse, vPulse);
      }
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
    this.sneakerMat.dispose();
    this.blackMat.dispose();
    this.whiteMat.dispose();
    this.goldMat.dispose();
    this.blushMat.dispose();
    this.scarfMat.dispose();
    this.shadowMat.dispose();
    this.dinoMountSkinMat.dispose();
    this.dinoMountBellyMat.dispose();
    this.contactShadow.geometry.dispose();
  }
}
