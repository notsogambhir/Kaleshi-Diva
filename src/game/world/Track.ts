import * as THREE from "three";
import { registerCurvedMaterial } from "../core/CurvedWorld";
import { TextureGenerator } from "../TextureGenerator";
import { BiomeType, BIOMES } from "./Biomes";

export class Track {
  public group: THREE.Group;
  private groundMesh: THREE.Mesh;
  private roadMesh: THREE.Mesh;
  private leftBorder: THREE.Mesh;
  private rightBorder: THREE.Mesh;
  private wallLeft: THREE.Mesh;
  private wallRight: THREE.Mesh;

  private materials: Record<string, THREE.MeshStandardMaterial> = {};
  private currentBiome: BiomeType = "park";

  constructor(scene: THREE.Scene, maxAnisotropy = 4) {
    this.group = new THREE.Group();

    // 1. Initialize Materials with curved world shader injection & bump maps
    this.materials.grass = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("grass", maxAnisotropy),
        roughness: 0.9,
      })
    );
    this.materials.grass.map!.repeat.set(10, 20);

    this.materials.water = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("water", maxAnisotropy),
        roughness: 0.2,
        metalness: 0.1,
      })
    );
    this.materials.water.map!.repeat.set(10, 20);

    this.materials.jungle = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("jungle", maxAnisotropy),
        roughness: 0.95,
      })
    );
    this.materials.jungle.map!.repeat.set(10, 20);

    this.materials.dinoGround = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("dino_ground", maxAnisotropy),
        roughness: 0.9,
      })
    );
    this.materials.dinoGround.map!.repeat.set(10, 20);

    this.materials.roadAsphalt = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("road_asphalt", maxAnisotropy),
        bumpMap: TextureGenerator.getTexture("bump_road_asphalt", maxAnisotropy),
        bumpScale: 0.04,
        roughness: 0.8,
      })
    );
    this.materials.roadAsphalt.map!.repeat.set(1, 10);
    this.materials.roadAsphalt.bumpMap!.repeat.set(1, 10);

    this.materials.roadWood = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("road_wood", maxAnisotropy),
        bumpMap: TextureGenerator.getTexture("bump_road_wood", maxAnisotropy),
        bumpScale: 0.06,
        roughness: 0.85,
      })
    );
    this.materials.roadWood.map!.repeat.set(1, 10);
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
        bumpMap: TextureGenerator.getTexture("bump_road_stone", maxAnisotropy),
        bumpScale: 0.08,
        roughness: 0.8,
      })
    );
    this.materials.roadStone.map!.repeat.set(1, 10);
    this.materials.roadStone.bumpMap!.repeat.set(1, 10);

    this.materials.cobble = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        map: TextureGenerator.getTexture("cobblestone", maxAnisotropy),
        roughness: 0.8,
      })
    );
    this.materials.cobble.map!.repeat.set(1, 10);

    this.materials.border = registerCurvedMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        roughness: 0.7,
      })
    );

    // 2. Build Meshes
    // Ground
    const groundGeo = new THREE.PlaneGeometry(100, 200, 20, 50);
    this.groundMesh = new THREE.Mesh(groundGeo, this.materials.grass);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.z = -50;
    this.groundMesh.receiveShadow = true;
    this.group.add(this.groundMesh);

    // Road
    const roadGeo = new THREE.PlaneGeometry(12, 200, 2, 50);
    this.roadMesh = new THREE.Mesh(roadGeo, this.materials.roadAsphalt);
    this.roadMesh.rotation.x = -Math.PI / 2;
    this.roadMesh.position.z = -50;
    this.roadMesh.position.y = 0.05;
    this.roadMesh.receiveShadow = true;
    this.group.add(this.roadMesh);

    // Segmented Track Borders (50 z-segments allow clean curve matching)
    const borderGeo = new THREE.BoxGeometry(0.5, 0.4, 200, 1, 1, 50);
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

    // Cobblestone Walls for Lake
    const wallGeo = new THREE.BoxGeometry(1, 1.5, 200, 1, 1, 50);
    this.wallLeft = new THREE.Mesh(wallGeo, this.materials.cobble);
    this.wallLeft.position.set(-7, 0.75, -50);
    this.wallLeft.visible = false;
    this.group.add(this.wallLeft);

    this.wallRight = new THREE.Mesh(wallGeo, this.materials.cobble);
    this.wallRight.position.set(7, 0.75, -50);
    this.wallRight.visible = false;
    this.group.add(this.wallRight);

    scene.add(this.group);
  }

  public setBiome(biome: BiomeType): void {
    this.currentBiome = biome;
    const config = BIOMES[biome];

    // Ground Material
    if (biome === "park") this.groundMesh.material = this.materials.grass;
    else if (biome === "lake") this.groundMesh.material = this.materials.water;
    else if (biome === "sunset") this.groundMesh.material = this.materials.jungle;
    else if (biome === "dino") this.groundMesh.material = this.materials.dinoGround;

    // Road Material
    if (biome === "park") this.roadMesh.material = this.materials.roadAsphalt;
    else if (biome === "lake") this.roadMesh.material = this.materials.roadWood;
    else if (biome === "sunset") this.roadMesh.material = this.materials.roadDirt;
    else if (biome === "dino") this.roadMesh.material = this.materials.roadStone;

    // Wall Visibility
    this.wallLeft.visible = config.hasWalls;
    this.wallRight.visible = config.hasWalls;
  }

  public update(speed: number, dt: number, simTime: number): void {
    const scrollAmount = speed * (dt * 60) * 0.05;

    // Scroll active road texture
    const currentRoadMat = this.roadMesh.material as THREE.MeshStandardMaterial;
    if (currentRoadMat.map) {
      currentRoadMat.map.offset.y += scrollAmount;
      if (currentRoadMat.bumpMap) {
        currentRoadMat.bumpMap.offset.y += scrollAmount;
      }
    }

    // Scroll ground texture
    const currentGroundMat = this.groundMesh.material as THREE.MeshStandardMaterial;
    if (currentGroundMat.map) {
      currentGroundMat.map.offset.y += scrollAmount * 2;
    }

    // Gentle wave drift on water
    if (this.currentBiome === "lake" && this.materials.water.map) {
      this.materials.water.map.offset.x = Math.sin(simTime * 1.5) * 0.02;
    }
  }

  public dispose(): void {
    this.groundMesh.geometry.dispose();
    this.roadMesh.geometry.dispose();
    this.leftBorder.geometry.dispose();
    this.rightBorder.geometry.dispose();
    this.wallLeft.geometry.dispose();
    this.wallRight.geometry.dispose();

    for (const mat of Object.values(this.materials)) {
      mat.dispose();
    }
  }
}
