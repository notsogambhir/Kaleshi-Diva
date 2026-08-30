import * as THREE from "three";
import { registerCurvedMaterial } from "../core/CurvedWorld";

export class Pursuer {
  public mesh: THREE.Group;
  public chaseDistance = 8.0; // Distance behind player (metres)
  public isCatching = false;

  // Authoritative simulation & previous tick state for render interpolation (Fixes defect #12)
  public simPosition: THREE.Vector3 = new THREE.Vector3();
  public prevPosition: THREE.Vector3 = new THREE.Vector3();

  private bodyMat: THREE.MeshStandardMaterial;
  private skinMat: THREE.MeshStandardMaterial;
  private hairMat: THREE.MeshStandardMaterial;
  private blackMat: THREE.MeshStandardMaterial;

  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Group();

    this.bodyMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.7 }));
    this.skinMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.6 }));
    this.hairMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.9 }));
    this.blackMat = registerCurvedMaterial(new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));

    // Torso
    const bodyGeo = new THREE.BoxGeometry(0.7, 1.2, 0.4);
    const body = new THREE.Mesh(bodyGeo, this.bodyMat);
    body.position.y = 1.3;
    body.castShadow = true;
    this.mesh.add(body);

    // Head & Face
    const headGroup = new THREE.Group();
    headGroup.position.y = 2.1;
    this.mesh.add(headGroup);

    const headGeo = new THREE.SphereGeometry(0.35, 20, 20);
    const head = new THREE.Mesh(headGeo, this.skinMat);
    head.castShadow = true;
    headGroup.add(head);

    const hairGeo = new THREE.SphereGeometry(0.36, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const hair = new THREE.Mesh(hairGeo, this.hairMat);
    hair.position.y = 0.05;
    headGroup.add(hair);

    const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, this.blackMat);
    leftEye.position.set(-0.12, 0.05, 0.31);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, this.blackMat);
    rightEye.position.set(0.12, 0.05, 0.31);
    headGroup.add(rightEye);

    const smirkGeo = new THREE.TorusGeometry(0.06, 0.02, 2, 8, Math.PI * 0.7);
    const smirk = new THREE.Mesh(smirkGeo, this.blackMat);
    smirk.position.set(0, -0.1, 0.32);
    smirk.rotation.z = Math.PI * 0.8;
    headGroup.add(smirk);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.9, 0.2);
    this.leftArm = new THREE.Mesh(armGeo, this.bodyMat);
    this.leftArm.position.set(-0.45, 1.3, 0);
    this.leftArm.castShadow = true;
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, this.bodyMat);
    this.rightArm.position.set(0.45, 1.3, 0);
    this.rightArm.castShadow = true;
    this.mesh.add(this.rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    this.leftLeg = new THREE.Mesh(legGeo, this.blackMat);
    this.leftLeg.position.set(-0.2, 0.4, 0);
    this.leftLeg.castShadow = true;
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, this.blackMat);
    this.rightLeg.position.set(0.2, 0.4, 0);
    this.rightLeg.castShadow = true;
    this.mesh.add(this.rightLeg);

    this.simPosition.set(0, 0, 8.0);
    this.prevPosition.set(0, 0, 8.0);
    this.mesh.position.set(0, 0, 8.0);
    this.mesh.visible = true;
    scene.add(this.mesh);
  }

  public reset(playerX = 0): void {
    this.chaseDistance = 8.0;
    this.isCatching = false;
    this.simPosition.set(playerX, 0, 8.0);
    this.prevPosition.set(playerX, 0, 8.0);
    this.mesh.position.set(playerX, 0, 8.0);
    this.mesh.visible = true;
  }

  public onMissSunflower(): void {
    this.chaseDistance = Math.max(0.5, this.chaseDistance - 0.35);
  }

  public onShieldImpact(): void {
    this.chaseDistance = Math.max(0.5, this.chaseDistance - 3.2);
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

  public updateChase(playerPos: THREE.Vector3, dt: number, simTime: number): void {
    this.prevPosition.copy(this.simPosition);

    const targetZ = playerPos.z + this.chaseDistance;
    this.simPosition.x += (playerPos.x - this.simPosition.x) * 0.12 * (dt * 60);
    this.simPosition.z += (targetZ - this.simPosition.z) * 0.1 * (dt * 60);
    this.simPosition.y = Math.abs(Math.sin(simTime * 12)) * 0.12;

    const t = simTime * 12;
    this.leftLeg.rotation.x = Math.sin(t) * 0.65;
    this.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.65;
    this.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.65;
    this.rightArm.rotation.x = Math.sin(t) * 0.65;
  }

  public updateCatchCutscene(playerPos: THREE.Vector3, dt: number, simTime: number): boolean {
    this.prevPosition.copy(this.simPosition);

    const dx = playerPos.x - this.simPosition.x;
    const dz = playerPos.z - 1.2 - this.simPosition.z;

    this.simPosition.x += dx * 0.15 * (dt * 60);
    this.simPosition.z += dz * 0.1 * (dt * 60);
    this.simPosition.y = Math.abs(Math.sin(simTime * 14)) * 0.15;

    const t = simTime * 14;
    this.leftLeg.rotation.x = Math.sin(t) * 0.7;
    this.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.7;
    this.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.7;
    this.rightArm.rotation.x = Math.sin(t) * 0.7;

    return Math.abs(dz) < 0.4;
  }

  public dispose(): void {
    this.bodyMat.dispose();
    this.skinMat.dispose();
    this.hairMat.dispose();
    this.blackMat.dispose();
  }
}
