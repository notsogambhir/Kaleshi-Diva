import * as THREE from "three";
import { TextureGenerator } from "../TextureGenerator";
import { BiomeType, BIOMES } from "./Biomes";

export class Sky {
  public group: THREE.Group;
  private skySphere: THREE.Mesh;
  private sunMesh: THREE.Mesh;
  private sunGlow: THREE.Mesh;
  private sunGlowSprite: THREE.Sprite;
  private clouds: THREE.Group;
  private flyersGroup: THREE.Group;
  private flyers: THREE.Group[] = [];

  private skyMatSunset: THREE.MeshBasicMaterial;
  private skyMatDino: THREE.MeshBasicMaterial;
  private sunMat: THREE.MeshBasicMaterial;
  private sunGlowMat: THREE.MeshBasicMaterial;
  private pterodactylMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();

    // 1. Materials
    this.skyMatSunset = new THREE.MeshBasicMaterial({
      map: TextureGenerator.getTexture("sky_sunset"),
      side: THREE.BackSide,
      fog: false,
    });

    this.skyMatDino = new THREE.MeshBasicMaterial({
      map: TextureGenerator.getTexture("sky_dino"),
      side: THREE.BackSide,
      fog: false,
    });

    this.sunMat = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
      fog: false,
    });

    this.sunGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      fog: false,
    });

    this.pterodactylMat = new THREE.MeshBasicMaterial({
      color: 0x1c1917,
      side: THREE.DoubleSide,
      fog: false,
    });

    // 2. Sky Dome
    const skyGeo = new THREE.SphereGeometry(400, 32, 32);
    this.skySphere = new THREE.Mesh(skyGeo, this.skyMatSunset);
    this.skySphere.rotation.y = Math.PI / 2;
    this.skySphere.visible = false;
    this.group.add(this.skySphere);

    // 3. Sun with Additive Glow Mesh + Billboard Sprite
    const sunGeo = new THREE.SphereGeometry(50, 32, 32);
    this.sunMesh = new THREE.Mesh(sunGeo, this.sunMat);

    const glowGeo = new THREE.SphereGeometry(68, 32, 32);
    this.sunGlow = new THREE.Mesh(glowGeo, this.sunGlowMat);
    this.sunMesh.add(this.sunGlow);

    const spriteMat = new THREE.SpriteMaterial({
      map: TextureGenerator.getTexture("glow_radial"),
      blending: THREE.AdditiveBlending,
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8,
    });
    this.sunGlowSprite = new THREE.Sprite(spriteMat);
    this.sunGlowSprite.scale.set(160, 160, 160);
    this.sunMesh.add(this.sunGlowSprite);

    this.sunMesh.position.set(0, 30, -320);
    this.sunMesh.visible = false;
    this.group.add(this.sunMesh);

    // 4. Stylized drifting clouds
    this.clouds = new THREE.Group();
    this.initClouds();
    this.group.add(this.clouds);

    // 5. Soaring Pterodactyls (Fixes skipped feature #23)
    this.flyersGroup = new THREE.Group();
    this.initPterodactyls();
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
    // Build stylized low-poly Pterodactyl silhouette
    for (let i = 0; i < 4; i++) {
      const ptero = new THREE.Group();

      // Body & Beak
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.5, 4), this.pterodactylMat);
      body.rotation.x = Math.PI / 2;
      ptero.add(body);

      // Wings
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
    const config = BIOMES[biome];
    this.skySphere.visible = config.hasSkySphere;
    this.sunMesh.visible = config.hasSun;
    this.flyersGroup.visible = biome === "sunset" || biome === "dino";

    if (biome === "sunset") {
      this.skySphere.material = this.skyMatSunset;
    } else if (biome === "dino") {
      this.skySphere.material = this.skyMatDino;
    }
  }

  public update(playerPos: THREE.Vector3, dt: number, simTime: number): void {
    if (this.skySphere.visible) {
      this.skySphere.position.x = playerPos.x;
      this.skySphere.position.z = playerPos.z;
      this.skySphere.rotation.y += 0.0003 * (dt * 60);

      this.sunMesh.position.y = 30 + Math.sin(simTime * 0.2) * 4;
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

        // Wing flap animation
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
    this.skySphere.geometry.dispose();
    this.sunMesh.geometry.dispose();
    this.sunGlow.geometry.dispose();
    this.skyMatSunset.dispose();
    this.skyMatDino.dispose();
    this.sunMat.dispose();
    this.sunGlowMat.dispose();
    this.pterodactylMat.dispose();
  }
}
