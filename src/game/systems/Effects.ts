import * as THREE from "three";
import { ObjectPool } from "../core/Pool";
import { TextureGenerator, TextureType } from "../TextureGenerator";
import { registerCurvedMaterial } from "../core/CurvedWorld";
import { BiomeType } from "../world/Biomes";

export type ParticleType =
  | "confetti"
  | "dust"
  | "splash"
  | "impact"
  | "sparkle"
  | "star"
  | "sweat"
  | "slide_spark"
  | "shockwave";

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

export interface DebrisItem {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  angVel: THREE.Vector3;
  gravity: number;
  life: number;
  decay: number;
  initialScale: number;
  bounces: number;
}

export interface ShockwaveItem {
  mesh: THREE.Mesh;
  life: number;
  decay: number;
  maxScale: number;
  mat: THREE.MeshBasicMaterial;
}

export class EffectsSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private activeParticles: ParticleItem[] = [];
  private activeDebris: DebrisItem[] = [];
  private activeShockwaves: ShockwaveItem[] = [];
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

  // Camera Shake & Kinematics
  private shakeIntensity = 0;
  public cameraShakeOffset: THREE.Vector3 = new THREE.Vector3();
  private baseFov = 60;
  private targetFov = 60;

  // Shared Billboard Plane Geometry & Material Cache
  private quadGeo: THREE.PlaneGeometry;
  private shockwaveGeo: THREE.RingGeometry;
  private materialCache: Map<string, THREE.MeshBasicMaterial> = new Map();

  // 3D Rigid-Body Debris Geometries & Materials
  private debrisGeos: THREE.BufferGeometry[] = [];
  private debrisMats: Map<string, THREE.MeshStandardMaterial> = new Map();
  private debrisPool: ObjectPool<THREE.Mesh>;
  private shockwavePool: ObjectPool<THREE.Mesh>;

  // Reusable Vector3 instances to eliminate runtime garbage allocation
  private static _tmpEmitPos = new THREE.Vector3();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, particleBudget = 120) {
    this.scene = scene;
    this.camera = camera;
    this.baseFov = camera.fov;
    this.targetFov = camera.fov;
    this.particleBudget = particleBudget;

    this.quadGeo = new THREE.PlaneGeometry(0.35, 0.35);
    this.shockwaveGeo = new THREE.RingGeometry(0.2, 0.5, 32);
    this.shockwaveGeo.rotateX(-Math.PI / 2);

    // Initialize 2D Billboard Particle Pool
    this.pool = new ObjectPool<THREE.Mesh>(
      () => new THREE.Mesh(this.quadGeo, this.getParticleMaterial(0xffd700, "particle_sparkle")),
      (mesh) => {
        mesh.position.set(0, 0, 100);
        mesh.scale.set(1, 1, 1);
        mesh.rotation.set(0, 0, 0);
      },
      particleBudget
    );

    // Initialize 3D Debris Geometries (Wood planks, Post segments, Rock chunks, Ring arcs)
    const boxGeo = new THREE.BoxGeometry(0.35, 0.15, 0.2);
    const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.45, 6);
    const rockGeo = new THREE.DodecahedronGeometry(0.18, 0);
    const torusGeo = new THREE.TorusGeometry(0.22, 0.06, 6, 8);
    this.debrisGeos = [boxGeo, postGeo, rockGeo, torusGeo];

    // Debris Materials
    this.debrisMats.set(
      "wood",
      registerCurvedMaterial(
        new THREE.MeshStandardMaterial({
          map: TextureGenerator.getTexture("wood"),
          roughness: 0.8,
        })
      )
    );
    this.debrisMats.set(
      "amber",
      registerCurvedMaterial(
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xd97706,
          emissiveIntensity: 0.4,
          roughness: 0.3,
        })
      )
    );
    this.debrisMats.set(
      "cyan",
      registerCurvedMaterial(
        new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x0891b2,
          emissiveIntensity: 0.6,
          roughness: 0.25,
        })
      )
    );
    this.debrisMats.set(
      "rock",
      registerCurvedMaterial(
        new THREE.MeshStandardMaterial({
          color: 0x5d4037,
          roughness: 0.9,
        })
      )
    );

    this.debrisPool = new ObjectPool<THREE.Mesh>(
      () => new THREE.Mesh(this.debrisGeos[0], this.debrisMats.get("wood")!),
      (mesh) => {
        mesh.position.set(0, 0, 100);
        mesh.scale.set(1, 1, 1);
        mesh.rotation.set(0, 0, 0);
      },
      40
    );

    const shockwaveBaseMat = registerCurvedMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );

    this.shockwavePool = new ObjectPool<THREE.Mesh>(
      () => new THREE.Mesh(this.shockwaveGeo, shockwaveBaseMat.clone()),
      (mesh) => {
        mesh.position.set(0, 0, 100);
        mesh.scale.set(1, 1, 1);
      },
      12
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
      texType = "particle_dust";
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
    } else if (type === "sweat") {
      texType = "particle_sweat";
      baseScale = 0.42;
      gravity = 0.012;
      decay = 0.038;
    } else if (type === "slide_spark") {
      texType = "particle_sparkle";
      baseScale = 0.48;
      gravity = 0.005;
      decay = 0.045;
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
      } else if (type === "sweat") {
        vel.set(
          (Math.random() - 0.5) * 0.15,
          0.12 + Math.random() * 0.18,
          0.2 + Math.random() * 0.25
        );
      } else if (type === "slide_spark") {
        vel.set(
          (Math.random() - 0.5) * 0.25,
          0.05 + Math.random() * 0.15,
          0.12 + Math.random() * 0.2
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

  /**
   * Spawns 3D physically simulated debris fragments when breaking an obstacle
   */
  public emitObstacleShatter(
    pos: THREE.Vector3,
    type: "wood" | "amber" | "cyan" | "rock" = "wood",
    count = 6
  ): void {
    const mat = this.debrisMats.get(type) || this.debrisMats.get("wood")!;

    for (let i = 0; i < count; i++) {
      const mesh = this.debrisPool.acquire();
      const geo = this.debrisGeos[Math.floor(Math.random() * this.debrisGeos.length)];
      mesh.geometry = geo;
      mesh.material = mat;

      const offsetPos = new THREE.Vector3(
        pos.x + (Math.random() - 0.5) * 0.8,
        Math.max(0.3, pos.y + (Math.random() - 0.5) * 0.6),
        pos.z + (Math.random() - 0.5) * 0.4
      );
      mesh.position.copy(offsetPos);

      const baseScale = 0.8 + Math.random() * 0.5;
      mesh.scale.set(baseScale, baseScale, baseScale);

      // Explosive outward impulse with forward momentum
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.45,
        0.2 + Math.random() * 0.35,
        0.25 + Math.random() * 0.45
      );

      const angVel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.35
      );

      this.scene.add(mesh);
      this.activeDebris.push({
        mesh,
        vel,
        angVel,
        gravity: 0.016,
        life: 1.0,
        decay: 0.022,
        initialScale: baseScale,
        bounces: 0,
      });
    }

    // Accompanying sparkle/impact burst
    const sparkColor = type === "cyan" ? 0x06b6d4 : type === "amber" ? 0xf59e0b : 0xff9800;
    this.emit(pos, sparkColor, 10, "impact");
  }

  /**
   * Emits ground shockwave ring and dust burst on Air Dive slam or heavy landing
   */
  public emitAirDiveSlam(pos: THREE.Vector3): void {
    const shockwave = this.shockwavePool.acquire();
    shockwave.position.set(pos.x, 0.06, pos.z);
    shockwave.scale.set(0.2, 0.2, 0.2);

    const mat = shockwave.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.85;
    mat.color.setHex(0x38bdf8);

    this.scene.add(shockwave);
    this.activeShockwaves.push({
      mesh: shockwave,
      life: 1.0,
      decay: 0.045,
      maxScale: 3.2,
      mat,
    });

    // Circular dust burst around landing spot
    const dustCount = 8;
    for (let i = 0; i < dustCount; i++) {
      const angle = (i / dustCount) * Math.PI * 2;
      EffectsSystem._tmpEmitPos.set(
        pos.x + Math.cos(angle) * 0.3,
        0.05,
        pos.z + Math.sin(angle) * 0.3
      );
      this.emit(EffectsSystem._tmpEmitPos, 0xd7cdbe, 2, "dust");
    }

    // Cyan landing sparks
    EffectsSystem._tmpEmitPos.set(pos.x, 0.15, pos.z);
    this.emit(EffectsSystem._tmpEmitPos, 0x38bdf8, 6, "slide_spark");
  }

  public emitFootstepDust(pos: THREE.Vector3, color = 0xd7cdbe): void {
    EffectsSystem._tmpEmitPos.set(pos.x, 0.05, pos.z - 0.2);
    this.emit(EffectsSystem._tmpEmitPos, color, 2, "dust");
  }

  public emitSlideSparks(pos: THREE.Vector3): void {
    EffectsSystem._tmpEmitPos.set(pos.x, 0.08, pos.z - 0.1);
    this.emit(EffectsSystem._tmpEmitPos, 0xf59e0b, 3, "slide_spark");
    EffectsSystem._tmpEmitPos.set(pos.x, 0.05, pos.z - 0.2);
    this.emit(EffectsSystem._tmpEmitPos, 0xd7cdbe, 1, "dust");
  }

  public emitSweat(pos: THREE.Vector3): void {
    EffectsSystem._tmpEmitPos.set(pos.x + (Math.random() - 0.5) * 0.4, pos.y + 0.1, pos.z);
    this.emit(EffectsSystem._tmpEmitPos, 0x38bdf8, 2, "sweat");
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

      const vel = new THREE.Vector3()
        .subVectors(toPos, fromPos)
        .normalize()
        .multiplyScalar(0.4);
      vel.x += (Math.random() - 0.5) * 0.1;
      vel.y += (Math.random() - 0.5) * 0.1;

      this.scene.add(mesh);
      this.activeParticles.push({
        mesh,
        vel,
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

  private targetBiome: BiomeType = "park";
  private isTransitioning = false;

  private getBiomeWeatherConfig(biome: BiomeType): { color: number; texType: TextureType } {
    switch (biome) {
      case "park":
        return { color: 0xf472b6, texType: "particle_petal" };
      case "lake":
        return { color: 0x81d4fa, texType: "particle_smoke" };
      case "sunset":
        return { color: 0xffd54f, texType: "particle_sparkle" };
      case "dino":
        return { color: 0xff7043, texType: "particle_sparkle" };
    }
  }

  public setBiome(biome: BiomeType): void {
    this.currentBiome = biome;
    this.targetBiome = biome;
    this.isTransitioning = false;
    const cfg = this.getBiomeWeatherConfig(biome);
    const mat = this.getParticleMaterial(cfg.color, cfg.texType);
    for (const item of this.activeWeatherParticles) {
      item.mesh.material = mat;
    }
  }

  public startTransition(_fromBiome: BiomeType, toBiome: BiomeType): void {
    this.targetBiome = toBiome;
    this.isTransitioning = true;
  }

  public updateTransition(_progress: number): void {
    // No-op: particles recycle into new material upon respawn
  }

  public completeTransition(toBiome: BiomeType): void {
    this.setBiome(toBiome);
  }

  private initWeatherParticles(): void {
    const count = 25;
    const cfg = this.getBiomeWeatherConfig(this.currentBiome);
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        this.quadGeo,
        this.getParticleMaterial(cfg.color, cfg.texType)
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

    const activeBiome = this.isTransitioning ? this.targetBiome : this.currentBiome;
    const cfg = this.getBiomeWeatherConfig(activeBiome);
    mesh.material = this.getParticleMaterial(cfg.color, cfg.texType);
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

    // 2. 3D Rigid-Body Debris Simulation with Gravity & Ground Bounce
    for (let i = this.activeDebris.length - 1; i >= 0; i--) {
      const d = this.activeDebris[i];
      d.mesh.position.addScaledVector(d.vel, step);
      d.vel.y -= d.gravity * step;

      d.mesh.rotation.x += d.angVel.x * step;
      d.mesh.rotation.y += d.angVel.y * step;
      d.mesh.rotation.z += d.angVel.z * step;

      // Ground collision & bounce restitution
      if (d.mesh.position.y <= 0.12 && d.vel.y < 0) {
        d.mesh.position.y = 0.12;
        d.vel.y = -d.vel.y * 0.45; // Restitution bounce
        d.vel.x *= 0.75; // Ground friction
        d.vel.z *= 0.75;
        d.angVel.multiplyScalar(0.7);
        d.bounces++;
      }

      d.life -= d.decay * step;
      const s = Math.max(0, d.life) * d.initialScale;
      d.mesh.scale.set(s, s, s);

      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        this.debrisPool.release(d.mesh);
        this.activeDebris.splice(i, 1);
      }
    }

    // 3. Ground Shockwave Rings
    for (let i = this.activeShockwaves.length - 1; i >= 0; i--) {
      const sw = this.activeShockwaves[i];
      sw.life -= sw.decay * step;

      const progress = 1.0 - Math.max(0, sw.life);
      const curScale = 0.2 + progress * sw.maxScale;
      sw.mesh.scale.set(curScale, curScale, curScale);
      sw.mat.opacity = Math.max(0, sw.life) * 0.85;

      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        this.shockwavePool.release(sw.mesh);
        this.activeShockwaves.splice(i, 1);
      }
    }

    // 4. Weather Particles (Drifting atmosphere)
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

    // 5. Speed Lines
    for (const line of this.speedLines) {
      if (line.visible) {
        line.position.z += speed * 4 * step;
        if (line.position.z > 8) {
          this.resetSpeedLine(line);
        }
      }
    }

    // 6. Camera FOV kick
    if (Math.abs(this.camera.fov - this.targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFov, 0.1 * step);
      this.camera.updateProjectionMatrix();
    }

    // 7. Compute Shake Offset
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

    for (const d of this.activeDebris) {
      this.scene.remove(d.mesh);
      this.debrisPool.release(d.mesh);
    }
    this.activeDebris = [];

    for (const sw of this.activeShockwaves) {
      this.scene.remove(sw.mesh);
      this.shockwavePool.release(sw.mesh);
    }
    this.activeShockwaves = [];

    this.setSpeedBoost(false);
    this.shakeIntensity = 0;
    this.cameraShakeOffset.set(0, 0, 0);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {
    this.reset();
    this.pool.clear();
    this.debrisPool.clear();
    this.shockwavePool.clear();
    this.quadGeo.dispose();
    this.shockwaveGeo.dispose();
    this.speedLineMat.dispose();
    for (const geo of this.debrisGeos) {
      geo.dispose();
    }
    for (const mat of this.materialCache.values()) {
      mat.dispose();
    }
    for (const mat of this.debrisMats.values()) {
      mat.dispose();
    }
  }
}
