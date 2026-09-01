import * as THREE from "three";
import { ObjectPool } from "../core/Pool";
import { TextureGenerator, TextureType } from "../TextureGenerator";
import { registerCurvedMaterial } from "../core/CurvedWorld";
import { BiomeType } from "../world/Biomes";

export type ParticleType = "confetti" | "dust" | "splash" | "impact" | "sparkle" | "star";

export interface ParticleItem {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotSpeed: number;
  life: number;
  decay: number;
  gravity: number;
  initialScale: number;
}

export interface WeatherParticleItem {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotSpeed: number;
  swayFreq: number;
  phase: number;
}

export class EffectsSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private activeParticles: ParticleItem[] = [];
  private pool: ObjectPool<THREE.Mesh>;
  private particleBudget = 120;

  // Speed lines
  private speedLines: THREE.Mesh[] = [];
  private speedLinesGroup: THREE.Group;
  private speedLineMat: THREE.MeshBasicMaterial;

  // Ambient Weather Particles
  private weatherGroup: THREE.Group;
  private activeWeatherParticles: WeatherParticleItem[] = [];
  private currentBiome: BiomeType = "park";
  private weatherEnabled = true;

  // Camera Shake
  private shakeIntensity = 0;
  public cameraShakeOffset: THREE.Vector3 = new THREE.Vector3();
  private baseFov = 60;
  private targetFov = 60;

  // Shared Billboard Plane Geometry & Material Cache
  private quadGeo: THREE.PlaneGeometry;
  private materialCache: Map<string, THREE.MeshBasicMaterial> = new Map();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, particleBudget = 120) {
    this.scene = scene;
    this.camera = camera;
    this.baseFov = camera.fov;
    this.targetFov = camera.fov;
    this.particleBudget = particleBudget;

    this.quadGeo = new THREE.PlaneGeometry(0.35, 0.35);

    this.pool = new ObjectPool<THREE.Mesh>(
      () => new THREE.Mesh(this.quadGeo, this.getParticleMaterial(0xffd700, "particle_sparkle")),
      (mesh) => {
        mesh.position.set(0, 0, 100);
        mesh.scale.set(1, 1, 1);
        mesh.rotation.set(0, 0, 0);
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

    // Build Weather Group
    this.weatherGroup = new THREE.Group();
    this.scene.add(this.weatherGroup);
    this.initWeatherParticles();
  }

  public setParticleBudget(budget: number): void {
    this.particleBudget = budget;
  }

  public setWeatherEnabled(enabled: boolean): void {
    this.weatherEnabled = enabled;
    this.weatherGroup.visible = enabled;
  }

  private getParticleMaterial(color: number, texType: TextureType): THREE.MeshBasicMaterial {
    const key = `${color}_${texType}`;
    if (!this.materialCache.has(key)) {
      const mat = registerCurvedMaterial(
        new THREE.MeshBasicMaterial({
          map: TextureGenerator.getTexture(texType),
          color,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        })
      );
      this.materialCache.set(key, mat);
    }
    return this.materialCache.get(key)!;
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
    type: ParticleType = "sparkle"
  ): void {
    let texType: TextureType = "particle_sparkle";
    let baseScale = 0.45;
    let gravity = 0.008;
    let decay = 0.025;

    if (type === "dust") {
      texType = "particle_smoke";
      baseScale = 0.55;
      gravity = 0.001;
      decay = 0.035;
    } else if (type === "confetti" || type === "splash") {
      texType = "particle_petal";
      baseScale = 0.4;
      decay = 0.02;
    } else if (type === "star") {
      texType = "particle_star";
      baseScale = 0.6;
      gravity = 0.004;
      decay = 0.022;
    } else if (type === "sparkle") {
      texType = "particle_sparkle";
      baseScale = 0.5;
      gravity = 0.002;
      decay = 0.035;
    } else if (type === "impact") {
      texType = "particle_sparkle";
      baseScale = 0.65;
      decay = 0.04;
    }

    const mat = this.getParticleMaterial(color, texType);
    const availableSlots = Math.max(0, this.particleBudget - this.activeParticles.length);
    const spawnCount = Math.min(count, availableSlots);

    for (let i = 0; i < spawnCount; i++) {
      const mesh = this.pool.acquire();
      mesh.material = mat;
      mesh.position.copy(pos);
      mesh.scale.set(baseScale, baseScale, baseScale);

      let vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.35,
        0.12 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.35
      );

      if (type === "dust") {
        vel.set((Math.random() - 0.5) * 0.12, Math.random() * 0.08, -0.06);
        mesh.position.y = 0.12;
      } else if (type === "impact") {
        vel.set(
          (Math.random() - 0.5) * 0.6,
          0.25 + Math.random() * 0.4,
          (Math.random() - 0.5) * 0.6
        );
      }

      this.scene.add(mesh);
      this.activeParticles.push({
        mesh,
        vel,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        life: 1.0,
        decay,
        gravity,
        initialScale: baseScale,
      });
    }
  }

  public emitMagneticStream(fromPos: THREE.Vector3, toPos: THREE.Vector3): void {
    const availableSlots = Math.max(0, this.particleBudget - this.activeParticles.length);
    if (availableSlots < 2) return;

    const count = 2;
    const mat = this.getParticleMaterial(0x38bdf8, "particle_sparkle");

    for (let i = 0; i < count; i++) {
      const mesh = this.pool.acquire();
      mesh.material = mat;
      const t = Math.random() * 0.5;
      mesh.position.lerpVectors(fromPos, toPos, t);
      mesh.scale.set(0.35, 0.35, 0.35);

      const dir = new THREE.Vector3().subVectors(toPos, fromPos).normalize().multiplyScalar(0.4);
      dir.x += (Math.random() - 0.5) * 0.1;
      dir.y += (Math.random() - 0.5) * 0.1;

      this.scene.add(mesh);
      this.activeParticles.push({
        mesh,
        vel: dir,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        life: 1.0,
        decay: 0.05,
        gravity: -0.001,
        initialScale: 0.35,
      });
    }
  }

  public emitMagneticPulse(center: THREE.Vector3): void {
    const count = 8;
    const mat = this.getParticleMaterial(0x0284c7, "particle_sparkle");
    const availableSlots = Math.max(0, this.particleBudget - this.activeParticles.length);
    const spawnCount = Math.min(count, availableSlots);

    for (let i = 0; i < spawnCount; i++) {
      const mesh = this.pool.acquire();
      mesh.material = mat;
      mesh.position.set(center.x, 0.1, center.z);
      mesh.scale.set(0.4, 0.4, 0.4);

      const angle = (i / spawnCount) * Math.PI * 2;
      const vel = new THREE.Vector3(Math.cos(angle) * 0.25, 0.02, Math.sin(angle) * 0.25);

      this.scene.add(mesh);
      this.activeParticles.push({
        mesh,
        vel,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        life: 1.0,
        decay: 0.035,
        gravity: 0,
        initialScale: 0.4,
      });
    }
  }

  public setBiome(biome: BiomeType): void {
    if (this.currentBiome === biome) return;
    this.currentBiome = biome;
    this.updateWeatherMaterials();
  }

  private initWeatherParticles(): void {
    const count = 25;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        this.quadGeo,
        this.getParticleMaterial(0xf472b6, "particle_petal")
      );
      this.resetWeatherParticlePosition(mesh);
      this.weatherGroup.add(mesh);
      this.activeWeatherParticles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          -0.02 - Math.random() * 0.03,
          0.05 + Math.random() * 0.05
        ),
        rotSpeed: (Math.random() - 0.5) * 0.05,
        swayFreq: 1.5 + Math.random() * 2.0,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private resetWeatherParticlePosition(mesh: THREE.Mesh): void {
    mesh.position.set(
      (Math.random() - 0.5) * 20,
      1.0 + Math.random() * 6.0,
      -10 - Math.random() * 35
    );
    const scale = 0.25 + Math.random() * 0.25;
    mesh.scale.set(scale, scale, scale);
  }

  private updateWeatherMaterials(): void {
    let color = 0xf472b6;
    let texType: TextureType = "particle_petal";

    switch (this.currentBiome) {
      case "park":
        color = 0xf472b6; // Sakura / floral petal
        texType = "particle_petal";
        break;
      case "lake":
        color = 0x81d4fa; // Shimmering mist
        texType = "particle_smoke";
        break;
      case "sunset":
        color = 0xffd54f; // Golden sun dust
        texType = "particle_sparkle";
        break;
      case "dino":
        color = 0xff7043; // Glowing ember / firefly
        texType = "particle_sparkle";
        break;
    }

    const mat = this.getParticleMaterial(color, texType);
    for (const item of this.activeWeatherParticles) {
      item.mesh.material = mat;
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
    const step = dt * 60;

    // 1. Particle Physics & Billboard Alignment
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.mesh.position.addScaledVector(p.vel, step);
      p.vel.y -= p.gravity * step;
      p.life -= p.decay * step;

      // Smooth ease-out scale and alpha
      const s = Math.max(0, p.life) * p.initialScale;
      p.mesh.scale.set(s, s, s);
      p.mesh.rotation.z += p.rotSpeed * step;
      p.mesh.quaternion.copy(this.camera.quaternion);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.pool.release(p.mesh);
        this.activeParticles.splice(i, 1);
      }
    }

    // 2. Weather Particles (Drifting atmosphere)
    if (this.weatherEnabled) {
      const time = performance.now() * 0.001;
      for (const item of this.activeWeatherParticles) {
        item.mesh.position.x += Math.sin(time * item.swayFreq + item.phase) * 0.02 * step;
        item.mesh.position.y += item.vel.y * step;
        item.mesh.position.z += (speed * 0.8 + item.vel.z) * step;
        item.mesh.rotation.z += item.rotSpeed * step;
        item.mesh.quaternion.copy(this.camera.quaternion);

        if (item.mesh.position.z > 8 || item.mesh.position.y < 0.2) {
          this.resetWeatherParticlePosition(item.mesh);
        }
      }
    }

    // 3. Speed Lines
    for (const line of this.speedLines) {
      if (line.visible) {
        line.position.z += speed * 4 * step;
        if (line.position.z > 8) {
          this.resetSpeedLine(line);
        }
      }
    }

    // 4. Camera FOV kick
    if (Math.abs(this.camera.fov - this.targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFov, 0.1 * step);
      this.camera.updateProjectionMatrix();
    }

    // 5. Compute Shake Offset
    if (this.shakeIntensity > 0) {
      this.cameraShakeOffset.set(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity,
        0
      );
      this.shakeIntensity *= Math.pow(0.88, step);
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
    this.quadGeo.dispose();
    this.speedLineMat.dispose();
    for (const mat of this.materialCache.values()) {
      mat.dispose();
    }
  }
}
