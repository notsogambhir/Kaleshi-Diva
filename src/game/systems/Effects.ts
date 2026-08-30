import * as THREE from "three";
import { ObjectPool } from "../core/Pool";

export interface ParticleItem {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  decay: number;
  gravity: number;
}

export class EffectsSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private activeParticles: ParticleItem[] = [];
  private pool: ObjectPool<THREE.Mesh>;
  private particleBudget = 100;

  // Speed lines
  private speedLines: THREE.Mesh[] = [];
  private speedLinesGroup: THREE.Group;
  private speedLineMat: THREE.MeshBasicMaterial;

  // Camera Shake (computed as offset for GameEngine single-authority)
  private shakeIntensity = 0;
  public cameraShakeOffset: THREE.Vector3 = new THREE.Vector3();
  private baseFov = 60;
  private targetFov = 60;

  // Particle Material Cache
  private materialCache: Map<number, THREE.MeshBasicMaterial> = new Map();
  private sharedGeo: THREE.BoxGeometry;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, particleBudget = 100) {
    this.scene = scene;
    this.camera = camera;
    this.baseFov = camera.fov;
    this.targetFov = camera.fov;
    this.particleBudget = particleBudget;

    this.sharedGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);

    this.pool = new ObjectPool<THREE.Mesh>(
      () => new THREE.Mesh(this.sharedGeo, this.getMaterial(0xffd700)),
      (mesh) => {
        mesh.position.set(0, 0, 100);
        mesh.scale.set(1, 1, 1);
      },
      particleBudget
    );

    // Build Speed Lines
    this.speedLinesGroup = new THREE.Group();
    const lineGeo = new THREE.BoxGeometry(0.04, 0.04, 6);
    this.speedLineMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
    });

    for (let i = 0; i < 24; i++) {
      const line = new THREE.Mesh(lineGeo, this.speedLineMat);
      this.resetSpeedLine(line);
      line.visible = false;
      this.speedLinesGroup.add(line);
      this.speedLines.push(line);
    }
    this.scene.add(this.speedLinesGroup);
  }

  public setParticleBudget(budget: number): void {
    this.particleBudget = budget;
  }

  private getMaterial(color: number): THREE.MeshBasicMaterial {
    if (!this.materialCache.has(color)) {
      this.materialCache.set(color, new THREE.MeshBasicMaterial({ color }));
    }
    return this.materialCache.get(color)!;
  }

  private resetSpeedLine(line: THREE.Mesh): void {
    line.position.x = (Math.random() - 0.5) * 26;
    line.position.y = 1 + Math.random() * 8;
    line.position.z = -15 - Math.random() * 50;
  }

  public emit(
    pos: THREE.Vector3,
    color: number,
    count: number,
    type: "confetti" | "dust" | "splash" | "impact" | "sparkle"
  ): void {
    const mat = this.getMaterial(color);
    const availableSlots = Math.max(0, this.particleBudget - this.activeParticles.length);
    const spawnCount = Math.min(count, availableSlots);

    for (let i = 0; i < spawnCount; i++) {
      const mesh = this.pool.acquire();
      mesh.material = mat;
      mesh.position.copy(pos);

      let vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        0.1 + Math.random() * 0.25,
        (Math.random() - 0.5) * 0.3
      );
      let gravity = 0.008;
      let decay = 0.025;

      if (type === "dust") {
        vel.set((Math.random() - 0.5) * 0.1, Math.random() * 0.08, -0.05);
        mesh.position.y = 0.1;
        gravity = 0.002;
        decay = 0.04;
      } else if (type === "confetti") {
        vel.set(
          (Math.random() - 0.5) * 0.4,
          0.2 + Math.random() * 0.3,
          (Math.random() - 0.5) * 0.4
        );
        decay = 0.02;
      } else if (type === "sparkle") {
        vel.set(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        );
        gravity = 0.001;
        decay = 0.05;
      } else if (type === "impact") {
        vel.set(
          (Math.random() - 0.5) * 0.6,
          0.3 + Math.random() * 0.4,
          (Math.random() - 0.5) * 0.6
        );
        decay = 0.03;
      }

      this.scene.add(mesh);
      this.activeParticles.push({ mesh, vel, life: 1.0, decay, gravity });
    }
  }

  public triggerShake(intensity = 0.5): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  public setSpeedBoost(active: boolean, color = 0xffffff): void {
    this.targetFov = active ? this.baseFov + 12 : this.baseFov;
    this.speedLineMat.color.setHex(color);
    for (const line of this.speedLines) {
      line.visible = active;
      if (active) this.resetSpeedLine(line);
    }
  }

  public update(dt: number, speed: number): void {
    // 1. Particle Physics
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.mesh.position.addScaledVector(p.vel, dt * 60);
      p.vel.y -= p.gravity * (dt * 60);
      p.life -= p.decay * (dt * 60);

      const s = Math.max(0, p.life);
      p.mesh.scale.set(s, s, s);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.pool.release(p.mesh);
        this.activeParticles.splice(i, 1);
      }
    }

    // 2. Speed Lines
    for (const line of this.speedLines) {
      if (line.visible) {
        line.position.z += speed * 4 * (dt * 60);
        if (line.position.z > 8) {
          this.resetSpeedLine(line);
        }
      }
    }

    // 3. Camera FOV kick
    if (Math.abs(this.camera.fov - this.targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFov, 0.1 * (dt * 60));
      this.camera.updateProjectionMatrix();
    }

    // 4. Compute Shake Offset
    if (this.shakeIntensity > 0) {
      this.cameraShakeOffset.set(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity,
        0
      );
      this.shakeIntensity *= Math.pow(0.88, dt * 60);
      if (this.shakeIntensity < 0.02) {
        this.shakeIntensity = 0;
        this.cameraShakeOffset.set(0, 0, 0);
      }
    } else {
      this.cameraShakeOffset.set(0, 0, 0);
    }
  }

  public reset(): void {
    for (const p of this.activeParticles) {
      this.scene.remove(p.mesh);
      this.pool.release(p.mesh);
    }
    this.activeParticles = [];
    this.setSpeedBoost(false);
    this.shakeIntensity = 0;
    this.cameraShakeOffset.set(0, 0, 0);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {
    this.reset();
    this.pool.clear();
    this.sharedGeo.dispose();
    this.speedLineMat.dispose();
    for (const mat of this.materialCache.values()) {
      mat.dispose();
    }
  }
}
