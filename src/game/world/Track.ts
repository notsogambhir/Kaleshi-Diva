import * as THREE from "three";
import { registerCurvedMaterial } from "../core/CurvedWorld";
import { TextureGenerator } from "../TextureGenerator";
import { BiomeType, BIOMES } from "./Biomes";
import { SpikeManager } from "../dev/SpikeManager";

export class Track {
  public group: THREE.Group;

  // Primary Meshes (Current Biome)
  private groundMesh: THREE.Mesh;
  private roadMesh: THREE.Mesh;

  // Overlay Meshes for Seamless Opacity Cross-Fading (Incoming Biome)
  private transitionGroundMesh: THREE.Mesh;
  private transitionRoadMesh: THREE.Mesh;

  // Borders & Side Walls
  private leftBorder: THREE.Mesh;
  private rightBorder: THREE.Mesh;
  private wallLeft: THREE.Mesh;
  private wallRight: THREE.Mesh;

  // Materials
  private materials: Record<string, THREE.MeshStandardMaterial> = {};
  private transitionMaterials: Record<string, THREE.MeshStandardMaterial> = {};

  // State
  private currentBiome: BiomeType = "park";
  private targetBiome: BiomeType = "park";
  private isTransitioning = false;

  // Wall Elevation Physics (Lake canal entry/exit)
  private currentWallY = -2.0;
  private targetWallY = -2.0;

  constructor(scene: THREE.Scene, maxAnisotropy = 4) {
    this.group = new THREE.Group();

    // 1. Noise Texture
    const macroNoise = TextureGenerator.getTexture("macro_noise", maxAnisotropy);

    // 2. Initialize Standard Primary Materials
    this.materials.grass = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("grass", maxAnisotropy),
        roughness: 0.9,
      })
    );
    this.materials.grass.map!.repeat.set(10, 20);
    this.applyMacroVariation(this.materials.grass, macroNoise, 1, 2);

    this.materials.water = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        map: TextureGenerator.getTexture("water", maxAnisotropy),
        normalMap: TextureGenerator.getTexture("normal_water", maxAnisotropy),
        normalScale: new THREE.Vector2(0.6, 0.6),
        roughness: 0.38,
        metalness: 0.02,
      })
    );
    this.materials.water.map!.repeat.set(10, 20);
    this.materials.water.normalMap!.repeat.set(8, 16);

    this.materials.jungle = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("jungle", maxAnisotropy),
        roughness: 0.95,
      })
    );
    this.materials.jungle.map!.repeat.set(10, 20);
    this.applyMacroVariation(this.materials.jungle, macroNoise, 1, 2);

    this.materials.dinoGround = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("dino_ground", maxAnisotropy),
        roughness: 0.9,
      })
    );
    this.materials.dinoGround.map!.repeat.set(10, 20);
    this.applyMacroVariation(this.materials.dinoGround, macroNoise, 1, 2);

    this.materials.roadAsphalt = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("road_asphalt", maxAnisotropy),
        normalMap: TextureGenerator.getTexture("normal_road_asphalt", maxAnisotropy),
        normalScale: new THREE.Vector2(1.2, 1.2),
        bumpMap: TextureGenerator.getTexture("bump_road_asphalt", maxAnisotropy),
        bumpScale: 0.03,
        roughness: 0.75,
      })
    );
    this.materials.roadAsphalt.map!.repeat.set(1, 10);
    this.materials.roadAsphalt.normalMap!.repeat.set(1, 10);
    this.materials.roadAsphalt.bumpMap!.repeat.set(1, 10);

    this.materials.roadWood = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("road_wood", maxAnisotropy),
        normalMap: TextureGenerator.getTexture("normal_road_wood", maxAnisotropy),
        normalScale: new THREE.Vector2(1.4, 1.4),
        bumpMap: TextureGenerator.getTexture("bump_road_wood", maxAnisotropy),
        bumpScale: 0.05,
        roughness: 0.8,
      })
    );
    this.materials.roadWood.map!.repeat.set(1, 10);
    this.materials.roadWood.normalMap!.repeat.set(1, 10);
    this.materials.roadWood.bumpMap!.repeat.set(1, 10);

    this.materials.roadDirt = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("road_dirt", maxAnisotropy),
        roughness: 0.95,
      })
    );
    this.materials.roadDirt.map!.repeat.set(1, 10);

    this.materials.roadStone = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("road_stone", maxAnisotropy),
        normalMap: TextureGenerator.getTexture("normal_road_stone", maxAnisotropy),
        normalScale: new THREE.Vector2(1.6, 1.6),
        bumpMap: TextureGenerator.getTexture("bump_road_stone", maxAnisotropy),
        bumpScale: 0.06,
        roughness: 0.75,
      })
    );
    this.materials.roadStone.map!.repeat.set(1, 10);
    this.materials.roadStone.normalMap!.repeat.set(1, 10);
    this.materials.roadStone.bumpMap!.repeat.set(1, 10);

    this.materials.cobble = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("cobblestone", maxAnisotropy),
        normalMap: TextureGenerator.getTexture("normal_cobblestone", maxAnisotropy),
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughness: 0.75,
      })
    );
    this.materials.cobble.map!.repeat.set(1, 50);
    this.materials.cobble.normalMap!.repeat.set(1, 50);

    this.materials.border = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        roughness: 0.4,
        metalness: 0.2,
      })
    );

    // 3. Initialize Overlay Transition Materials (Transparent for smooth alpha cross-fades)
    this.transitionMaterials.grass = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("grass", maxAnisotropy),
        roughness: 0.9,
        transparent: true,
        depthWrite: false,
        opacity: 0.0,
      })
    );
    this.transitionMaterials.grass.map!.repeat.set(10, 20);
    this.applyMacroVariation(this.transitionMaterials.grass, macroNoise, 1, 2);

    this.transitionMaterials.water = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        map: TextureGenerator.getTexture("water", maxAnisotropy),
        normalMap: TextureGenerator.getTexture("normal_water", maxAnisotropy),
        normalScale: new THREE.Vector2(0.6, 0.6),
        roughness: 0.38,
        metalness: 0.02,
        transparent: true,
        depthWrite: false,
        opacity: 0.0,
      })
    );
    this.transitionMaterials.water.map!.repeat.set(10, 20);
    this.transitionMaterials.water.normalMap!.repeat.set(8, 16);

    this.transitionMaterials.jungle = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("jungle", maxAnisotropy),
        roughness: 0.95,
        transparent: true,
        depthWrite: false,
        opacity: 0.0,
      })
    );
    this.transitionMaterials.jungle.map!.repeat.set(10, 20);
    this.applyMacroVariation(this.transitionMaterials.jungle, macroNoise, 1, 2);

    this.transitionMaterials.dinoGround = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("dino_ground", maxAnisotropy),
        roughness: 0.9,
        transparent: true,
        depthWrite: false,
        opacity: 0.0,
      })
    );
    this.transitionMaterials.dinoGround.map!.repeat.set(10, 20);
    this.applyMacroVariation(this.transitionMaterials.dinoGround, macroNoise, 1, 2);

    this.transitionMaterials.roadAsphalt = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("road_asphalt", maxAnisotropy),
        normalMap: TextureGenerator.getTexture("normal_road_asphalt", maxAnisotropy),
        normalScale: new THREE.Vector2(1.2, 1.2),
        bumpMap: TextureGenerator.getTexture("bump_road_asphalt", maxAnisotropy),
        bumpScale: 0.03,
        roughness: 0.75,
        transparent: true,
        depthWrite: false,
        opacity: 0.0,
      })
    );
    this.transitionMaterials.roadAsphalt.map!.repeat.set(1, 10);
    this.transitionMaterials.roadAsphalt.normalMap!.repeat.set(1, 10);
    this.transitionMaterials.roadAsphalt.bumpMap!.repeat.set(1, 10);

    this.transitionMaterials.roadWood = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("road_wood", maxAnisotropy),
        normalMap: TextureGenerator.getTexture("normal_road_wood", maxAnisotropy),
        normalScale: new THREE.Vector2(1.4, 1.4),
        bumpMap: TextureGenerator.getTexture("bump_road_wood", maxAnisotropy),
        bumpScale: 0.05,
        roughness: 0.8,
        transparent: true,
        depthWrite: false,
        opacity: 0.0,
      })
    );
    this.transitionMaterials.roadWood.map!.repeat.set(1, 10);
    this.transitionMaterials.roadWood.normalMap!.repeat.set(1, 10);
    this.transitionMaterials.roadWood.bumpMap!.repeat.set(1, 10);

    this.transitionMaterials.roadDirt = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("road_dirt", maxAnisotropy),
        roughness: 0.95,
        transparent: true,
        depthWrite: false,
        opacity: 0.0,
      })
    );
    this.transitionMaterials.roadDirt.map!.repeat.set(1, 10);

    this.transitionMaterials.roadStone = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("road_stone", maxAnisotropy),
        normalMap: TextureGenerator.getTexture("normal_road_stone", maxAnisotropy),
        normalScale: new THREE.Vector2(1.6, 1.6),
        bumpMap: TextureGenerator.getTexture("bump_road_stone", maxAnisotropy),
        bumpScale: 0.06,
        roughness: 0.75,
        transparent: true,
        depthWrite: false,
        opacity: 0.0,
      })
    );
    this.transitionMaterials.roadStone.map!.repeat.set(1, 10);
    this.transitionMaterials.roadStone.normalMap!.repeat.set(1, 10);
    this.transitionMaterials.roadStone.bumpMap!.repeat.set(1, 10);

    // 4. Build Primary & Transition Meshes
    // Primary Ground (Y = 0.0)
    const groundGeo = new THREE.PlaneGeometry(100, 200, 20, 50);
    groundGeo.setAttribute("uv2", groundGeo.attributes.uv);
    this.groundMesh = new THREE.Mesh(groundGeo, this.materials.grass);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.z = -50;
    this.groundMesh.receiveShadow = true;
    this.group.add(this.groundMesh);

    // Overlay Transition Ground (Y = 0.002 to avoid Z-fighting)
    const transGroundGeo = groundGeo.clone();
    this.transitionGroundMesh = new THREE.Mesh(transGroundGeo, this.transitionMaterials.water);
    this.transitionGroundMesh.rotation.x = -Math.PI / 2;
    this.transitionGroundMesh.position.set(0, 0.002, -50);
    this.transitionGroundMesh.visible = false;
    this.group.add(this.transitionGroundMesh);

    // Primary Road (Y = 0.05)
    const roadGeo = new THREE.PlaneGeometry(12, 200, 2, 50);
    roadGeo.setAttribute("uv2", roadGeo.attributes.uv);
    this.roadMesh = new THREE.Mesh(roadGeo, this.materials.roadAsphalt);
    this.roadMesh.rotation.x = -Math.PI / 2;
    this.roadMesh.position.set(0, 0.05, -50);
    this.roadMesh.receiveShadow = true;
    this.group.add(this.roadMesh);

    // Overlay Transition Road (Y = 0.052)
    const transRoadGeo = roadGeo.clone();
    this.transitionRoadMesh = new THREE.Mesh(transRoadGeo, this.transitionMaterials.roadWood);
    this.transitionRoadMesh.rotation.x = -Math.PI / 2;
    this.transitionRoadMesh.position.set(0, 0.052, -50);
    this.transitionRoadMesh.visible = false;
    this.group.add(this.transitionRoadMesh);

    // Borders
    const borderGeo = new THREE.BoxGeometry(0.5, 0.4, 200, 1, 1, 50);
    borderGeo.setAttribute("uv2", borderGeo.attributes.uv);
    this.leftBorder = new THREE.Mesh(borderGeo, this.materials.border);
    this.leftBorder.position.set(-6.25, 0.2, -50);
    this.leftBorder.receiveShadow = true;
    this.leftBorder.castShadow = true;
    this.group.add(this.leftBorder);

    this.rightBorder = new THREE.Mesh(borderGeo, this.materials.border);
    this.rightBorder.position.set(6.25, 0.2, -50);
    this.rightBorder.receiveShadow = true;
    this.rightBorder.castShadow = true;
    this.group.add(this.rightBorder);

    // Cobblestone Side Walls for Lake
    const wallGeo = new THREE.BoxGeometry(1, 1.5, 200, 1, 1, 50);
    const wallPos = wallGeo.attributes.position;
    const wallNorm = wallGeo.attributes.normal;
    const wallUvs = wallGeo.attributes.uv;

    for (let i = 0; i < wallPos.count; i++) {
      const x = wallPos.getX(i);
      const y = wallPos.getY(i);
      const z = wallPos.getZ(i);
      const nx = Math.abs(wallNorm.getX(i));
      const ny = Math.abs(wallNorm.getY(i));
      const nz = Math.abs(wallNorm.getZ(i));

      let u = 0;
      let v = (100 - z) / 200;

      if (nx > 0.5) {
        u = (y + 0.75) / 1.5;
        v = (100 - z) / 200;
      } else if (ny > 0.5) {
        u = (x + 0.5) / 1.0;
        v = (100 - z) / 200;
      } else if (nz > 0.5) {
        u = (x + 0.5) / 1.0;
        v = (y + 0.75) / 1.5;
      }

      wallUvs.setXY(i, u, v);
    }
    wallUvs.needsUpdate = true;
    wallGeo.setAttribute("uv2", wallUvs.clone());

    this.wallLeft = new THREE.Mesh(wallGeo, this.materials.cobble);
    this.wallLeft.position.set(-7, this.currentWallY, -50);
    this.wallLeft.visible = false;
    this.group.add(this.wallLeft);

    this.wallRight = new THREE.Mesh(wallGeo, this.materials.cobble);
    this.wallRight.position.set(7, this.currentWallY, -50);
    this.wallRight.visible = false;
    this.group.add(this.wallRight);

    scene.add(this.group);

    // Phase 0b Art-direction Spike Hook
    if (SpikeManager.isToonSpikeEnabled()) {
      SpikeManager.applyTrackToonSpike(this.roadMesh, this.groundMesh, maxAnisotropy);
    }
  }

  private getGroundMaterial(biome: BiomeType): THREE.MeshStandardMaterial {
    switch (biome) {
      case "park": return this.materials.grass;
      case "lake": return this.materials.water;
      case "sunset": return this.materials.jungle;
      case "dino": return this.materials.dinoGround;
    }
  }

  private getTransitionGroundMaterial(biome: BiomeType): THREE.MeshStandardMaterial {
    switch (biome) {
      case "park": return this.transitionMaterials.grass;
      case "lake": return this.transitionMaterials.water;
      case "sunset": return this.transitionMaterials.jungle;
      case "dino": return this.transitionMaterials.dinoGround;
    }
  }

  private getRoadMaterial(biome: BiomeType): THREE.MeshStandardMaterial {
    switch (biome) {
      case "park": return this.materials.roadAsphalt;
      case "lake": return this.materials.roadWood;
      case "sunset": return this.materials.roadDirt;
      case "dino": return this.materials.roadStone;
    }
  }

  private getTransitionRoadMaterial(biome: BiomeType): THREE.MeshStandardMaterial {
    switch (biome) {
      case "park": return this.transitionMaterials.roadAsphalt;
      case "lake": return this.transitionMaterials.roadWood;
      case "sunset": return this.transitionMaterials.roadDirt;
      case "dino": return this.transitionMaterials.roadStone;
    }
  }

  public setBiome(biome: BiomeType): void {
    this.currentBiome = biome;
    this.targetBiome = biome;
    this.isTransitioning = false;
    const config = BIOMES[biome];

    // Primary Materials
    this.groundMesh.material = this.getGroundMaterial(biome);
    this.roadMesh.material = this.getRoadMaterial(biome);

    // Hide transition overlays
    this.transitionGroundMesh.visible = false;
    this.transitionRoadMesh.visible = false;

    // Wall Elevation & Visibility
    this.targetWallY = config.hasWalls ? 0.75 : -2.0;
    this.currentWallY = this.targetWallY;
    this.wallLeft.position.y = this.currentWallY;
    this.wallRight.position.y = this.currentWallY;
    this.wallLeft.visible = config.hasWalls;
    this.wallRight.visible = config.hasWalls;
  }

  public startTransition(fromBiome: BiomeType, toBiome: BiomeType): void {
    if (fromBiome === toBiome) {
      this.setBiome(toBiome);
      return;
    }

    this.currentBiome = fromBiome;
    this.targetBiome = toBiome;
    this.isTransitioning = true;

    // Set primary meshes to fromBiome
    this.groundMesh.material = this.getGroundMaterial(fromBiome);
    this.roadMesh.material = this.getRoadMaterial(fromBiome);

    // Prepare overlay meshes with toBiome transition materials
    const nextGround = this.getTransitionGroundMaterial(toBiome);
    nextGround.opacity = 0.0;
    // Align texture offsets with primary meshes
    if (nextGround.map && this.groundMesh.material instanceof THREE.MeshStandardMaterial && this.groundMesh.material.map) {
      nextGround.map.offset.copy(this.groundMesh.material.map.offset);
    }
    this.transitionGroundMesh.material = nextGround;
    this.transitionGroundMesh.visible = true;

    const nextRoad = this.getTransitionRoadMaterial(toBiome);
    nextRoad.opacity = 0.0;
    if (nextRoad.map && this.roadMesh.material instanceof THREE.MeshStandardMaterial && this.roadMesh.material.map) {
      nextRoad.map.offset.copy(this.roadMesh.material.map.offset);
      if (nextRoad.normalMap && this.roadMesh.material.normalMap) {
        nextRoad.normalMap.offset.copy(this.roadMesh.material.normalMap.offset);
      }
      if (nextRoad.bumpMap && this.roadMesh.material.bumpMap) {
        nextRoad.bumpMap.offset.copy(this.roadMesh.material.bumpMap.offset);
      }
    }
    this.transitionRoadMesh.material = nextRoad;
    this.transitionRoadMesh.visible = true;

    // Smooth wall target elevation
    this.targetWallY = BIOMES[toBiome].hasWalls ? 0.75 : -2.0;
    this.wallLeft.visible = true;
    this.wallRight.visible = true;
  }

  public updateTransition(progress: number): void {
    const p = Math.max(0.0, Math.min(1.0, progress));
    if (this.isTransitioning) {
      const gMat = this.transitionGroundMesh.material as THREE.MeshStandardMaterial;
      if (gMat) gMat.opacity = p;

      const rMat = this.transitionRoadMesh.material as THREE.MeshStandardMaterial;
      if (rMat) rMat.opacity = p;
    }
  }

  public completeTransition(toBiome: BiomeType): void {
    this.setBiome(toBiome);
  }

  public update(speed: number, dt: number, simTime: number): void {
    const scrollAmount = speed * (dt * 60) * 0.05;

    // 1. Scroll Primary Road
    const currentRoadMat = this.roadMesh.material as THREE.MeshStandardMaterial;
    if (currentRoadMat && currentRoadMat.map) {
      currentRoadMat.map.offset.y += scrollAmount;
      if (currentRoadMat.normalMap) currentRoadMat.normalMap.offset.y += scrollAmount;
      if (currentRoadMat.bumpMap) currentRoadMat.bumpMap.offset.y += scrollAmount;
    }

    // 2. Scroll Primary Ground
    const currentGroundMat = this.groundMesh.material as THREE.MeshStandardMaterial;
    if (currentGroundMat && currentGroundMat.map) {
      currentGroundMat.map.offset.y += scrollAmount * 2;
    }

    // 3. Scroll Overlay Transition Meshes (if active)
    if (this.isTransitioning) {
      const transRoadMat = this.transitionRoadMesh.material as THREE.MeshStandardMaterial;
      if (transRoadMat && transRoadMat.map) {
        transRoadMat.map.offset.y += scrollAmount;
        if (transRoadMat.normalMap) transRoadMat.normalMap.offset.y += scrollAmount;
        if (transRoadMat.bumpMap) transRoadMat.bumpMap.offset.y += scrollAmount;
      }

      const transGroundMat = this.transitionGroundMesh.material as THREE.MeshStandardMaterial;
      if (transGroundMat && transGroundMat.map) {
        transGroundMat.map.offset.y += scrollAmount * 2;
      }
    }

    // 4. Smooth Lake Canal Wall Elevation Animation
    this.currentWallY = THREE.MathUtils.lerp(this.currentWallY, this.targetWallY, dt * 3.0);
    this.wallLeft.position.y = this.currentWallY;
    this.wallRight.position.y = this.currentWallY;
    const isWallActive = this.currentWallY > -1.85;
    this.wallLeft.visible = isWallActive;
    this.wallRight.visible = isWallActive;

    // Scroll cobblestone side walls
    if (isWallActive && this.materials.cobble && this.materials.cobble.map) {
      const cobbleScrollAmount = scrollAmount * 5;
      this.materials.cobble.map.offset.y += cobbleScrollAmount;
      if (this.materials.cobble.normalMap) {
        this.materials.cobble.normalMap.offset.y += cobbleScrollAmount;
      }
    }

    // 5. Gentle wave drift & normal distortion on water
    if (this.currentBiome === "lake" || this.targetBiome === "lake") {
      if (this.materials.water.map) {
        this.materials.water.map.offset.x = Math.sin(simTime * 1.5) * 0.02;
        this.materials.water.map.offset.y += scrollAmount * 0.4;
      }
      if (this.materials.water.normalMap) {
        this.materials.water.normalMap.offset.x = Math.cos(simTime * 1.8) * 0.03;
        this.materials.water.normalMap.offset.y += (scrollAmount * 0.5 + 0.001);
      }
      if (this.transitionMaterials.water.map) {
        this.transitionMaterials.water.map.offset.x = Math.sin(simTime * 1.5) * 0.02;
        this.transitionMaterials.water.map.offset.y += scrollAmount * 0.4;
      }
      if (this.transitionMaterials.water.normalMap) {
        this.transitionMaterials.water.normalMap.offset.x = Math.cos(simTime * 1.8) * 0.03;
        this.transitionMaterials.water.normalMap.offset.y += (scrollAmount * 0.5 + 0.001);
      }
    }
  }

  public dispose(): void {
    this.groundMesh.geometry.dispose();
    this.roadMesh.geometry.dispose();
    this.transitionGroundMesh.geometry.dispose();
    this.transitionRoadMesh.geometry.dispose();
    this.leftBorder.geometry.dispose();
    this.rightBorder.geometry.dispose();
    this.wallLeft.geometry.dispose();
    this.wallRight.geometry.dispose();

    for (const mat of Object.values(this.materials)) {
      mat.dispose();
    }
    for (const mat of Object.values(this.transitionMaterials)) {
      mat.dispose();
    }
  }

  private applyMacroVariation(
    material: THREE.MeshStandardMaterial,
    macroTex: THREE.Texture,
    repeatX = 1,
    repeatY = 2
  ): void {
    const prevCompile = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      if (typeof prevCompile === "function") {
        try {
          prevCompile.call(material, shader, renderer);
        } catch {}
      }
      shader.uniforms.macroNoiseMap = { value: macroTex };
      shader.uniforms.macroNoiseRepeat = { value: new THREE.Vector2(repeatX, repeatY) };
      shader.fragmentShader = `
        uniform sampler2D macroNoiseMap;
        uniform vec2 macroNoiseRepeat;
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `
        #include <map_fragment>
        #ifdef USE_MAP
          vec2 macroUv = vMapUv / vec2(10.0, 20.0) * macroNoiseRepeat;
          vec4 macroVal = texture2D( macroNoiseMap, macroUv );
          diffuseColor.rgb *= (0.84 + 0.32 * macroVal.r);
        #endif
        `
      );
    };
    material.customProgramCacheKey = () => "curved_macro_v1";
  }
}
