import * as THREE from "three";
import { registerCurvedMaterial } from "../core/CurvedWorld";
import { TextureGenerator, TextureType } from "../TextureGenerator";
import { EffectsSystem } from "../systems/Effects";

const SPEECH_PHRASES: Record<string, { title: string; subtitle: string; emoji: string; color: string }> = {
  speech_bubble_suno: {
    title: "Suno toh!",
    subtitle: "Ruk jao Diva! 😭",
    emoji: "😭",
    color: "#e11d48",
  },
  speech_bubble_wait: {
    title: "Wait up!",
    subtitle: "Ek minute suno! 🏃‍♂️",
    emoji: "🏃‍♂️",
    color: "#2563eb",
  },
  speech_bubble_flowers: {
    title: "Got flowers!",
    subtitle: "Special for you 🌻💖",
    emoji: "🌻",
    color: "#d97706",
  },
  speech_bubble_yawrrrrr: {
    title: "Yawrrrrr",
    subtitle: "Plezzzzzz",
    emoji: "😭",
    color: "#db2777",
  },
};

export class Pursuer {
  public mesh: THREE.Group;
  public chaseDistance = 8.0; // Distance behind player (metres)
  public isCatching = false;

  // Authoritative simulation & previous tick state for render interpolation (Fixes defect #12)
  public simPosition: THREE.Vector3 = new THREE.Vector3();
  public prevPosition: THREE.Vector3 = new THREE.Vector3();

  // Articulated Groups
  private torsoGroup: THREE.Group;
  private headGroup: THREE.Group;

  // Left Leg Chain
  private leftLeg: THREE.Group; // Hip
  private leftShin: THREE.Group; // Knee
  private leftFoot: THREE.Group; // Ankle

  // Right Leg Chain
  private rightLeg: THREE.Group; // Hip
  private rightShin: THREE.Group; // Knee
  private rightFoot: THREE.Group; // Ankle

  // Left Arm Chain (Holds Bouquet)
  private leftArm: THREE.Group; // Shoulder
  private leftForearm: THREE.Group; // Elbow
  private bouquetGroup: THREE.Group;

  // Right Arm Chain (Reaches forward)
  private rightArm: THREE.Group; // Shoulder
  private rightForearm: THREE.Group; // Elbow

  // Face & Emotes
  private leftEyebrow: THREE.Mesh;
  private rightEyebrow: THREE.Mesh;
  private mouthSmirk: THREE.Mesh;
  private mouthOpen: THREE.Mesh;
  private speechBubbleMesh: THREE.Mesh;
  private speechBubbleMat: THREE.MeshBasicMaterial;
  private currentSpeechType: TextureType = "speech_bubble_suno";
  private speechTimer = 0;
  private speechDisplayTimer = 0;
  private lastStepPhase = 0;

  // Materials
  private hoodieMat: THREE.MeshStandardMaterial;
  private denimMat: THREE.MeshStandardMaterial;
  private sneakerMat: THREE.MeshStandardMaterial;
  private skinMat: THREE.MeshStandardMaterial;
  private hairMat: THREE.MeshStandardMaterial;
  private blackMat: THREE.MeshStandardMaterial;
  private whiteMat: THREE.MeshStandardMaterial;
  private flowerStemMat: THREE.MeshStandardMaterial;
  private flowerGoldMat: THREE.MeshStandardMaterial;
  private flowerRoseMat: THREE.MeshStandardMaterial;
  private wrapMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Group();

    // 1. Stylized Materials
    this.hoodieMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("gambhir_hoodie"),
        roughness: 0.45,
        metalness: 0.1,
      })
    );
    this.denimMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("gambhir_denim"),
        roughness: 0.55,
        metalness: 0.05,
      })
    );
    this.sneakerMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("sneaker_gambhir"),
        roughness: 0.4,
        metalness: 0.15,
      })
    );
    this.skinMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xffcc80,
        roughness: 0.5,
      })
    );
    this.hairMat = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x1c1917,
        roughness: 0.85,
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
    this.flowerStemMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 }));
    this.flowerGoldMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 }));
    this.flowerRoseMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3 }));
    this.wrapMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 }));

    this.speechBubbleMat = registerCurvedMaterial(
      new THREE.MeshBasicMaterial({
        map: TextureGenerator.getTexture("speech_bubble_suno"),
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );

    // 2. Torso & Hoodie
    this.torsoGroup = new THREE.Group();
    this.mesh.add(this.torsoGroup);

    // Upper Torso
    const torsoGeo = new THREE.CylinderGeometry(0.3, 0.34, 0.65, 16);
    const torso = new THREE.Mesh(torsoGeo, this.hoodieMat);
    torso.position.y = 1.48;
    torso.castShadow = true;
    this.torsoGroup.add(torso);

    // Draped Hoodie Hood on back
    const hoodGeo = new THREE.TorusGeometry(0.24, 0.08, 8, 16, Math.PI);
    const hood = new THREE.Mesh(hoodGeo, this.hoodieMat);
    hood.position.set(0, 1.76, -0.12);
    hood.rotation.x = -Math.PI / 3;
    this.torsoGroup.add(hood);

    // Lower Waist / Belt
    const waistGeo = new THREE.CylinderGeometry(0.33, 0.3, 0.18, 16);
    const waist = new THREE.Mesh(waistGeo, this.denimMat);
    waist.position.y = 1.1;
    waist.castShadow = true;
    this.torsoGroup.add(waist);

    // 3. Articulated Legs (Thigh -> Knee/Shin -> Sneaker)
    const legGeo = new THREE.CylinderGeometry(0.11, 0.095, 0.4, 12);
    const shinGeo = new THREE.CylinderGeometry(0.092, 0.08, 0.4, 12);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.2, 0.88, 0);

    const thighL = new THREE.Mesh(legGeo, this.denimMat);
    thighL.position.y = -0.2;
    thighL.castShadow = true;
    this.leftLeg.add(thighL);

    this.leftShin = new THREE.Group();
    this.leftShin.position.set(0, -0.4, 0);

    const shinL = new THREE.Mesh(shinGeo, this.denimMat);
    shinL.position.y = -0.2;
    shinL.castShadow = true;
    this.leftShin.add(shinL);

    this.leftFoot = new THREE.Group();
    this.leftFoot.position.set(0, -0.4, 0);
    this.buildSneaker(this.leftFoot);
    this.leftShin.add(this.leftFoot);

    this.leftLeg.add(this.leftShin);
    this.mesh.add(this.leftLeg);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.2, 0.88, 0);

    const thighR = new THREE.Mesh(legGeo, this.denimMat);
    thighR.position.y = -0.2;
    thighR.castShadow = true;
    this.rightLeg.add(thighR);

    this.rightShin = new THREE.Group();
    this.rightShin.position.set(0, -0.4, 0);

    const shinR = new THREE.Mesh(shinGeo, this.denimMat);
    shinR.position.y = -0.2;
    shinR.castShadow = true;
    this.rightShin.add(shinR);

    this.rightFoot = new THREE.Group();
    this.rightFoot.position.set(0, -0.4, 0);
    this.buildSneaker(this.rightFoot);
    this.rightShin.add(this.rightFoot);

    this.rightLeg.add(this.rightShin);
    this.mesh.add(this.rightLeg);

    // 4. Articulated Arms (Shoulder -> Forearm -> Hand + Peace Offering Bouquet)
    const upperArmGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.32, 10);
    const forearmGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.3, 10);
    const handGeo = new THREE.SphereGeometry(0.065, 8, 8);

    // Left Arm (Carries Peace Offering Bouquet)
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.38, 1.7, 0);

    const upperArmL = new THREE.Mesh(upperArmGeo, this.hoodieMat);
    upperArmL.position.y = -0.16;
    upperArmL.castShadow = true;
    this.leftArm.add(upperArmL);

    this.leftForearm = new THREE.Group();
    this.leftForearm.position.set(0, -0.32, 0);

    const forearmL = new THREE.Mesh(forearmGeo, this.hoodieMat);
    forearmL.position.y = -0.15;
    forearmL.castShadow = true;
    this.leftForearm.add(forearmL);

    const handL = new THREE.Mesh(handGeo, this.skinMat);
    handL.position.y = -0.3;
    this.leftForearm.add(handL);

    // Build Sunflower Bouquet in Left Hand
    this.bouquetGroup = this.buildBouquet();
    this.bouquetGroup.position.set(0, -0.3, 0.15);
    this.bouquetGroup.rotation.x = -Math.PI / 4;
    this.leftForearm.add(this.bouquetGroup);

    this.leftArm.add(this.leftForearm);
    this.torsoGroup.add(this.leftArm);

    // Right Arm (Reaching Forward)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.38, 1.7, 0);

    const upperArmR = new THREE.Mesh(upperArmGeo, this.hoodieMat);
    upperArmR.position.y = -0.16;
    upperArmR.castShadow = true;
    this.rightArm.add(upperArmR);

    this.rightForearm = new THREE.Group();
    this.rightForearm.position.set(0, -0.32, 0);

    const forearmR = new THREE.Mesh(forearmGeo, this.hoodieMat);
    forearmR.position.y = -0.15;
    forearmR.castShadow = true;
    this.rightForearm.add(forearmR);

    const handR = new THREE.Mesh(handGeo, this.skinMat);
    handR.position.y = -0.3;
    this.rightForearm.add(handR);

    this.rightArm.add(this.rightForearm);
    this.torsoGroup.add(this.rightArm);

    // 5. Stylized Head & Expressive Animated Face
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 1.95;
    this.torsoGroup.add(this.headGroup);

    const headGeo = new THREE.SphereGeometry(0.34, 20, 20);
    const head = new THREE.Mesh(headGeo, this.skinMat);
    head.castShadow = true;
    this.headGroup.add(head);

    // Stylized Modern Quiff Hair
    const hairCapGeo = new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hairCap = new THREE.Mesh(hairCapGeo, this.hairMat);
    hairCap.position.y = 0.06;
    this.headGroup.add(hairCap);

    const quiffGeo = new THREE.ConeGeometry(0.16, 0.4, 6);
    const quiff = new THREE.Mesh(quiffGeo, this.hairMat);
    quiff.position.set(0, 0.32, 0.18);
    quiff.rotation.x = -Math.PI / 4;
    this.headGroup.add(quiff);

    // Eyes with white glint
    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const glintGeo = new THREE.SphereGeometry(0.014, 6, 6);

    const leftEye = new THREE.Mesh(eyeGeo, this.blackMat);
    leftEye.position.set(-0.11, 0.05, 0.31);
    this.headGroup.add(leftEye);

    const glintL = new THREE.Mesh(glintGeo, this.whiteMat);
    glintL.position.set(-0.1, 0.065, 0.345);
    this.headGroup.add(glintL);

    const rightEye = new THREE.Mesh(eyeGeo, this.blackMat);
    rightEye.position.set(0.11, 0.05, 0.31);
    this.headGroup.add(rightEye);

    const glintR = new THREE.Mesh(glintGeo, this.whiteMat);
    glintR.position.set(0.12, 0.065, 0.345);
    this.headGroup.add(glintR);

    // Animated Eyebrows
    const browGeo = new THREE.BoxGeometry(0.09, 0.02, 0.02);
    this.leftEyebrow = new THREE.Mesh(browGeo, this.hairMat);
    this.leftEyebrow.position.set(-0.11, 0.14, 0.32);
    this.leftEyebrow.rotation.z = -0.15;
    this.headGroup.add(this.leftEyebrow);

    this.rightEyebrow = new THREE.Mesh(browGeo, this.hairMat);
    this.rightEyebrow.position.set(0.11, 0.14, 0.32);
    this.rightEyebrow.rotation.z = 0.15;
    this.headGroup.add(this.rightEyebrow);

    // Dual Mouth System (Confident Smirk vs Exhausted Panting "O")
    const smirkGeo = new THREE.TorusGeometry(0.06, 0.018, 4, 10, Math.PI * 0.7);
    this.mouthSmirk = new THREE.Mesh(smirkGeo, this.blackMat);
    this.mouthSmirk.position.set(0, -0.1, 0.32);
    this.mouthSmirk.rotation.z = Math.PI * 0.82;
    this.headGroup.add(this.mouthSmirk);

    const openMouthGeo = new THREE.TorusGeometry(0.05, 0.022, 6, 12, Math.PI * 2);
    this.mouthOpen = new THREE.Mesh(openMouthGeo, this.blackMat);
    this.mouthOpen.position.set(0, -0.11, 0.32);
    this.mouthOpen.scale.set(0.9, 1.4, 1.0);
    this.mouthOpen.visible = false;
    this.headGroup.add(this.mouthOpen);

    // Floating Dynamic Speech Bubble Emote (Upright billboard)
    const bubbleGeo = new THREE.PlaneGeometry(2.0, 1.25);
    this.speechBubbleMesh = new THREE.Mesh(bubbleGeo, this.speechBubbleMat);
    this.speechBubbleMesh.position.set(0, 2.9, 0);
    this.speechBubbleMesh.visible = false;
    this.mesh.add(this.speechBubbleMesh);

    this.simPosition.set(0, 0, 8.0);
    this.prevPosition.set(0, 0, 8.0);
    this.mesh.position.set(0, 0, 8.0);
    this.mesh.visible = true;
    scene.add(this.mesh);
  }

  private buildSneaker(parent: THREE.Group): void {
    const soleGeo = new THREE.BoxGeometry(0.16, 0.08, 0.34);
    const sole = new THREE.Mesh(soleGeo, this.sneakerMat);
    sole.position.set(0, -0.04, 0.04);
    sole.castShadow = true;
    parent.add(sole);

    const toeGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const toe = new THREE.Mesh(toeGeo, this.whiteMat);
    toe.scale.set(1.0, 0.65, 1.25);
    toe.position.set(0, -0.02, 0.14);
    parent.add(toe);
  }

  private buildBouquet(): THREE.Group {
    const bouquet = new THREE.Group();

    // Kraft paper wrapping cone
    const coneGeo = new THREE.ConeGeometry(0.16, 0.38, 12, 1, true);
    const cone = new THREE.Mesh(coneGeo, this.wrapMat);
    cone.rotation.x = Math.PI;
    cone.position.y = -0.08;
    bouquet.add(cone);

    // 3 Sunflowers
    const sunCenterGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const petalGeo = new THREE.ConeGeometry(0.02, 0.06, 4);

    const makeSunflower = (x: number, y: number, z: number) => {
      const sf = new THREE.Group();
      sf.position.set(x, y, z);
      const center = new THREE.Mesh(sunCenterGeo, this.blackMat);
      sf.add(center);

      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const petal = new THREE.Mesh(petalGeo, this.flowerGoldMat);
        petal.position.set(Math.cos(ang) * 0.06, Math.sin(ang) * 0.06, 0);
        petal.rotation.z = ang - Math.PI / 2;
        sf.add(petal);
      }
      return sf;
    };

    bouquet.add(makeSunflower(-0.06, 0.12, 0.02));
    bouquet.add(makeSunflower(0.06, 0.12, 0.02));
    bouquet.add(makeSunflower(0, 0.16, -0.03));

    // 2 Crimson Roses
    const roseGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const rose1 = new THREE.Mesh(roseGeo, this.flowerRoseMat);
    rose1.position.set(0, 0.08, 0.06);
    bouquet.add(rose1);

    const rose2 = new THREE.Mesh(roseGeo, this.flowerRoseMat);
    rose2.position.set(-0.02, 0.14, -0.06);
    bouquet.add(rose2);

    return bouquet;
  }

  public reset(playerX = 0): void {
    this.chaseDistance = 8.0;
    this.isCatching = false;
    this.speechTimer = 0;
    this.speechDisplayTimer = 0;
    this.simPosition.set(playerX, 0, 8.0);
    this.prevPosition.set(playerX, 0, 8.0);
    this.mesh.position.set(playerX, 0, 8.0);
    this.mesh.visible = true;
    this.speechBubbleMesh.visible = false;
    this.speechBubbleMesh.scale.set(0, 0, 0);
    this.mouthSmirk.visible = true;
    this.mouthOpen.visible = false;
  }

  public onMissSunflower(): void {
    this.chaseDistance = Math.max(1.2, this.chaseDistance - 0.25);
  }

  public onShieldImpact(): void {
    this.chaseDistance = Math.max(1.2, this.chaseDistance - 4.8);
  }

  public onSideImpact(): boolean {
    // If Gambhir is already right behind Diva (< 2.0m), this stumble causes an instant catch
    if (this.chaseDistance <= 2.0) {
      this.chaseDistance = 0.5;
      return true;
    }

    // Surge forward: dramatically close the chase distance to 2.2m - 2.4m
    this.chaseDistance = Math.max(1.8, Math.min(this.chaseDistance - 3.8, 2.4));

    // Instantly trigger speech bubble & display latch
    this.speechDisplayTimer = 3.5;
    const phrases: TextureType[] = ["speech_bubble_suno", "speech_bubble_wait", "speech_bubble_yawrrrrr"];
    this.currentSpeechType = phrases[Math.floor(Math.random() * phrases.length)];

    return this.checkCaught();
  }

  public onCleanRun(dt: number): void {
    if (this.chaseDistance < 8.5) {
      this.chaseDistance = Math.min(8.5, this.chaseDistance + 0.06 * (dt * 60));
    }
  }

  public checkCaught(): boolean {
    return this.chaseDistance <= 0.8;
  }

  public triggerCatch(playerX: number): void {
    this.isCatching = true;
    this.simPosition.set(playerX, 0, 5.0);
    this.prevPosition.set(playerX, 0, 5.0);
    this.mesh.position.set(playerX, 0, 5.0);
    this.mesh.visible = true;
  }

  public interpolateRender(alpha: number): void {
    this.mesh.position.lerpVectors(this.prevPosition, this.simPosition, alpha);
  }

  public updateChase(playerPos: THREE.Vector3, dt: number, simTime: number, effects?: EffectsSystem): void {
    this.prevPosition.copy(this.simPosition);

    const targetZ = playerPos.z + this.chaseDistance;
    this.simPosition.x += (playerPos.x - this.simPosition.x) * 0.12 * (dt * 60);
    this.simPosition.z += (targetZ - this.simPosition.z) * 0.1 * (dt * 60);
    this.simPosition.y = Math.abs(Math.sin(simTime * 13)) * 0.12;

    // Multi-joint Stride Mechanics
    const isCritical = this.chaseDistance < 4.8;
    const isMidRange = this.chaseDistance >= 4.8 && this.chaseDistance < 6.8;

    const runSpeedMultiplier = isCritical ? 16 : isMidRange ? 14 : 12;
    const t = simTime * runSpeedMultiplier;

    // Forward torso pitch increases dramatically as he closes in
    const targetPitch = isCritical ? 0.48 : isMidRange ? 0.32 : 0.18;
    this.torsoGroup.rotation.x = THREE.MathUtils.lerp(this.torsoGroup.rotation.x, targetPitch, 0.1 * (dt * 60));
    this.torsoGroup.position.y = Math.abs(Math.sin(t)) * 0.06;

    // Legs: Articulated sprinting with knee lift
    const leftPhase = Math.sin(t);
    this.leftLeg.rotation.x = leftPhase * 0.72;
    this.leftShin.rotation.x = Math.max(0, -leftPhase) * 0.9;
    this.leftFoot.rotation.x = leftPhase * 0.2;

    const rightPhase = Math.sin(t + Math.PI);
    this.rightLeg.rotation.x = rightPhase * 0.72;
    this.rightShin.rotation.x = Math.max(0, -rightPhase) * 0.9;
    this.rightFoot.rotation.x = rightPhase * 0.2;

    // Arm Behaviors & Emotes
    if (isCritical) {
      // Critical Danger: Desperate lunging with both arms reaching out to hand flowers & grab
      this.leftArm.rotation.x = -1.6 + Math.sin(t) * 0.25;
      this.leftForearm.rotation.x = -0.8;
      this.rightArm.rotation.x = -1.8 + Math.cos(t) * 0.25;
      this.rightForearm.rotation.x = -0.5;

      // Facial panic: Open mouth, raised pleading eyebrows
      this.mouthSmirk.visible = false;
      this.mouthOpen.visible = true;
      this.leftEyebrow.rotation.z = 0.25;
      this.rightEyebrow.rotation.z = -0.25;

      // Comic sweat drops spraying from brow
      if (effects && Math.random() < 0.45) {
        effects.emitSweat(
          new THREE.Vector3(this.simPosition.x, this.simPosition.y + 2.1, this.simPosition.z)
        );
      }

      this.speechDisplayTimer = 4.0; // Refresh display duration latch to 4.0s
    } else {
      this.speechDisplayTimer = Math.max(0, this.speechDisplayTimer - dt);

      if (isMidRange) {
        // Mid Range: Urgent running, waving bouquet arm
        this.leftArm.rotation.x = -1.2 + Math.sin(t * 0.8) * 0.4;
        this.leftForearm.rotation.x = -0.6;
        this.rightArm.rotation.x = leftPhase * 0.7;
        this.rightForearm.rotation.x = -0.45 + Math.abs(leftPhase) * 0.4;

        this.mouthSmirk.visible = true;
        this.mouthOpen.visible = false;
        this.leftEyebrow.rotation.z = -0.1;
        this.rightEyebrow.rotation.z = 0.1;
      } else {
        // Standard pursuit
        this.leftArm.rotation.x = rightPhase * 0.65;
        this.leftForearm.rotation.x = -0.45 + Math.abs(rightPhase) * 0.35;
        this.rightArm.rotation.x = leftPhase * 0.65;
        this.rightForearm.rotation.x = -0.45 + Math.abs(leftPhase) * 0.35;

        this.mouthSmirk.visible = true;
        this.mouthOpen.visible = false;
        this.leftEyebrow.rotation.z = -0.15;
        this.rightEyebrow.rotation.z = 0.15;
      }
    }

    // Dynamic Floating Speech Bubble Update (Timer & Phrase cycling)
    if (this.speechDisplayTimer > 0) {
      this.speechTimer += dt;
      if (this.speechTimer > 3.2) {
        this.speechTimer = 0;
        const phrases: TextureType[] = ["speech_bubble_suno", "speech_bubble_wait", "speech_bubble_flowers", "speech_bubble_yawrrrrr"];
        const nextPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        if (nextPhrase !== this.currentSpeechType) {
          this.currentSpeechType = nextPhrase;
        }
      }
    }
    this.speechBubbleMesh.visible = false;

    // Footstep dust
    const stepPhase = Math.sin(t);
    if (this.lastStepPhase < 0 && stepPhase >= 0 && effects && Math.random() < 0.3) {
      effects.emitFootstepDust(this.simPosition);
    }
    this.lastStepPhase = stepPhase;
  }

  public updateCatchCutscene(playerPos: THREE.Vector3, dt: number, simTime: number): boolean {
    this.prevPosition.copy(this.simPosition);

    const dx = playerPos.x - this.simPosition.x;
    const dz = playerPos.z - 1.2 - this.simPosition.z;

    this.simPosition.x += dx * 0.15 * (dt * 60);
    this.simPosition.z += dz * 0.1 * (dt * 60);
    this.simPosition.y = Math.abs(Math.sin(simTime * 14)) * 0.15;

    // Dramatic forward tackle/presenting flowers catch pose
    this.torsoGroup.rotation.x = 0.65;
    this.leftArm.rotation.x = -1.9;
    this.rightArm.rotation.x = -1.9;
    this.leftLeg.rotation.x = -0.4;
    this.rightLeg.rotation.x = 0.6;

    this.currentSpeechType = "speech_bubble_flowers";
    this.speechBubbleMesh.visible = false;

    return Math.abs(dz) < 0.4;
  }

  public getSpeechState(): { title: string; subtitle: string; emoji: string; color: string; active: boolean } {
    const active = (this.speechDisplayTimer > 0 || this.isCatching) && this.mesh.visible;
    const phrase = SPEECH_PHRASES[this.currentSpeechType] || SPEECH_PHRASES.speech_bubble_suno;
    return {
      title: phrase.title,
      subtitle: phrase.subtitle,
      emoji: phrase.emoji,
      color: phrase.color,
      active,
    };
  }

  public dispose(): void {
    this.hoodieMat.dispose();
    this.denimMat.dispose();
    this.sneakerMat.dispose();
    this.skinMat.dispose();
    this.hairMat.dispose();
    this.blackMat.dispose();
    this.whiteMat.dispose();
    this.flowerStemMat.dispose();
    this.flowerGoldMat.dispose();
    this.flowerRoseMat.dispose();
    this.wrapMat.dispose();
    this.speechBubbleMat.dispose();
  }
}
