import * as THREE from "three";
import { TextureGenerator } from "../TextureGenerator";
import { BiomeType, BIOMES } from "./Biomes";

export class Sky {
  public group: THREE.Group;

  // Sky Domes (Separate meshes for smooth cross-fading)
  private skySphereSunset: THREE.Mesh;
  private skySphereDino: THREE.Mesh;

  // Sun & Glow
  private sunMesh: THREE.Mesh;
  private sunGlow: THREE.Mesh;
  private sunGlowSprite: THREE.Sprite;
  private currentSunY = -40;
  private targetSunY = -40;
  private currentSunOpacity = 0.0;
  private targetSunOpacity = 0.0;

  // Clouds & Flyers
  private clouds: THREE.Group;
  private flyersGroup: THREE.Group;
  private flyers: THREE.Group[] = [];
  private currentFlyerOpacity = 0.0;
  private targetFlyerOpacity = 0.0;

  // Materials
  private skyMatSunset: THREE.MeshBasicMaterial;
  private skyMatDino: THREE.MeshBasicMaterial;
  private sunMat: THREE.MeshBasicMaterial;
  private sunGlowMat: THREE.MeshBasicMaterial;
  private sunSpriteMat: THREE.SpriteMaterial;
  private pterodactylMat: THREE.MeshBasicMaterial;

  // State
  public currentBiome: BiomeType = "park";
  public fromBiome: BiomeType = "park";
  public targetBiome: BiomeType = "park";
  public isTransitioning = false;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();

    // 1. Materials with transparency for smooth cross-fading
    this.skyMatSunset = new THREE.MeshBasicMaterial({
      map: TextureGenerator.getTexture("sky_sunset"),
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.0,
      fog: false,
      depthWrite: false,
    });

    this.skyMatDino = new THREE.MeshBasicMaterial({
      map: TextureGenerator.getTexture("sky_dino"),
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.0,
      fog: false,
      depthWrite: false,
    });

    this.sunMat = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
      transparent: true,
      opacity: 0.0,
      fog: false,
    });

    this.sunGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      fog: false,
      depthWrite: false,
    });

    this.sunSpriteMat = new THREE.SpriteMaterial({
      map: TextureGenerator.getTexture("glow_radial"),
      blending: THREE.AdditiveBlending,
      color: 0xffaa00,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });

    this.pterodactylMat = new THREE.MeshBasicMaterial({
      color: 0x1c1917,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      fog: false,
    });

    // 2. Sky Domes
    const skyGeo = new THREE.SphereGeometry(400, 32, 32);
    this.skySphereSunset = new THREE.Mesh(skyGeo, this.skyMatSunset);
    this.skySphereSunset.rotation.y = Math.PI / 2;
    this.skySphereSunset.visible = false;
    this.group.add(this.skySphereSunset);

    this.skySphereDino = new THREE.Mesh(skyGeo, this.skyMatDino);
    this.skySphereDino.rotation.y = Math.PI / 2;
    this.skySphereDino.visible = false;
    this.group.add(this.skySphereDino);

    // 3. Sun with Additive Glow Mesh + Billboard Sprite
    const sunGeo = new THREE.SphereGeometry(50, 32, 32);
    this.sunMesh = new THREE.Mesh(sunGeo, this.sunMat);

    const glowGeo = new THREE.SphereGeometry(68, 32, 32);
    this.sunGlow = new THREE.Mesh(glowGeo, this.sunGlowMat);
    this.sunMesh.add(this.sunGlow);

    this.sunGlowSprite = new THREE.Sprite(this.sunSpriteMat);
    this.sunGlowSprite.scale.set(160, 160, 160);
    this.sunMesh.add(this.sunGlowSprite);

    this.sunMesh.position.set(0, this.currentSunY, -320);
    this.sunMesh.visible = false;
    this.group.add(this.sunMesh);

    // 4. Stylized drifting clouds
    this.clouds = new THREE.Group();
    this.initClouds();
    this.group.add(this.clouds);

    // 5. Soaring Pterodactyls
    this.flyersGroup = new THREE.Group();
    this.initPterodactyls();
    this.flyersGroup.visible = false;
    this.group.add(this.flyersGroup);

    scene.add(this.group);
  }

  private initClouds(): void {
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      fog: false,
    });
    const puffGeo = new THREE.SphereGeometry(12, 8, 8);

    for (let i = 0; i < 6; i++) {
      const cloud = new THREE.Group();
      for (let p = 0; p < 4; p++) {
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set((p - 1.5) * 10, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6);
        puff.scale.set(1.2, 0.6, 1.0);
        cloud.add(puff);
      }
      cloud.position.set((Math.random() - 0.5) * 300, 60 + Math.random() * 40, -150 - Math.random() * 150);
      cloud.userData = { speed: 0.05 + Math.random() * 0.08 };
      this.clouds.add(cloud);
    }
  }

  private initPterodactyls(): void {
    for (let i = 0; i < 4; i++) {
      const ptero = new THREE.Group();

      const body = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.5, 4), this.pterodactylMat);
      body.rotation.x = Math.PI / 2;
      ptero.add(body);

      const wingGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0.4,
        -4.5, 0.2, -0.6,
        0, 0, -0.8,
        0, 0, 0.4,
        4.5, 0.2, -0.6,
        0, 0, -0.8,
      ]);
      wingGeo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      const wings = new THREE.Mesh(wingGeo, this.pterodactylMat);
      ptero.add(wings);

      ptero.position.set(
        -80 + i * 50,
        35 + Math.random() * 20,
        -160 - Math.random() * 80
      );
      ptero.userData = {
        baseX: ptero.position.x,
        speedX: 0.35 + Math.random() * 0.25,
        flapSpeed: 4 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        wings,
      };

      this.flyers.push(ptero);
      this.flyersGroup.add(ptero);
    }
  }

  public setBiome(biome: BiomeType): void {
    this.currentBiome = biome;
    this.targetBiome = biome;
    this.isTransitioning = false;
    const config = BIOMES[biome];

    // Sunset Dome
    const isSunset = biome === "sunset";
    this.skyMatSunset.opacity = isSunset ? 1.0 : 0.0;
    this.skySphereSunset.visible = isSunset;

    // Dino Dome
    const isDino = biome === "dino";
    this.skyMatDino.opacity = isDino ? 1.0 : 0.0;
    this.skySphereDino.visible = isDino;

    // Sun & Glow
    const hasSun = config.hasSun;
    this.targetSunOpacity = hasSun ? 1.0 : 0.0;
    this.currentSunOpacity = this.targetSunOpacity;
    this.targetSunY = hasSun ? 30 : -40;
    this.currentSunY = this.targetSunY;
    this.sunMat.opacity = this.currentSunOpacity;
    this.sunGlowMat.opacity = this.currentSunOpacity * 0.55;
    this.sunSpriteMat.opacity = this.currentSunOpacity * 0.8;
    this.sunMesh.visible = hasSun;

    // Flyers
    const hasFlyers = biome === "sunset" || biome === "dino";
    this.targetFlyerOpacity = hasFlyers ? 1.0 : 0.0;
    this.currentFlyerOpacity = this.targetFlyerOpacity;
    this.pterodactylMat.opacity = this.currentFlyerOpacity;
    this.flyersGroup.visible = hasFlyers;
  }

  public startTransition(fromBiome: BiomeType, toBiome: BiomeType): void {
    this.fromBiome = fromBiome;
    this.targetBiome = toBiome;
    this.isTransitioning = true;

    // Ensure all potentially visible spheres/flyers/sun are enabled
    const fromConfig = BIOMES[fromBiome];
    const toConfig = BIOMES[toBiome];

    if (fromBiome === "sunset" || toBiome === "sunset") {
      this.skySphereSunset.visible = true;
    }
    if (fromBiome === "dino" || toBiome === "dino") {
      this.skySphereDino.visible = true;
    }

    if (fromConfig.hasSun || toConfig.hasSun) {
      this.sunMesh.visible = true;
      this.targetSunY = toConfig.hasSun ? 30 : -40;
      this.targetSunOpacity = toConfig.hasSun ? 1.0 : 0.0;
    }

    const hasFlyers = toBiome === "sunset" || toBiome === "dino" || fromBiome === "sunset" || fromBiome === "dino";
    if (hasFlyers) {
      this.flyersGroup.visible = true;
      this.targetFlyerOpacity = (toBiome === "sunset" || toBiome === "dino") ? 1.0 : 0.0;
    }
  }

  public updateTransition(progress: number): void {
    const p = Math.max(0.0, Math.min(1.0, progress));

    // Sunset Dome Opacity
    let sunsetTarget = 0.0;
    if (this.fromBiome === "sunset" && this.targetBiome === "sunset") sunsetTarget = 1.0;
    else if (this.fromBiome === "sunset") sunsetTarget = 1.0 - p;
    else if (this.targetBiome === "sunset") sunsetTarget = p;
    this.skyMatSunset.opacity = sunsetTarget;
    this.skySphereSunset.visible = sunsetTarget > 0.005;

    // Dino Dome Opacity
    let dinoTarget = 0.0;
    if (this.fromBiome === "dino" && this.targetBiome === "dino") dinoTarget = 1.0;
    else if (this.fromBiome === "dino") dinoTarget = 1.0 - p;
    else if (this.targetBiome === "dino") dinoTarget = p;
    this.skyMatDino.opacity = dinoTarget;
    this.skySphereDino.visible = dinoTarget > 0.005;

    // Sun altitude & opacity
    const fromHasSun = BIOMES[this.fromBiome].hasSun;
    const toHasSun = BIOMES[this.targetBiome].hasSun;
    if (fromHasSun && toHasSun) {
      this.currentSunOpacity = 1.0;
      this.currentSunY = 30;
    } else if (fromHasSun && !toHasSun) {
      this.currentSunOpacity = 1.0 - p;
      this.currentSunY = THREE.MathUtils.lerp(30, -40, p);
    } else if (!fromHasSun && toHasSun) {
      this.currentSunOpacity = p;
      this.currentSunY = THREE.MathUtils.lerp(-40, 30, p);
    } else {
      this.currentSunOpacity = 0.0;
      this.currentSunY = -40;
    }

    this.sunMat.opacity = this.currentSunOpacity;
    this.sunGlowMat.opacity = this.currentSunOpacity * 0.55;
    this.sunSpriteMat.opacity = this.currentSunOpacity * 0.8;
    this.sunMesh.visible = this.currentSunOpacity > 0.01;

    // Pterodactyls opacity
    const fromHasFlyers = this.fromBiome === "sunset" || this.fromBiome === "dino";
    const toHasFlyers = this.targetBiome === "sunset" || this.targetBiome === "dino";
    if (fromHasFlyers && toHasFlyers) {
      this.currentFlyerOpacity = 1.0;
    } else if (fromHasFlyers && !toHasFlyers) {
      this.currentFlyerOpacity = 1.0 - p;
    } else if (!fromHasFlyers && toHasFlyers) {
      this.currentFlyerOpacity = p;
    } else {
      this.currentFlyerOpacity = 0.0;
    }
    this.pterodactylMat.opacity = this.currentFlyerOpacity;
    this.flyersGroup.visible = this.currentFlyerOpacity > 0.01;
  }

  public completeTransition(toBiome: BiomeType): void {
    this.setBiome(toBiome);
  }

  public update(playerPos: THREE.Vector3, dt: number, simTime: number): void {
    // Keep domes aligned with player position
    if (this.skySphereSunset.visible) {
      this.skySphereSunset.position.x = playerPos.x;
      this.skySphereSunset.position.z = playerPos.z;
      this.skySphereSunset.rotation.y += 0.0003 * (dt * 60);
    }
    if (this.skySphereDino.visible) {
      this.skySphereDino.position.x = playerPos.x;
      this.skySphereDino.position.z = playerPos.z;
      this.skySphereDino.rotation.y += 0.0003 * (dt * 60);
    }

    // Sun motion
    if (this.sunMesh.visible) {
      const sunBob = Math.sin(simTime * 0.2) * 4;
      this.sunMesh.position.y = this.currentSunY + sunBob;
      this.sunMesh.position.x = playerPos.x * 0.2;
    }

    // Drift clouds
    for (const cloud of this.clouds.children) {
      cloud.position.x += (cloud.userData.speed || 0.05) * (dt * 60);
      if (cloud.position.x > 180) {
        cloud.position.x = -180;
      }
    }

    // Soar Pterodactyls
    if (this.flyersGroup.visible) {
      for (const flyer of this.flyers) {
        flyer.position.x += flyer.userData.speedX * (dt * 60);
        flyer.position.y += Math.sin(simTime * 1.5 + flyer.userData.phase) * 0.08;

        const wingMesh = flyer.userData.wings as THREE.Mesh;
        if (wingMesh) {
          wingMesh.rotation.z = Math.sin(simTime * flyer.userData.flapSpeed) * 0.25;
        }

        if (flyer.position.x > 160) {
          flyer.position.x = -160;
        }
      }
    }
  }

  public dispose(): void {
    this.skySphereSunset.geometry.dispose();
    this.skySphereDino.geometry.dispose();
    this.sunMesh.geometry.dispose();
    this.sunGlow.geometry.dispose();
    this.skyMatSunset.dispose();
    this.skyMatDino.dispose();
    this.sunMat.dispose();
    this.sunGlowMat.dispose();
    this.sunSpriteMat.dispose();
    this.pterodactylMat.dispose();
  }
}
