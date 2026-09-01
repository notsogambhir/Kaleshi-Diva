import * as THREE from "three";
import { GameLoop } from "./core/Loop";
import { QualityManager, QualitySettings, QualityTier } from "./core/Quality";
import { HapticsManager } from "./core/Haptics";
import { Track } from "./world/Track";
import { Sky } from "./world/Sky";
import { SceneryManager } from "./world/Scenery";
import { Player, OutfitId } from "./entities/Player";
import { Pursuer } from "./entities/Pursuer";
import { CollectibleManager } from "./entities/Collectibles";
import { ObstacleManager } from "./entities/Obstacles";
import { PowerupManager } from "./entities/Powerups";
import { CollisionSystem } from "./systems/Collision";
import { SpawnerSystem } from "./systems/Spawner";
import { EffectsSystem } from "./systems/Effects";
import { AudioManager } from "./AudioManager";
import { TextureGenerator } from "./TextureGenerator";
import { BiomeType, BIOMES } from "./world/Biomes";
import { PostProcessingPipeline } from "./core/PostProcessingPipeline";
import { EnvironmentMapGenerator } from "./core/EnvironmentMapGenerator";

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private loop: GameLoop;
  private quality: QualitySettings;
  private abortController: AbortController;
  private postPipeline: PostProcessingPipeline;

  // Unified Scrolling World Group for sub-tick visual render interpolation
  private scrollingWorldGroup: THREE.Group;

  // Subsystems & Entities
  public audio: AudioManager;
  private track: Track;
  private sky: Sky;
  private scenery: SceneryManager;
  private player: Player;
  private pursuer: Pursuer;
  private collectibles: CollectibleManager;
  private obstacles: ObstacleManager;
  private powerups: PowerupManager;
  private spawner: SpawnerSystem;
  private effects: EffectsSystem;

  // Lighting
  private ambientLight!: THREE.AmbientLight;
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;

  // Biome Cross-Fading
  private currentBiome: BiomeType = "park";
  private targetBiome: BiomeType = "park";
  private biomeTransitionProgress = 1.0;
  private readonly biomeTransitionDuration = 2.8;

  // Callbacks
  public onScoreUpdate: (score: number) => void = () => {};
  public onGameOver: (
    score: number,
    isHighScore: boolean,
    distance: number,
    maxCombo: number,
    topSpeed: number
  ) => void = () => {};
  public onPowerupUpdate: (powerups: { shield: boolean; magnet: boolean; speed: boolean; dino: boolean }) => void = () => {};
  public onPursuerDistanceUpdate: (distance: number) => void = () => {};
  public onComboUpdate: (combo: number) => void = () => {};
  public onDistanceUpdate: (distance: number) => void = () => {};
  public onBiomeAnnounce: (biome: BiomeType, biomeName: string) => void = () => {};
  public onPursuerSpeechChange: (speech: {
    title: string;
    subtitle: string;
    emoji: string;
    color: string;
    active: boolean;
  } | null) => void = () => {};
  public onPursuerSpeechPosition: (x: number, y: number) => void = () => {};

  // Speech tracking to avoid duplicate dispatches
  private lastSpeechActive = false;
  private lastSpeechTitle = "";
  private speechHeadPos = new THREE.Vector3();

  // State
  public isPlaying = false;
  public isPaused = false;
  public demoMode = true;
  private isCaughtAnimation = false;

  private baseSpeed = 0.4;
  private gameSpeed = 0.4;
  private topSpeedAchieved = 0.4;
  private score = 0;
  private highScore = 0;
  private combo = 0;
  private maxCombo = 0;

  // Powerup active timers (in seconds)
  private hasShield = false;
  private magnetTimer = 0;
  private speedTimer = 0;
  private dinoTimer = 0;
  private lastSunflowerCollectTime = 0;
  private consecutiveCollectChain = 0;
  private lastMagneticPulseTime = 0;

  // Scoped boost landing grace period
  private boostLandingGrace = 0;

  // Near-miss slow-mo time dilation
  private slowMoTimer = 0;

  // Input state & latches
  private touchStartX = 0;
  private touchStartY = 0;
  private touchHandled = false;
  private inputBuffer: string | null = null;
  private inputBufferTimer = 0;

  // Fixed-Tick Render Interpolation State (Fixes defect #12)
  private lastDeltaMove = 0;
  private prevCamFollowTarget: THREE.Vector3 = new THREE.Vector3(0, 5, 12);
  private camFollowTarget: THREE.Vector3 = new THREE.Vector3(0, 5, 12);
  private interpolatedCam: THREE.Vector3 = new THREE.Vector3(0, 5, 12);
  private camDip = 0;
  private camDipVel = 0;
  private camRoll = 0;
  private prevCamRoll = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.abortController = new AbortController();
    this.audio = new AudioManager();
    this.highScore = parseInt(localStorage.getItem("sunflowerRunHighScore") || "0", 10);

    // 1. Quality & WebGL Renderer
    this.quality = QualityManager.detectQuality();
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.quality.tier !== "low",
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    if (this.quality.shadowsEnabled) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x90caf9);
    this.scene.fog = new THREE.Fog(0x90caf9, 35, 120);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 800);
    this.camera.position.set(0, 5, 12);
    this.camera.lookAt(0, 1.2, 0);

    // 3. Scrolling World Group
    this.scrollingWorldGroup = new THREE.Group();
    this.scene.add(this.scrollingWorldGroup);

    // 4. Initialize Lighting & Environment Map
    this.initLighting();
    this.updateEnvironmentMap("park");

    // 5. Initialize Subsystems & Entities with Hardware-Queried Max Anisotropy
    const hardwareMaxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const effectiveAnisotropy = Math.min(this.quality.maxAnisotropy, hardwareMaxAnisotropy);

    this.track = new Track(this.scene, effectiveAnisotropy);
    this.sky = new Sky(this.scene);
    this.scenery = new SceneryManager(this.scrollingWorldGroup);
    this.player = new Player(this.scene);
    this.pursuer = new Pursuer(this.scene);
    this.collectibles = new CollectibleManager(this.scrollingWorldGroup);
    this.obstacles = new ObstacleManager(this.scrollingWorldGroup);
    this.powerups = new PowerupManager(this.scrollingWorldGroup);
    this.spawner = new SpawnerSystem();
    this.effects = new EffectsSystem(this.scene, this.camera, this.quality.particleBudget);
    this.effects.setWeatherEnabled(this.quality.weatherParticlesEnabled);

    // 6. Post-Processing Pipeline
    this.postPipeline = new PostProcessingPipeline(
      this.renderer,
      this.scene,
      this.camera,
      this.quality
    );

    this.spawner.onBiomeChange = (newBiome) => this.startBiomeTransition(newBiome);
    this.collectibles.onSunflowerMissed = () => this.pursuer.onMissSunflower();

    // 7. Pre-populate initial scenery
    for (let i = 0; i < 18; i++) {
      this.scenery.spawn(-i * 10, "park");
    }

    // 8. Setup Inputs & Event Listeners
    this.setupInputs();
    this.setupLifecycleListeners();

    // 9. Setup Game Loop with render interpolation
    this.loop = new GameLoop(
      (dt, simTime) => this.update(dt, simTime),
      (alpha) => this.render(alpha)
    );
    this.loop.start();
  }

  private initLighting(): void {
    this.ambientLight = new THREE.AmbientLight(0xfff8f0, 0.55);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x90caf9, 0xffe0b2, 0.35);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.1);
    this.dirLight.position.set(12, 24, 12);

    if (this.quality.shadowsEnabled) {
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = this.quality.shadowMapSize;
      this.dirLight.shadow.mapSize.height = this.quality.shadowMapSize;
      this.dirLight.shadow.camera.left = -8;
      this.dirLight.shadow.camera.right = 8;
      this.dirLight.shadow.camera.top = 10;
      this.dirLight.shadow.camera.bottom = -10;
      this.dirLight.shadow.camera.near = 6;
      this.dirLight.shadow.camera.far = 58;
      this.dirLight.shadow.bias = -0.00015;
    }
    this.scene.add(this.dirLight);
  }

  private setupInputs(): void {
    const signal = this.abortController.signal;

    window.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
          this.handleInput("left");
          e.preventDefault();
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
          this.handleInput("right");
          e.preventDefault();
        } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") {
          this.handleInput("up");
          e.preventDefault();
        } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
          this.handleInput("down");
          e.preventDefault();
        } else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
          this.togglePause();
          e.preventDefault();
        }
      },
      { signal }
    );

    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length > 0) {
          this.touchStartX = e.touches[0].clientX;
          this.touchStartY = e.touches[0].clientY;
          this.touchHandled = false;
        }
      },
      { passive: false, signal }
    );

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        if (this.touchHandled || e.touches.length === 0) return;

        const dx = e.touches[0].clientX - this.touchStartX;
        const dy = e.touches[0].clientY - this.touchStartY;
        const threshold = 22;

        if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
          if (Math.abs(dx) > Math.abs(dy)) {
            this.handleInput(dx > 0 ? "right" : "left");
          } else {
            this.handleInput(dy < 0 ? "up" : "down");
          }
          this.touchHandled = true;
        }
      },
      { passive: false, signal }
    );

    this.canvas.addEventListener(
      "touchend",
      (e) => {
        if (!this.touchHandled && e.changedTouches.length > 0) {
          const dx = Math.abs(e.changedTouches[0].clientX - this.touchStartX);
          const dy = Math.abs(e.changedTouches[0].clientY - this.touchStartY);
          if (dx < 15 && dy < 15) {
            this.handleInput("up");
          }
        }
        this.touchHandled = false;
      },
      { passive: false, signal }
    );

    window.addEventListener(
      "resize",
      () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.postPipeline.setSize(window.innerWidth, window.innerHeight);
      },
      { signal }
    );
  }

  private setupLifecycleListeners(): void {
    const signal = this.abortController.signal;

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          this.pause();
        } else if (!this.isPaused) {
          this.resume();
        }
      },
      { signal }
    );

    window.addEventListener(
      "blur",
      () => {
        this.pause();
      },
      { signal }
    );

    window.addEventListener(
      "focus",
      () => {
        if (!this.isPaused) {
          this.resume();
        }
      },
      { signal }
    );
  }

  public setOutfit(outfitId: OutfitId): void {
    this.player.setOutfit(outfitId);
  }

  public togglePause(): boolean {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
    return this.isPaused;
  }

  public pause(): void {
    this.isPaused = true;
    this.loop.pause();
    this.audio.pauseMusic();
  }

  public resume(): void {
    this.isPaused = false;
    this.loop.resume();
    if (this.isPlaying) {
      this.audio.resumeMusic();
    }
  }

  private handleInput(action: "left" | "right" | "up" | "down"): void {
    if (!this.isPlaying || this.isPaused) return;

    if (action === "left") {
      const moved = this.player.moveLeft();
      if (moved) this.audio.laneWhoosh();
    } else if (action === "right") {
      const moved = this.player.moveRight();
      if (moved) this.audio.laneWhoosh();
    } else if (action === "up") {
      const jumped = this.player.jump();
      if (jumped) {
        this.audio.jump();
        HapticsManager.light();
      } else {
        this.inputBuffer = "up";
        this.inputBufferTimer = 0.15;
      }
    } else if (action === "down") {
      const ducked = this.player.duck();
      if (ducked) {
        this.audio.duck();
        HapticsManager.light();
      } else {
        this.inputBuffer = "down";
        this.inputBufferTimer = 0.15;
      }
    }
  }

  public startGame(): void {
    this.demoMode = false;
    this.isPlaying = true;
    this.isPaused = false;
    this.isCaughtAnimation = false;

    this.gameSpeed = this.baseSpeed;
    this.topSpeedAchieved = this.baseSpeed;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.slowMoTimer = 0;
    this.boostLandingGrace = 0;
    this.lastDeltaMove = 0;

    this.hasShield = false;
    this.magnetTimer = 0;
    this.speedTimer = 0;
    this.dinoTimer = 0;

    this.scrollingWorldGroup.position.set(0, 0, 0);
    this.prevCamFollowTarget.set(0, 5, 12);
    this.camFollowTarget.set(0, 5, 12);
    this.interpolatedCam.set(0, 5, 12);
    this.camDip = 0;
    this.camDipVel = 0;
    this.camRoll = 0;
    this.prevCamRoll = 0;
    this.camera.rotation.z = 0;

    this.player.reset();
    this.pursuer.reset(this.player.simPosition.x);
    this.collectibles.reset();
    this.obstacles.reset();
    this.powerups.reset();
    this.spawner.reset();
    this.effects.reset();

    this.scenery.reset();
    this.setBiomeInstant("park");

    for (let i = 0; i < 18; i++) {
      this.scenery.spawn(-i * 10, "park");
    }

    this.audio.init();
    this.audio.setBiome("park");
    this.audio.startMusic();
    this.notifyUI();
  }

  public setQualityTier(tier: QualityTier): void {
    this.quality = QualityManager.getSettingsForTier(tier);
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.postPipeline.setQuality(this.quality, window.innerWidth, window.innerHeight);
    this.effects.setParticleBudget(this.quality.particleBudget);
    this.effects.setWeatherEnabled(this.quality.weatherParticlesEnabled);
    this.scene.environmentIntensity = this.quality.environmentMapIntensity;
  }

  private updateEnvironmentMap(biome: BiomeType): void {
    this.scene.environment = EnvironmentMapGenerator.getEnvironmentMap(this.renderer, biome);
    this.scene.environmentIntensity = this.quality.environmentMapIntensity;
  }

  private startBiomeTransition(newBiome: BiomeType): void {
    if (this.currentBiome === newBiome && this.biomeTransitionProgress >= 1.0) return;
    this.targetBiome = newBiome;
    this.biomeTransitionProgress = 0;
    this.audio.setBiome(newBiome);
    this.track.startTransition(this.currentBiome, newBiome);
    this.sky.startTransition(this.currentBiome, newBiome);
    this.effects.startTransition(this.currentBiome, newBiome);
    this.updateEnvironmentMap(newBiome);
    this.onBiomeAnnounce(newBiome, BIOMES[newBiome].name);
  }

  private setBiomeInstant(biome: BiomeType): void {
    this.currentBiome = biome;
    this.targetBiome = biome;
    this.biomeTransitionProgress = 1.0;

    const config = BIOMES[biome];
    this.track.setBiome(biome);
    this.sky.setBiome(biome);
    this.effects.setBiome(biome);
    this.updateEnvironmentMap(biome);

    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.setHex(config.fogColor);
      this.scene.fog.near = config.fogNear;
      this.scene.fog.far = config.fogFar;
    }

    this.scene.background = new THREE.Color(config.skyColor);

    this.ambientLight.color.setHex(config.ambientColor);
    this.ambientLight.intensity = config.ambientIntensity;
    this.dirLight.color.setHex(config.directionalColor);
    this.dirLight.intensity = config.directionalIntensity;
    this.hemiLight.color.setHex(config.hemiSkyColor);
    this.hemiLight.groundColor.setHex(config.hemiGroundColor);
    this.hemiLight.intensity = config.hemiIntensity;
  }

  private updateBiomeCrossFade(dt: number): void {
    if (this.biomeTransitionProgress >= 1.0) return;

    this.biomeTransitionProgress += dt / this.biomeTransitionDuration;
    const p = Math.min(1.0, this.biomeTransitionProgress);

    const fromCfg = BIOMES[this.currentBiome];
    const toCfg = BIOMES[this.targetBiome];

    // 1. Fog Interpolation
    if (this.scene.fog instanceof THREE.Fog) {
      const colFrom = new THREE.Color(fromCfg.fogColor);
      const colTo = new THREE.Color(toCfg.fogColor);
      this.scene.fog.color.copy(colFrom.lerp(colTo, p));
      this.scene.fog.near = THREE.MathUtils.lerp(fromCfg.fogNear, toCfg.fogNear, p);
      this.scene.fog.far = THREE.MathUtils.lerp(fromCfg.fogFar, toCfg.fogFar, p);
    }

    // 2. Background Clear Color Interpolation
    if (this.scene.background instanceof THREE.Color) {
      const skyFrom = new THREE.Color(fromCfg.skyColor);
      const skyTo = new THREE.Color(toCfg.skyColor);
      this.scene.background.copy(skyFrom.lerp(skyTo, p));
    }

    // 3. 3-Point Lighting Interpolation
    const ambFrom = new THREE.Color(fromCfg.ambientColor);
    const ambTo = new THREE.Color(toCfg.ambientColor);
    this.ambientLight.color.copy(ambFrom.lerp(ambTo, p));
    this.ambientLight.intensity = THREE.MathUtils.lerp(fromCfg.ambientIntensity, toCfg.ambientIntensity, p);

    const dirFrom = new THREE.Color(fromCfg.directionalColor);
    const dirTo = new THREE.Color(toCfg.directionalColor);
    this.dirLight.color.copy(dirFrom.lerp(dirTo, p));
    this.dirLight.intensity = THREE.MathUtils.lerp(fromCfg.directionalIntensity, toCfg.directionalIntensity, p);

    const hemiSkyFrom = new THREE.Color(fromCfg.hemiSkyColor);
    const hemiSkyTo = new THREE.Color(toCfg.hemiSkyColor);
    this.hemiLight.color.copy(hemiSkyFrom.lerp(hemiSkyTo, p));

    const hemiGndFrom = new THREE.Color(fromCfg.hemiGroundColor);
    const hemiGndTo = new THREE.Color(toCfg.hemiGroundColor);
    this.hemiLight.groundColor.copy(hemiGndFrom.lerp(hemiGndTo, p));

    this.hemiLight.intensity = THREE.MathUtils.lerp(fromCfg.hemiIntensity, toCfg.hemiIntensity, p);

    // 4. Subsystem Transitions
    this.track.updateTransition(p);
    this.sky.updateTransition(p);
    this.effects.updateTransition(p);

    // 5. Finalize at completion
    if (p >= 1.0) {
      this.currentBiome = this.targetBiome;
      this.track.completeTransition(this.targetBiome);
      this.sky.completeTransition(this.targetBiome);
      this.effects.completeTransition(this.targetBiome);
      this.updateEnvironmentMap(this.targetBiome);
    }
  }

  private notifyUI(): void {
    this.onScoreUpdate(this.score);
    this.onComboUpdate(this.combo);
    this.onDistanceUpdate(this.spawner.getDistanceRun());
    this.onPowerupUpdate({
      shield: this.hasShield,
      magnet: this.magnetTimer > 0,
      speed: this.speedTimer > 0,
      dino: this.dinoTimer > 0,
    });
    this.onPursuerDistanceUpdate(this.pursuer.chaseDistance);
  }

  private triggerImpact(): void {
    this.isPlaying = false;
    this.isCaughtAnimation = true;
    this.player.triggerImpact();
    this.effects.triggerShake(0.8);
    this.audio.hit();
    this.audio.stopMusic();
    HapticsManager.heavy();
    this.pursuer.triggerCatch(this.player.simPosition.x);
  }

  private update(dt: number, simTime: number): void {
    if (!this.isPlaying && !this.demoMode && !this.isCaughtAnimation) {
      return;
    }

    let effectiveDt = dt;
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      effectiveDt = dt * 0.45;
    }

    // Input buffer processing
    if (this.inputBufferTimer > 0) {
      this.inputBufferTimer -= effectiveDt;
      if (this.inputBufferTimer <= 0) {
        this.inputBuffer = null;
      } else if (this.inputBuffer === "up") {
        if (this.player.jump()) {
          this.audio.jump();
          this.inputBuffer = null;
        }
      } else if (this.inputBuffer === "down") {
        if (this.player.duck()) {
          this.audio.duck();
          this.inputBuffer = null;
        }
      }
    }

    // Speed calculation
    let effectiveSpeed = this.demoMode ? 0.28 : this.gameSpeed;
    const isDashing = this.speedTimer > 0;
    const isRiding = this.dinoTimer > 0;

    if (this.boostLandingGrace > 0) {
      this.boostLandingGrace -= effectiveDt;
    }

    const isInvincible = isDashing || isRiding || this.boostLandingGrace > 0;

    if (isDashing) {
      effectiveSpeed = 0.85;
    } else if (this.isPlaying) {
      if (this.gameSpeed < 0.78) {
        this.gameSpeed += 0.00004 * (effectiveDt * 60);
      }
    }
    this.topSpeedAchieved = Math.max(this.topSpeedAchieved, effectiveSpeed);
    this.lastDeltaMove = effectiveSpeed * (effectiveDt * 60);

    // 1. Update World, Sky, and Scenery
    this.updateBiomeCrossFade(effectiveDt);
    this.track.update(effectiveSpeed, effectiveDt, simTime);
    this.sky.update(this.player.simPosition, effectiveDt, simTime);
    this.scenery.update(effectiveSpeed, effectiveDt, simTime);

    // 2. Update Entities
    this.player.isBoosting = isDashing;
    this.player.setDinoMount(isRiding);
    const magnetActive = this.magnetTimer > 0 || isRiding;
    this.player.update(effectiveDt, simTime, this.pursuer.chaseDistance, this.effects);

    // Dynamic landing recoil & camera dip feedback
    if (this.player.landedThisFrame === "dive") {
      this.camDip = -0.45;
      this.camDipVel = 0.08;
      this.effects.triggerShake(0.35);
      HapticsManager.medium();
    } else if (this.player.landedThisFrame === "normal") {
      this.camDip = -0.15;
      this.camDipVel = 0.035;
    }

    if (magnetActive && this.isPlaying) {
      if (simTime - this.lastMagneticPulseTime > 1.4) {
        this.lastMagneticPulseTime = simTime;
        this.effects.emitMagneticPulse(this.player.simPosition);
      }
    }

    this.collectibles.update(effectiveSpeed, effectiveDt, simTime, magnetActive, this.player.simPosition);
    this.obstacles.update(effectiveSpeed, effectiveDt);
    this.powerups.update(effectiveSpeed, effectiveDt, simTime);
    this.effects.update(effectiveDt, effectiveSpeed);

    // 3. Distance-based Spawning
    const distanceDelta = this.lastDeltaMove * 0.35;
    this.spawner.update(
      distanceDelta,
      isDashing,
      this.collectibles,
      this.obstacles,
      this.powerups,
      this.scenery
    );

    // 4. Active Play Logic & Collisions
    if (this.isPlaying) {
      if (this.magnetTimer > 0) {
        this.magnetTimer -= effectiveDt;
        if (this.magnetTimer <= 0) this.notifyUI();
      }
      if (this.speedTimer > 0) {
        this.speedTimer -= effectiveDt;
        if (this.speedTimer <= 0) {
          this.boostLandingGrace = 0.6;
          this.effects.setSpeedBoost(false);
          this.notifyUI();
        }
      }
      if (this.dinoTimer > 0) {
        this.dinoTimer -= effectiveDt;
        if (this.dinoTimer <= 0) {
          this.player.setDinoMount(false);
          this.notifyUI();
        }
      }

      this.pursuer.onCleanRun(effectiveDt);

      // Check Collisions against discrete simulation coordinates
      const collision = CollisionSystem.checkCollisions(
        this.player,
        this.obstacles.activeItems,
        this.collectibles.activeItems,
        this.powerups.activeItems,
        isInvincible
      );

      const scoreMultiplier = isRiding ? 2 : 1;

      if (collision.collectedSunflowers.length > 0) {
        collision.collectedSunflowers.sort((a, b) => b - a);

        const now = performance.now();
        if (now - this.lastSunflowerCollectTime < 380) {
          this.consecutiveCollectChain++;
        } else {
          this.consecutiveCollectChain = 0;
        }
        this.lastSunflowerCollectTime = now;

        for (const idx of collision.collectedSunflowers) {
          const item = this.collectibles.activeItems[idx];
          if (item && item.active) {
            item.active = false;
            this.effects.emit(item.mesh.position, 0xffd700, 7, "sparkle");
            if (magnetActive) {
              this.effects.emitMagneticStream(item.mesh.position, this.player.simPosition);
            }
            this.collectibles.removeAt(idx);

            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            const multiplier = Math.min(this.combo, 4);
            this.score += multiplier * scoreMultiplier;

            this.pursuer.chaseDistance = Math.min(8.5, this.pursuer.chaseDistance + 0.18);
          }
        }
        this.audio.collect(this.consecutiveCollectChain);
        HapticsManager.light();
        this.notifyUI();
      }

      if (collision.nearMissObstacleIndex >= 0) {
        this.slowMoTimer = 0.15;
        this.audio.nearMiss();
        this.effects.emit(this.player.simPosition, 0x38bdf8, 8, "sparkle");

        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.score += 5 * scoreMultiplier;
        this.notifyUI();
      }

      if (collision.collectedPowerupIndex >= 0) {
        const pwr = this.powerups.activeItems[collision.collectedPowerupIndex];
        if (pwr && pwr.active) {
          pwr.active = false;
          this.audio.powerup();
          HapticsManager.medium();
          this.effects.emit(pwr.mesh.position, 0xffd54f, 12, "confetti");

          if (pwr.type === "shield") {
            this.hasShield = true;
            this.player.setShield(true);
          } else if (pwr.type === "magnet") {
            this.magnetTimer = 10;
            this.audio.magnetActivate();
          } else if (pwr.type === "speed") {
            this.speedTimer = 6;
            this.effects.setSpeedBoost(true, 0xff4444);
          } else if (pwr.type === "dino") {
            this.dinoTimer = 8;
            this.player.setDinoMount(true);
            this.audio.dinoRoar();
            // Dino Ride is a heavy ground tank, no speed lines / FOV kick
          }

          this.powerups.removeAt(collision.collectedPowerupIndex);
          this.notifyUI();
        }
      }

      if (collision.hitObstacleIndex >= 0) {
        const obs = this.obstacles.activeItems[collision.hitObstacleIndex];
        const isWood = obs.type === "low" || obs.type === "high";
        const debrisMat = isWood ? "wood" : "cyan";

        if (isInvincible || isRiding) {
          obs.active = false;
          this.effects.emitObstacleShatter(obs.mesh.position, debrisMat, 7);
          this.effects.triggerShake(0.35);
          this.audio.hit();
          this.obstacles.removeAt(collision.hitObstacleIndex);
        } else if (this.hasShield) {
          this.hasShield = false;
          this.player.setShield(false);
          obs.active = false;
          this.effects.emitObstacleShatter(obs.mesh.position, debrisMat, 8);
          this.effects.triggerShake(0.48);
          this.audio.hit();
          HapticsManager.heavy();
          this.obstacles.removeAt(collision.hitObstacleIndex);

          this.pursuer.onShieldImpact();
          this.combo = 0;
          this.notifyUI();
        } else if (collision.hitType === "side_impact") {
          // Side Impact / Stumble (Subway Surfers mechanic)
          obs.sideHit = true;
          this.player.bounceOffSide();
          this.player.triggerStumble();
          this.audio.stumble();

          const contactX = (this.player.simPosition.x + obs.mesh.position.x) * 0.5;
          this.effects.emit(
            new THREE.Vector3(contactX, 1.0, this.player.simPosition.z),
            0xffb703,
            12,
            "slide_spark"
          );
          this.effects.triggerShake(0.25);
          HapticsManager.medium();
          this.combo = 0;

          const caught = this.pursuer.onSideImpact();
          if (caught || this.pursuer.checkCaught()) {
            this.triggerImpact();
          } else {
            this.notifyUI();
          }
        } else {
          this.triggerImpact();
        }
      }

      if (this.pursuer.checkCaught()) {
        this.triggerImpact();
      }

      if (this.player.simPosition.y <= 0 && !this.player.isJumping) {
        const dustChance = isRiding ? 0.6 : 0.25;
        if (Math.random() < dustChance) {
          this.effects.emit(
            new THREE.Vector3(this.player.simPosition.x, 0.05, this.player.simPosition.z - 0.4),
            0x8d6e63,
            isRiding ? 4 : 1,
            "dust"
          );
        }
      }

      this.pursuer.updateChase(this.player.simPosition, effectiveDt, simTime, this.effects);
    }

    // 5. Catch Cutscene
    if (this.isCaughtAnimation) {
      this.player.updateTumble(effectiveDt);
      const isCaught = this.pursuer.updateCatchCutscene(this.player.simPosition, effectiveDt, simTime);

      if (isCaught) {
        this.isCaughtAnimation = false;
        this.demoMode = true;

        const isNewHigh = this.score > this.highScore;
        if (isNewHigh) {
          this.highScore = this.score;
          localStorage.setItem("sunflowerRunHighScore", this.score.toString());
        }

        this.onGameOver(
          this.score,
          isNewHigh,
          this.spawner.getDistanceRun(),
          this.maxCombo,
          Math.round(this.topSpeedAchieved * 100)
        );
      }
    }

    // 6. Camera Follow Target Calculation in Simulation Step (Fixes defect #12)
    this.prevCamFollowTarget.copy(this.camFollowTarget);
    this.prevCamRoll = this.camRoll;

    // Elastic spring for camera landing dip
    const dipDiff = -this.camDip;
    this.camDipVel += dipDiff * 0.22 * (effectiveDt * 60);
    this.camDipVel *= Math.pow(0.72, effectiveDt * 60);
    this.camDip += this.camDipVel * (effectiveDt * 60);

    const targetCamX = this.player.simPosition.x * 0.35;
    this.camFollowTarget.x += (targetCamX - this.camFollowTarget.x) * 0.12 * (effectiveDt * 60);
    this.camFollowTarget.y = 5 + this.player.simPosition.y * 0.22 + this.camDip;

    // Subtle Dutch angle banking on lane switches
    const targetRoll = -this.player.velocityX * 0.08;
    this.camRoll = THREE.MathUtils.lerp(this.camRoll, targetRoll, 0.18 * (effectiveDt * 60));

    // 7. Update Post-Processing Screen FX
    if (this.postPipeline.isEnabled) {
      this.postPipeline.setSpeedBlur(isDashing ? 0.8 : isRiding ? 0.45 : 0.0);
      this.postPipeline.setChromaticAberration(
        this.slowMoTimer > 0 ? 0.75 : this.isCaughtAnimation ? 0.6 : 0.0
      );
      this.postPipeline.setVignette(isDashing ? 0.55 : 0.28);
    }
  }

  // Pure Visual Fixed-Tick Render Interpolation (Fixes defect #12)
  private render(alpha: number): void {
    // 1. Interpolate entire scrolling world group
    this.scrollingWorldGroup.position.z = alpha * this.lastDeltaMove;

    // 2. Interpolate player and pursuer visual transforms
    this.player.interpolateRender(alpha);
    this.pursuer.interpolateRender(alpha);

    // 3. Interpolate camera between discrete simulation states
    const shake = this.effects.cameraShakeOffset;
    this.interpolatedCam.lerpVectors(this.prevCamFollowTarget, this.camFollowTarget, alpha);
    const interpRoll = THREE.MathUtils.lerp(this.prevCamRoll, this.camRoll, alpha);

    this.camera.position.set(
      this.interpolatedCam.x + shake.x,
      this.interpolatedCam.y + shake.y,
      this.interpolatedCam.z + shake.z
    );
    this.camera.rotation.z = interpRoll;

    if (this.postPipeline.isEnabled) {
      this.postPipeline.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // 4. Update pursuer speech screen projection for DOM overlay
    const speechState = this.pursuer.getSpeechState();
    const isSpeechActive = speechState.active && (this.isPlaying || this.isCaughtAnimation);

    if (isSpeechActive !== this.lastSpeechActive || (isSpeechActive && speechState.title !== this.lastSpeechTitle)) {
      this.lastSpeechActive = isSpeechActive;
      this.lastSpeechTitle = speechState.title;
      if (isSpeechActive) {
        this.onPursuerSpeechChange({
          title: speechState.title,
          subtitle: speechState.subtitle,
          emoji: speechState.emoji,
          color: speechState.color,
          active: true,
        });
      } else {
        this.onPursuerSpeechChange(null);
      }
    }

    if (isSpeechActive) {
      this.speechHeadPos.set(
        this.pursuer.mesh.position.x,
        this.pursuer.mesh.position.y + 2.4,
        this.pursuer.mesh.position.z
      );
      this.speechHeadPos.project(this.camera);
      const screenX = (this.speechHeadPos.x * 0.5 + 0.5) * window.innerWidth;
      const screenY = (-(this.speechHeadPos.y * 0.5) + 0.5) * window.innerHeight;
      this.onPursuerSpeechPosition(screenX, screenY);
    }
  }

  public destroy(): void {
    this.loop.stop();
    this.abortController.abort();
    this.audio.stopMusic();

    this.postPipeline.dispose();
    EnvironmentMapGenerator.dispose();

    this.track.dispose();
    this.sky.dispose();
    this.scenery.dispose();
    this.player.dispose();
    this.pursuer.dispose();
    this.collectibles.dispose();
    this.obstacles.dispose();
    this.powerups.dispose();
    this.effects.dispose();
    TextureGenerator.disposeAll();

    this.renderer.dispose();
  }
}
