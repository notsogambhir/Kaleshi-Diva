import * as THREE from "three";
import { createTexture } from "./TextureGenerator";
import { AudioManager } from "./AudioManager";

const CURVE_STRENGTH = 0.0015;

function applyCurvedWorld(material: THREE.Material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
            #include <begin_vertex>
            float worldZ = (modelMatrix * vec4(position, 1.0)).z;
            float curve = ${CURVE_STRENGTH} * pow(worldZ + 10.0, 2.0);
            transformed.y -= curve;
            `,
    );
  };
}

export type PowerupType = "shield" | "magnet" | "speed";
export type BiomeType = "garden" | "lake" | "jungle";

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  public audio: AudioManager;

    // Callbacks
    public onScoreUpdate: (score: number) => void = () => {};
    public onGameOver: (score: number, isHighScore: boolean) => void = () => {};
    public onPowerupUpdate: (powerups: {shield: boolean, magnet: boolean, speed: boolean}) => void = () => {};

    // State
    public isPlaying = false;
    private isGameOver = false;
    private isCaughtAnimation = false;
    private demoMode: boolean = true;
    
    private gameSpeed = 0.4;
    private score = 0;
    private highScore = 0;
    private gameTime = 0;
    
    private currentLane = 1;
    private laneWidth = 4;
    private targetX = 0;
    private playerVelocityX = 0;
    private playerImpactY = 0;
    private playerImpactZ = 0;
    private playerImpactRotX = 0;
    private jumpVelocity = 0;
  private GRAVITY = -0.015;
  private JUMP_FORCE = 0.35;
  private isJumping = false;
  private isDucking = false;
  private duckTimer = 0;

  private currentBiome: BiomeType = "garden";
  private cameraShake = 0;

  // Powerups
  private hasShield = false;
  private isMagnet = false;
  private isSpeeding = false;
  private magnetTimer = 0;
  private speedTimer = 0;

  // ThreeJS objects
  private player!: THREE.Group;
  private shieldMesh!: THREE.Group;
  private boyfriend!: THREE.Group;
  private ground!: THREE.Mesh;
  private road!: THREE.Mesh;
  private wallLeft!: THREE.Mesh;
  private wallRight!: THREE.Mesh;
  private skySphere!: THREE.Mesh;
  private jungleSun!: THREE.Mesh;

  private obstacles: {
    mesh: THREE.Group;
    lane: number;
    type: string;
    active: boolean;
  }[] = [];
  private sunflowers: { mesh: THREE.Group; lane: number; active: boolean }[] =
    [];
  private scenery: THREE.Group[] = [];
  private particles: THREE.Mesh[] = [];
  private speedLines: THREE.Mesh[] = [];
  private powerups: {
    mesh: THREE.Group;
    lane: number;
    type: PowerupType;
    active: boolean;
  }[] = [];

  private textures: Record<string, THREE.Texture> = {};
  private mats: Record<
    string,
    THREE.MeshStandardMaterial | THREE.MeshBasicMaterial
  > = {};
  private geos: Record<string, THREE.BufferGeometry> = {};

  private getGeo(key: string, creator: () => THREE.BufferGeometry): THREE.BufferGeometry {
    if (!this.geos[key]) {
      this.geos[key] = creator();
    }
    return this.geos[key];
  }

  private getMat(key: string, creator: () => THREE.Material): THREE.Material {
    if (!(this.mats as any)[key]) {
      (this.mats as any)[key] = creator();
    }
    return (this.mats as any)[key];
  }

  private frameCount = 0;
  private animationFrameId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.audio = new AudioManager();
    this.highScore = parseInt(
      localStorage.getItem("sunflowerRunHighScore") || "0",
    );

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 30, 95);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 5, 12);
    this.camera.lookAt(0, 1, 0);

    this.initLighting();
    this.initMaterials();
    this.initEnvironment();
    this.createPlayer();
    this.createBoyfriend();
    this.createSpeedLines();

    for (let i = 0; i < 20; i++) this.spawnDecoration(-i * 10);

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.setupInputs();

    this.animate = this.animate.bind(this);
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  private initLighting() {
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const ambientLight = new THREE.AmbientLight(0xfff0e6, 0.65); // Slightly warmer ambient
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffae6, 0.85); // Warmer directional
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;

    // Improve shadow resolution and area
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.bias = -0.0005;

    this.scene.add(dirLight);
  }

  private initMaterials() {
    // Textures
    [
      "grass",
      "water",
      "jungle",
      "sky_sunset",
      "road_asphalt",
      "road_wood",
      "road_dirt",
      "cobblestone",
      "rose",
      "dress",
      "wood",
      "leaf",
    ].forEach((type) => {
      this.textures[type] = createTexture(type);
    });

    this.textures.grass.repeat.set(10, 20);
    this.textures.water.repeat.set(10, 20);
    this.textures.jungle.repeat.set(10, 20);
    this.textures.road_asphalt.repeat.set(1, 10);
    this.textures.road_wood.repeat.set(1, 10);
    this.textures.road_dirt.repeat.set(1, 10);
    this.textures.cobblestone.repeat.set(1, 10);

    // Materials
    this.mats.grass = new THREE.MeshStandardMaterial({
      map: this.textures.grass,
    });
    this.mats.wood = new THREE.MeshStandardMaterial({
      map: this.textures.wood,
    });
    this.mats.red = new THREE.MeshStandardMaterial({ color: 0xd32f2f });
    this.mats.blue = new THREE.MeshStandardMaterial({ color: 0x2196f3 });
    this.mats.leaf = new THREE.MeshStandardMaterial({
      map: this.textures.leaf,
    });
    this.mats.water = new THREE.MeshStandardMaterial({
      map: this.textures.water,
    });
    this.mats.jungle = new THREE.MeshStandardMaterial({
      map: this.textures.jungle,
    });
    this.mats.roadAsphalt = new THREE.MeshStandardMaterial({
      map: this.textures.road_asphalt,
      roughness: 0.8,
    });
    this.mats.roadWood = new THREE.MeshStandardMaterial({
      map: this.textures.road_wood,
      roughness: 0.9,
    });
    this.mats.roadDirt = new THREE.MeshStandardMaterial({
      map: this.textures.road_dirt,
      roughness: 1.0,
    });
    this.mats.rose = new THREE.MeshStandardMaterial({
      map: this.textures.rose,
    });
    this.mats.cobble = new THREE.MeshStandardMaterial({
      map: this.textures.cobblestone,
    });
    this.mats.flowerHead = new THREE.MeshStandardMaterial({ color: 0x4e342e });
    this.mats.petal = new THREE.MeshStandardMaterial({
      color: 0xffeb3b,
      emissive: 0xffaa00,
      emissiveIntensity: 0.2,
    });
    this.mats.skin = new THREE.MeshStandardMaterial({ color: 0xffcc80 });
    this.mats.dress = new THREE.MeshStandardMaterial({
      map: this.textures.dress,
    });
    this.mats.hair = new THREE.MeshStandardMaterial({ color: 0x4e342e });
    this.mats.white = new THREE.MeshStandardMaterial({ color: 0xffffff });
    this.mats.gold = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    this.mats.black = new THREE.MeshStandardMaterial({ color: 0x111111 });
    this.mats.lipstick = new THREE.MeshStandardMaterial({ color: 0xd32f2f });
    this.mats.rock = new THREE.MeshStandardMaterial({ color: 0x757575 });
    this.mats.rockBrown = new THREE.MeshStandardMaterial({ color: 0x795548 });
    this.mats.sky = new THREE.MeshBasicMaterial({
      map: this.textures.sky_sunset,
      side: THREE.BackSide,
      fog: false,
    });

    Object.values(this.mats).forEach((m) => applyCurvedWorld(m));
  }

  private initEnvironment() {
    const planeGeo = this.getGeo('PlaneGeometry_100__200__20__50', () => new THREE.PlaneGeometry(100, 200, 20, 50));
    this.ground = new THREE.Mesh(planeGeo, this.mats.grass);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.z = -50;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    const roadGeo = this.getGeo('PlaneGeometry_12__200__2__50', () => new THREE.PlaneGeometry(12, 200, 2, 50));
    this.road = new THREE.Mesh(roadGeo, this.mats.roadAsphalt);
    this.road.rotation.x = -Math.PI / 2;
    this.road.position.z = -50;
    this.road.position.y = 0.05;
    this.road.receiveShadow = true;
    this.scene.add(this.road);

    // Track Borders for 3D depth
    const borderGeo = this.getGeo('BoxGeometry_0.5__0.4__200', () => new THREE.BoxGeometry(0.5, 0.4, 200));
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 });
    
    const leftBorder = new THREE.Mesh(borderGeo, borderMat);
    leftBorder.position.set(-6.25, 0.2, -50);
    leftBorder.receiveShadow = true;
    leftBorder.castShadow = true;
    this.scene.add(leftBorder);

    const rightBorder = new THREE.Mesh(borderGeo, borderMat);
    rightBorder.position.set(6.25, 0.2, -50);
    rightBorder.receiveShadow = true;
    rightBorder.castShadow = true;
    this.scene.add(rightBorder);

    const wallGeo = this.getGeo('BoxGeometry_1__1.5__200__1__1__50', () => new THREE.BoxGeometry(1, 1.5, 200, 1, 1, 50));
    this.wallLeft = new THREE.Mesh(wallGeo, this.mats.cobble);
    this.wallLeft.position.set(-7, 0.75, -50);
    this.wallLeft.visible = false;
    this.scene.add(this.wallLeft);

    this.wallRight = new THREE.Mesh(wallGeo, this.mats.cobble);
    this.wallRight.position.set(7, 0.75, -50);
    this.wallRight.visible = false;
    this.scene.add(this.wallRight);

    const skyGeo = this.getGeo('SphereGeometry_400__32__32', () => new THREE.SphereGeometry(400, 32, 32));
    this.skySphere = new THREE.Mesh(skyGeo, this.mats.sky);
    this.skySphere.rotation.y = Math.PI / 2;
    this.skySphere.visible = false;
    this.scene.add(this.skySphere);

    const sunGeo = this.getGeo('SphereGeometry_60__32__32', () => new THREE.SphereGeometry(60, 32, 32));
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
    this.jungleSun = new THREE.Mesh(sunGeo, sunMat);
    
    const glowGeo = this.getGeo('SphereGeometry_75__32__32', () => new THREE.SphereGeometry(75, 32, 32));
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: 0xff6600, 
      transparent: true, 
      opacity: 0.5, 
      blending: THREE.AdditiveBlending 
    });
    const sunGlow = new THREE.Mesh(glowGeo, glowMat);
    this.jungleSun.add(sunGlow);

    this.jungleSun.position.set(0, 30, -300);
    this.jungleSun.visible = false;
    this.scene.add(this.jungleSun);
  }

  // Build procedural cute character
  private createPlayer() {
    this.player = new THREE.Group();
    this.player.rotation.y = Math.PI;

    const leftLegGrp = new THREE.Group();
    leftLegGrp.position.set(-0.2, 0.8, 0);
    this.player.add(leftLegGrp);
    const rightLegGrp = new THREE.Group();
    rightLegGrp.position.set(0.2, 0.8, 0);
    this.player.add(rightLegGrp);

    const legGeo = this.getGeo('CylinderGeometry_0.08__0.08__0.7', () => new THREE.CylinderGeometry(0.08, 0.08, 0.7));
    const legL = new THREE.Mesh(legGeo, this.mats.skin);
    legL.position.y = -0.35;
    legL.castShadow = true;
    leftLegGrp.add(legL);
    const legR = new THREE.Mesh(legGeo, this.mats.skin);
    legR.position.y = -0.35;
    legR.castShadow = true;
    rightLegGrp.add(legR);

    const bodyGroup = new THREE.Group();
    this.player.add(bodyGroup);
    (this.player as any).leftLeg = leftLegGrp;
    (this.player as any).rightLeg = rightLegGrp;
    (this.player as any).bodyGroup = bodyGroup;

    // Skirt & Torso
    const skirtGeo = this.getGeo('ConeGeometry_0.5__0.8__32__1__true', () => new THREE.ConeGeometry(0.5, 0.8, 32, 1, true));
    const skirt = new THREE.Mesh(skirtGeo, this.mats.dress);
    skirt.position.y = 0.9;
    skirt.castShadow = true;
    bodyGroup.add(skirt);

    const torsoGeo = this.getGeo('CylinderGeometry_0.25__0.35__0.6', () => new THREE.CylinderGeometry(0.25, 0.35, 0.6));
    const torso = new THREE.Mesh(torsoGeo, this.mats.dress);
    torso.position.y = 1.5;
    torso.castShadow = true;
    bodyGroup.add(torso);

    // Arms
    const leftArmGrp = new THREE.Group();
    leftArmGrp.position.set(-0.35, 1.7, 0);
    bodyGroup.add(leftArmGrp);
    const rightArmGrp = new THREE.Group();
    rightArmGrp.position.set(0.35, 1.7, 0);
    bodyGroup.add(rightArmGrp);
    const armGeo = this.getGeo('CylinderGeometry_0.07__0.07__0.6', () => new THREE.CylinderGeometry(0.07, 0.07, 0.6));
    const armL = new THREE.Mesh(armGeo, this.mats.skin);
    armL.position.y = -0.3;
    armL.castShadow = true;
    leftArmGrp.add(armL);
    const armR = new THREE.Mesh(armGeo, this.mats.skin);
    armR.position.y = -0.3;
    armR.castShadow = true;
    rightArmGrp.add(armR);
    (this.player as any).leftArm = leftArmGrp;
    (this.player as any).rightArm = rightArmGrp;

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.9;
    bodyGroup.add(headGroup);
    const headGeo = this.getGeo('SphereGeometry_0.32__32__32', () => new THREE.SphereGeometry(0.32, 32, 32));
    const head = new THREE.Mesh(headGeo, this.mats.skin);
    head.castShadow = true;
    headGroup.add(head);

    // Face
    const eyeGeo = this.getGeo('SphereGeometry_0.04', () => new THREE.SphereGeometry(0.04));
    const leftEye = new THREE.Mesh(eyeGeo, this.mats.black);
    leftEye.position.set(-0.1, 0.05, 0.28);
    head.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, this.mats.black);
    rightEye.position.set(0.1, 0.05, 0.28);
    head.add(rightEye);
    const smileGeo = this.getGeo('TorusGeometry_0.08__0.02__2__8__Math.PI', () => new THREE.TorusGeometry(0.08, 0.02, 2, 8, Math.PI));
    const smile = new THREE.Mesh(smileGeo, this.mats.black);
    smile.position.set(0, -0.1, 0.28);
    smile.rotation.z = Math.PI;
    head.add(smile);

    // Hair
    const capGeo = this.getGeo('SphereGeometry_0.31__32__32', () => new THREE.SphereGeometry(0.31, 32, 32));
    const cap = new THREE.Mesh(capGeo, this.mats.hair);
    cap.position.set(0, 0.05, -0.05);
    head.add(cap);
    const curlGeo = this.getGeo('SphereGeometry_0.12__7__7', () => new THREE.SphereGeometry(0.12, 7, 7));
    for (let i = 0; i < 150; i++) {
      const curl = new THREE.Mesh(curlGeo, this.mats.hair);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.36;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      if (z > 0.15 && y > -0.15 && y < 0.3) continue;
      curl.position.set(x, y, z);
      curl.scale.setScalar(0.8 + Math.random() * 0.4);
      head.add(curl);
    }
    for (let i = 0; i < 90; i++) {
      const curl = new THREE.Mesh(curlGeo, this.mats.hair);
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.38 + Math.random() * 0.05;
      const lx = Math.cos(angle) * radius;
      const lz = Math.sin(angle) * radius;
      if (lz > 0.15) continue;
      const ly = -0.1 - Math.random() * 0.55;
      curl.position.set(lx, ly, lz);
      head.add(curl);
    }

    const accGeo = this.getGeo('CircleGeometry_0.15__8', () => new THREE.CircleGeometry(0.15, 8));
    const acc = new THREE.Mesh(
      accGeo,
      new THREE.MeshBasicMaterial({ color: 0xffeb3b, side: THREE.DoubleSide }),
    );
    acc.position.set(0.32, 0.1, 0.2);
    acc.rotation.y = Math.PI / 2;
    head.add(acc);

    // Shield Visual
    this.shieldMesh = new THREE.Group();
    const jTop = new THREE.Mesh(
      this.getGeo('SphereGeometry_0.08__8__8', () => new THREE.SphereGeometry(0.08, 8, 8)),
      this.mats.gold,
    );
    jTop.position.y = 0.3;
    this.shieldMesh.add(jTop);
    const jDome = new THREE.Mesh(
      this.getGeo('SphereGeometry_0.15__16__8__0__Math.PI___2__0__Math.PI___0.6', () => new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.6)),
      this.mats.gold,
    );
    jDome.material.side = THREE.DoubleSide;
    this.shieldMesh.add(jDome);
    for (let i = 0; i < 8; i++) {
      const bead = new THREE.Mesh(
        this.getGeo('SphereGeometry_0.03__4__4', () => new THREE.SphereGeometry(0.03, 4, 4)),
        this.mats.gold,
      );
      const angle = (i / 8) * Math.PI * 2;
      bead.position.set(Math.cos(angle) * 0.14, -0.05, Math.sin(angle) * 0.14);
      this.shieldMesh.add(bead);
    }
    this.shieldMesh.position.set(0.6, 1.5, 0);
    this.shieldMesh.visible = false;
    this.player.add(this.shieldMesh);

    this.scene.add(this.player);
  }

  // Creates boyfriend character for catching animation
  private createBoyfriend() {
    this.boyfriend = new THREE.Group();
    
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1565C0 });
    const bodyGeo = this.getGeo('BoxGeometry_0.7__1.2__0.4', () => new THREE.BoxGeometry(0.7, 1.2, 0.4));
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.3;
    body.castShadow = true;
    this.boyfriend.add(body);

    const headGroup = new THREE.Group();
    headGroup.position.y = 2.1;
    this.boyfriend.add(headGroup);

    const headGeo = this.getGeo('SphereGeometry_0.35__32__32', () => new THREE.SphereGeometry(0.35, 32, 32));
    const head = new THREE.Mesh(headGeo, this.mats.skin);
    head.castShadow = true;
    headGroup.add(head);

    const hairGeo = this.getGeo('SphereGeometry_0.36__16__16__0__Math.PI___2__0__Math.PI___2', () => new THREE.SphereGeometry(0.36, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2));
    const hair = new THREE.Mesh(hairGeo, this.mats.hair);
    hair.position.y = 0.05;
    headGroup.add(hair);

    const eyeGeo = this.getGeo('SphereGeometry_0.04', () => new THREE.SphereGeometry(0.04));
    const leftEye = new THREE.Mesh(eyeGeo, this.mats.black);
    leftEye.position.set(-0.12, 0.05, 0.31);
    headGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, this.mats.black);
    rightEye.position.set(0.12, 0.05, 0.31);
    headGroup.add(rightEye);
    const smirkGeo = this.getGeo('TorusGeometry_0.06__0.02__2__8__Math.PI___0.7', () => new THREE.TorusGeometry(0.06, 0.02, 2, 8, Math.PI * 0.7));
    const smirk = new THREE.Mesh(smirkGeo, this.mats.black);
    smirk.position.set(0, -0.1, 0.32);
    smirk.rotation.z = Math.PI * 0.8;
    headGroup.add(smirk);

    const armGeo = this.getGeo('BoxGeometry_0.2__0.9__0.2', () => new THREE.BoxGeometry(0.2, 0.9, 0.2));
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.45, 1.3, 0);
    leftArm.castShadow = true;
    this.boyfriend.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.45, 1.3, 0);
    rightArm.castShadow = true;
    this.boyfriend.add(rightArm);

    const legGeo = this.getGeo('BoxGeometry_0.25__0.8__0.25', () => new THREE.BoxGeometry(0.25, 0.8, 0.25));
    const leftLeg = new THREE.Mesh(legGeo, this.mats.black);
    leftLeg.position.set(-0.2, 0.4, 0);
    leftLeg.castShadow = true;
    this.boyfriend.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, this.mats.black);
    rightLeg.position.set(0.2, 0.4, 0);
    rightLeg.castShadow = true;
    this.boyfriend.add(rightLeg);

    (this.boyfriend as any).leftArm = leftArm;
    (this.boyfriend as any).rightArm = rightArm;
    (this.boyfriend as any).leftLeg = leftLeg;
    (this.boyfriend as any).rightLeg = rightLeg;

    this.boyfriend.position.set(0, 0, 10);
    this.boyfriend.visible = false;
    this.scene.add(this.boyfriend);
  }

  private createSpeedLines() {
    const lineGeo = this.getGeo('BoxGeometry_0.05__0.05__5', () => new THREE.BoxGeometry(0.05, 0.05, 5));
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });
    for (let i = 0; i < 20; i++) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      this.resetSpeedLine(line);
      this.scene.add(line);
      this.speedLines.push(line);
    }
  }

  private resetSpeedLine(line: THREE.Mesh) {
    line.position.x = (Math.random() - 0.5) * 30;
    line.position.y = Math.random() * 10;
    line.position.z = -20 - Math.random() * 50;
  }

  // Input Handling
  private setupInputs() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") this.handleMove("left");
      if (e.key === "ArrowRight") this.handleMove("right");
      if (e.key === "ArrowUp") this.handleMove("up");
      if (e.key === "ArrowDown") this.handleMove("down");
    });

    let touchStartX = 0;
    let touchStartY = 0;
    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      },
      { passive: false },
    );
    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault(); // Prevent scrolling/rubber-banding while swiping over canvas
      },
      { passive: false },
    );
    this.canvas.addEventListener(
      "touchend",
      (e) => {
        const dx = e.changedTouches[0].screenX - touchStartX;
        const dy = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (Math.abs(dx) > 30) this.handleMove(dx > 0 ? "right" : "left");
        } else {
          if (dy < -30) this.handleMove("up");
          if (dy > 30) this.handleMove("down");
        }
      },
      { passive: false },
    );
  }

  private handleMove(direction: string) {
    if (!this.isPlaying) return;
    if (direction === "left" && this.currentLane > 0) this.currentLane--;
    if (direction === "right" && this.currentLane < 2) this.currentLane++;
    if (direction === "up" && !this.isJumping && !this.isDucking) {
      this.isJumping = true;
      this.jumpVelocity = this.JUMP_FORCE;
      this.audio.jump();
    }
    if (direction === "down" && !this.isJumping && !this.isDucking) {
      this.isDucking = true;
      this.duckTimer = 60;
      this.audio.duck();
    }
  }

  public resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Spawning Logic
  private spawnDecoration(zPos: number) {
    const side = Math.random() > 0.5 ? -1 : 1;
    const xPos = side * (7 + Math.random() * 10);
    const group = new THREE.Group();
    group.userData = { isPlant: true, phase: Math.random() * Math.PI * 2, swaySpeed: 0.001 + Math.random() * 0.001 };

    if (this.currentBiome === "garden") {
      const type = Math.random();
      if (type > 0.6) {
        // Appletree
        const trunk = new THREE.Mesh(
          this.getGeo('CylinderGeometry_0.3__0.5__2__8', () => new THREE.CylinderGeometry(0.3, 0.5, 2, 8)),
          this.mats.wood,
        );
        trunk.position.y = 1;
        trunk.castShadow = true;
        group.add(trunk);
        
        const leavesMat = this.mats.leaf;
        const leaf1 = new THREE.Mesh(this.getGeo('DodecahedronGeometry_1.2', () => new THREE.DodecahedronGeometry(1.2)), leavesMat);
        leaf1.position.set(0, 2.5, 0);
        leaf1.castShadow = true;
        const leaf2 = new THREE.Mesh(this.getGeo('DodecahedronGeometry_1.0', () => new THREE.DodecahedronGeometry(1.0)), leavesMat);
        leaf2.position.set(0.6, 2.0, 0.4);
        leaf2.castShadow = true;
        const leaf3 = new THREE.Mesh(this.getGeo('DodecahedronGeometry_1.0', () => new THREE.DodecahedronGeometry(1.0)), leavesMat);
        leaf3.position.set(-0.6, 2.0, -0.4);
        leaf3.castShadow = true;
        
        group.add(leaf1, leaf2, leaf3);
        
        // Apples
        for(let a=0; a<5; a++) {
            const apple = new THREE.Mesh(this.getGeo('SphereGeometry_0.15__8__8', () => new THREE.SphereGeometry(0.15, 8, 8)), this.mats.red);
            apple.position.set((Math.random() - 0.5) * 2, 2.0 + Math.random(), (Math.random() - 0.5) * 2);
            group.add(apple);
        }
      } else if (type > 0.3) {
        // Multi-level bush
        const bushMat = this.mats.rose;
        const b1 = new THREE.Mesh(this.getGeo('DodecahedronGeometry_0.8', () => new THREE.DodecahedronGeometry(0.8)), bushMat);
        b1.position.y = 0.6;
        b1.castShadow = true;
        const b2 = new THREE.Mesh(this.getGeo('DodecahedronGeometry_0.6', () => new THREE.DodecahedronGeometry(0.6)), bushMat);
        b2.position.set(0.6, 0.4, 0.2);
        b2.castShadow = true;
        const b3 = new THREE.Mesh(this.getGeo('DodecahedronGeometry_0.5', () => new THREE.DodecahedronGeometry(0.5)), bushMat);
        b3.position.set(-0.5, 0.3, -0.3);
        b3.castShadow = true;
        group.add(b1, b2, b3);
      } else {
        // Tiny flowers
        for(let f=0; f<3; f++) {
          const fGroup = new THREE.Group();
          const stem = new THREE.Mesh(this.getGeo('CylinderGeometry_0.02__0.02__0.5', () => new THREE.CylinderGeometry(0.02, 0.02, 0.5)), this.mats.leaf);
          stem.position.y = 0.25;
          const head = new THREE.Mesh(this.getGeo('SphereGeometry_0.15', () => new THREE.SphereGeometry(0.15)), this.mats.white);
          head.position.y = 0.5;
          const center = new THREE.Mesh(this.getGeo('SphereGeometry_0.08', () => new THREE.SphereGeometry(0.08)), this.mats.gold);
          center.position.y = 0.55;
          fGroup.add(stem, head, center);
          fGroup.position.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
          group.add(fGroup);
        }
      }
    } else if (this.currentBiome === "lake") {
      group.userData.isPlant = false;
      group.userData.isWaterPlant = true;
      
      const type = Math.random();
      if (type > 0.5) {
        // Water Lily
        const pad = new THREE.Mesh(this.getGeo('CylinderGeometry_1.2__1.2__0.05__12', () => new THREE.CylinderGeometry(1.2, 1.2, 0.05, 12)), this.mats.leaf);
        pad.position.y = 0.05; // floating just above water
        
        // Flower
        if (Math.random() > 0.5) {
          const flower = new THREE.Mesh(this.getGeo('SphereGeometry_0.3__8__8', () => new THREE.SphereGeometry(0.3, 8, 8)), this.mats.rose);
          flower.scale.set(1, 0.5, 1);
          flower.position.set(0.2, 0.15, 0.2);
          group.add(flower);
        }
        
        group.add(pad);
      } else {
        // Cattails
        for(let c=0; c<4; c++) {
          const cGroup = new THREE.Group();
          const stem = new THREE.Mesh(this.getGeo('CylinderGeometry_0.04__0.04__2.0__4', () => new THREE.CylinderGeometry(0.04, 0.04, 2.0, 4)), this.mats.leaf);
          stem.position.y = 1.0;
          const top = new THREE.Mesh(this.getGeo('CylinderGeometry_0.08__0.08__0.5__6', () => new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6)), this.mats.flowerHead);
          top.position.y = 1.6;
          cGroup.add(stem, top);
          cGroup.position.set((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5);
          cGroup.rotation.x = (Math.random() - 0.5) * 0.2;
          cGroup.rotation.z = (Math.random() - 0.5) * 0.2;
          group.add(cGroup);
        }
      }
    } else if (this.currentBiome === "jungle") {
      if (Math.random() > 0.4) {
        // Huge jungle tree
        const trunk = new THREE.Mesh(
          this.getGeo('CylinderGeometry_0.8__1.4__6__8', () => new THREE.CylinderGeometry(0.8, 1.4, 6, 8)),
          this.mats.wood,
        );
        trunk.position.y = 3.0;
        trunk.castShadow = true;
        group.add(trunk);
        
        const leavesMat = this.mats.leaf;
        const l1 = new THREE.Mesh(this.getGeo('DodecahedronGeometry_2.5', () => new THREE.DodecahedronGeometry(2.5)), leavesMat);
        l1.position.set(0, 6, 0);
        l1.scale.set(1, 0.6, 1);
        l1.castShadow = true;
        const l2 = new THREE.Mesh(this.getGeo('DodecahedronGeometry_2.0', () => new THREE.DodecahedronGeometry(2.0)), leavesMat);
        l2.position.set(1.5, 5.0, 1.5);
        l2.scale.set(1, 0.6, 1);
        l2.castShadow = true;
        const l3 = new THREE.Mesh(this.getGeo('DodecahedronGeometry_2.0', () => new THREE.DodecahedronGeometry(2.0)), leavesMat);
        l3.position.set(-1.5, 5.0, -1.5);
        l3.scale.set(1, 0.6, 1);
        l3.castShadow = true;
        
        group.add(l1, l2, l3);
        
        // Vines
        const vineGeo = this.getGeo('CylinderGeometry_0.06__0.06__4__4', () => new THREE.CylinderGeometry(0.06, 0.06, 4, 4));
        const vine1 = new THREE.Mesh(vineGeo, this.mats.leaf);
        vine1.position.set(1.0, 3, 0);
        vine1.castShadow = true;
        const vine2 = new THREE.Mesh(vineGeo, this.mats.leaf);
        vine2.position.set(-1.0, 3, 0.5);
        vine2.castShadow = true;
        
        group.add(vine1, vine2);
      } else {
        // Giant fern
        for(let f=0; f<5; f++) {
            const frond = new THREE.Mesh(this.getGeo('SphereGeometry_0.3__8__8', () => new THREE.SphereGeometry(0.3, 8, 8)), this.mats.leaf);
            frond.scale.set(1, 8, 3);
            frond.position.y = 2.0;
            frond.castShadow = true;
            const pivot = new THREE.Group();
            pivot.add(frond);
            pivot.rotation.y = (f / 5) * Math.PI * 2;
            pivot.rotation.x = Math.PI * 0.3;
            group.add(pivot);
        }
      }
    }

    group.position.set(xPos, 0, zPos);
    this.scene.add(group);
    this.scenery.push(group);
  }

  private spawnObstacle(zPos: number) {
    const lane = Math.floor(Math.random() * 3);
    const xPos = (lane - 1) * this.laneWidth;
    const group = new THREE.Group();

    const isHigh = Math.random() > 0.7;
    const type = isHigh ? "high" : "low";
    let mat = this.mats.wood;
    let colorMat = isHigh ? this.mats.blue : this.mats.red;
    if (this.currentBiome === "lake") {
      mat = this.mats.rockBrown;
    }

    const postHeight = isHigh ? 2.5 : 1.5;
    const postGeo = this.getGeo(`BoxGeometry_0.2_${postHeight}_0.2`, () => new THREE.BoxGeometry(0.2, postHeight, 0.2));
    const leftPost = new THREE.Mesh(postGeo, mat);
    leftPost.position.set(-1.2, postHeight / 2, 0);
    leftPost.castShadow = true;
    group.add(leftPost);
    const rightPost = new THREE.Mesh(postGeo, mat);
    rightPost.position.set(1.2, postHeight / 2, 0);
    rightPost.castShadow = true;
    group.add(rightPost);

    const barY = isHigh ? 2.0 : 1.0;
    const barGeo = this.getGeo('BoxGeometry_2.6__0.6__0.1', () => new THREE.BoxGeometry(2.6, 0.6, 0.1));
    const bar = new THREE.Mesh(barGeo, colorMat);
    bar.position.set(0, barY, 0);
    bar.castShadow = true;
    group.add(bar);

    group.position.set(xPos, 0, zPos);

    this.scene.add(group);
    this.obstacles.push({
      mesh: group,
      lane,
      type,
      active: true,
    });
  }

    private spawnSunflowerLine(zPos: number, isSky = false) {
        const lane = Math.floor(Math.random() * 3);
        const count = Math.floor(Math.random() * 3) + 3; // 3 to 5 sunflowers
        for(let j=0; j<count; j++) {
            this.spawnSingleSunflower(zPos - j * 3, lane, isSky);
        }
    }

    private spawnSingleSunflower(zPos: number, lane: number, isSky = false) {
        const xPos = (lane - 1) * this.laneWidth;
        const group = new THREE.Group();

        const headGroup = new THREE.Group();

        const head = new THREE.Mesh(this.getGeo('CylinderGeometry_0.25__0.25__0.1__24', () => new THREE.CylinderGeometry(0.25, 0.25, 0.1, 24)), this.mats.flowerHead);
        head.rotation.x = Math.PI / 2; headGroup.add(head);

        const petalGeo = this.getGeo('SphereGeometry_0.15__16__16_scaled_petal', () => {
            const g = new THREE.SphereGeometry(0.15, 16, 16);
            g.scale(1.0, 0.2, 2.0);
            return g;
        });
        for(let i=0; i<12; i++) {
            const petal = new THREE.Mesh(petalGeo, this.mats.petal);
            const angle = (i / 12) * Math.PI * 2;
            petal.position.set(Math.cos(angle) * 0.35, Math.sin(angle) * 0.35, 0); petal.rotation.z = angle; headGroup.add(petal);
        }

        if (!isSky) {
            const stalk = new THREE.Mesh(this.getGeo('CylinderGeometry_0.04__0.04__1.5', () => new THREE.CylinderGeometry(0.04, 0.04, 1.5)), this.mats.leaf);
            stalk.position.y = -0.75;
            group.add(stalk);
            
            const leafGeo = this.getGeo('SphereGeometry_0.15__8__8_scaled_leaf', () => {
                const g = new THREE.SphereGeometry(0.15, 8, 8);
                g.scale(1, 0.2, 0.5);
                return g;
            });
            const leaf1 = new THREE.Mesh(leafGeo, this.mats.leaf);
            leaf1.position.set(0.15, -0.6, 0); leaf1.rotation.z = Math.PI / 4; group.add(leaf1);
            const leaf2 = new THREE.Mesh(leafGeo, this.mats.leaf);
            leaf2.position.set(-0.15, -1.0, 0); leaf2.rotation.z = -Math.PI / 4; group.add(leaf2);
        }

        group.add(headGroup);

        group.position.set(xPos, isSky ? 4.0 : 1.5, zPos);
        group.userData = { baseY: isSky ? 4.0 : 1.5, phase: Math.random() * Math.PI * 2 };
        group.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(group);
        this.sunflowers.push({ mesh: group, lane, active: true });
    }

  private spawnPowerup(zPos: number) {
    const lane = Math.floor(Math.random() * 3);
    const xPos = (lane - 1) * this.laneWidth;
    const typeRand = Math.random();
    let type: PowerupType = "magnet";
    if (typeRand > 0.33) type = "shield";
    if (typeRand > 0.66) type = "speed";

    const group = new THREE.Group();

    if (type === "magnet") {
      const chainMat = this.getMat('gold_metal', () => new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 1.0, roughness: 0.1 }));
      const chain = new THREE.Mesh(
        this.getGeo('TorusGeometry_0.2__0.015__8__32', () => new THREE.TorusGeometry(0.2, 0.015, 8, 32)),
        chainMat,
      );
      group.add(chain);
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const bead = new THREE.Mesh(
          this.getGeo('SphereGeometry_0.05__8__8', () => new THREE.SphereGeometry(0.05, 8, 8)),
          i % 2 === 0 ? this.mats.black : this.mats.white,
        );
        bead.position.set(Math.cos(angle) * 0.2, Math.sin(angle) * 0.2, 0);
        group.add(bead);

        const nextAngle = ((i + 0.5) / 16) * Math.PI * 2;
        const spacer = new THREE.Mesh(
          this.getGeo('SphereGeometry_0.02__4__4', () => new THREE.SphereGeometry(0.02, 4, 4)),
          chainMat,
        );
        spacer.position.set(
          Math.cos(nextAngle) * 0.2,
          Math.sin(nextAngle) * 0.2,
          0,
        );
        group.add(spacer);
      }
      const charmGroup = new THREE.Group();
      charmGroup.position.set(0, -0.25, 0);
      const ring = new THREE.Mesh(
        this.getGeo('TorusGeometry_0.03__0.005__4__8', () => new THREE.TorusGeometry(0.03, 0.005, 4, 8)),
        chainMat,
      );
      ring.rotation.y = Math.PI / 2;
      charmGroup.add(ring);

      const eyeOuter = new THREE.Mesh(
        this.getGeo('CylinderGeometry_0.08__0.08__0.02__16', () => new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16)),
        this.mats.blue,
      );
      eyeOuter.rotation.x = Math.PI / 2;
      eyeOuter.position.y = -0.08;
      charmGroup.add(eyeOuter);
      const eyeInner = new THREE.Mesh(
        this.getGeo('CylinderGeometry_0.05__0.05__0.025__16', () => new THREE.CylinderGeometry(0.05, 0.05, 0.025, 16)),
        this.mats.white,
      );
      eyeInner.rotation.x = Math.PI / 2;
      eyeInner.position.y = -0.08;
      charmGroup.add(eyeInner);
      const eyePupil = new THREE.Mesh(
        this.getGeo('CylinderGeometry_0.02__0.02__0.03__8', () => new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8)),
        this.mats.black,
      );
      eyePupil.rotation.x = Math.PI / 2;
      eyePupil.position.y = -0.08;
      charmGroup.add(eyePupil);
      group.add(charmGroup);
    } else if (type === "shield") {
      const pMat = this.getMat('gold_shield', () => new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 }));
      const stud = new THREE.Mesh(
        this.getGeo('SphereGeometry_0.08__16__16', () => new THREE.SphereGeometry(0.08, 16, 16)),
        pMat,
      );
      stud.position.y = 0.3;
      group.add(stud);
      const conn = new THREE.Mesh(
        this.getGeo('CylinderGeometry_0.015__0.015__0.15', () => new THREE.CylinderGeometry(0.015, 0.015, 0.15)),
        pMat,
      );
      conn.position.y = 0.2;
      group.add(conn);
      const dome = new THREE.Mesh(
        this.getGeo('SphereGeometry_0.15__16__16__0__Math.PI___2__0__Math.PI___0.6', () => new THREE.SphereGeometry(0.15, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6)),
        pMat,
      );
      dome.material.side = THREE.DoubleSide;
      dome.rotation.x = Math.PI;
      dome.position.y = 0.0;
      group.add(dome);
      for (let i = 0; i < 8; i++) {
        const dangler = new THREE.Mesh(
          this.getGeo('SphereGeometry_0.03__8__8', () => new THREE.SphereGeometry(0.03, 8, 8)),
          pMat,
        );
        const ang = (i / 8) * Math.PI * 2;
        dangler.position.set(Math.cos(ang) * 0.14, -0.05, Math.sin(ang) * 0.14);
        group.add(dangler);
      }
    } else if (type === "speed") {
      const base = new THREE.Mesh(
        this.getGeo('CylinderGeometry_0.1__0.1__0.3__16', () => new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16)),
        this.getMat('dark_metal', () => new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 })),
      );
      const tip = new THREE.Mesh(
        this.getGeo('CylinderGeometry_0.08__0.02__0.2__16', () => new THREE.CylinderGeometry(0.08, 0.02, 0.2, 16)),
        this.getMat('red_speed', () => new THREE.MeshStandardMaterial({ color: 0xD32F2F, roughness: 0.2, metalness: 0.3 })),
      );
      tip.position.y = 0.25;
      tip.rotation.z = -0.15;
      group.add(base);
      group.add(tip);
    }
    group.scale.set(2.5, 2.5, 2.5);
    group.position.set(xPos, 1.5, zPos);
    group.userData = { phase: Math.random() * Math.PI * 2 };
    this.scene.add(group);
    this.powerups.push({ mesh: group, lane, type, active: true });
  }

  private spawnParticles(
    pos: THREE.Vector3,
    color: number,
    count: number,
    type: string,
  ) {
    const geo = this.getGeo('BoxGeometry_0.1__0.1__0.1', () => new THREE.BoxGeometry(0.1, 0.1, 0.1));
    const mat = this.getMat(`basic_${color}`, () => new THREE.MeshBasicMaterial({ color: color }));

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        Math.random() * 0.5,
        (Math.random() - 0.5) * 0.5,
      );
      if (type === "dust") {
        mesh.userData.vel.y = Math.random() * 0.2;
        mesh.position.y = 0.1;
      }
      mesh.userData.life = 1.0;
      this.scene.add(mesh);
      this.particles.push(mesh);
    }
  }

  // Game Loop Methods
  public startGame() {
    this.demoMode = false;
    this.audio.init();
    this.isPlaying = true;
    this.isGameOver = false;
    this.isCaughtAnimation = false;

    this.gameSpeed = 0.4;
    this.score = 0;
    this.cameraShake = 0;
    this.currentLane = 1;
    this.targetX = 0;
    this.playerVelocityX = 0;
    this.playerImpactY = 0;
    this.playerImpactZ = 0;
    this.playerImpactRotX = 0;
    this.player.position.set(0, 0, 0);
    this.player.rotation.set(0, Math.PI, 0);
    this.jumpVelocity = 0;
    this.isDucking = false;
    this.isJumping = false;

    this.hasShield = false;
    this.isMagnet = false;
    this.isSpeeding = false;
    this.magnetTimer = 0;
    this.speedTimer = 0;

    this.updateCallbackEvents();

    this.obstacles.forEach((o) => this.scene.remove(o.mesh));
    this.obstacles = [];
    this.sunflowers.forEach((s) => this.scene.remove(s.mesh));
    this.sunflowers = [];
    this.scenery.forEach((s) => this.scene.remove(s));
    this.scenery = [];
    this.powerups.forEach((p) => this.scene.remove(p.mesh));
    this.powerups = [];
    this.particles.forEach((p) => this.scene.remove(p));
    this.particles = [];

    this.currentBiome = "garden";
    this.ground.material = this.mats.grass;
    this.road.material = this.mats.roadAsphalt;
    this.scene.fog!.color.setHex(0x87ceeb);
    this.scene.background = new THREE.Color(0x87ceeb);
    this.skySphere.visible = false;
    this.jungleSun.visible = false;
    this.wallLeft.visible = false;
    this.wallRight.visible = false;

    for (let i = 0; i < 20; i++) this.spawnDecoration(-i * 10);
    this.boyfriend.visible = false;
  }

  private triggerGameOver() {
    this.isPlaying = false;
    this.isCaughtAnimation = true;
    
    // Impact physics initialization
    this.playerImpactY = 0.4; // Small bounce up
    this.playerImpactZ = 0.5; // Throw slightly backward
    this.playerImpactRotX = -0.5; // Tilt backward

    this.boyfriend.position.set(this.player.position.x, 0, 10);
    this.boyfriend.visible = true;
  }

  private updateCallbackEvents() {
    this.onScoreUpdate(this.score);
    this.onPowerupUpdate({
      shield: this.hasShield,
      magnet: this.isMagnet,
      speed: this.isSpeeding,
    });
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (!this.isPlaying && !this.demoMode && !this.isCaughtAnimation) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake *= 0.9;
      if (this.cameraShake < 0.05) this.cameraShake = 0;
    }

    // Always increment gameTime
    this.gameTime++;

    if (this.isPlaying || this.demoMode) {
      // Biomes
      const cycleScore = this.score % 90;
      let targetBiome: BiomeType = "garden";
      if (cycleScore >= 30 && cycleScore < 60) targetBiome = "lake";
      else if (cycleScore >= 60) targetBiome = "jungle";

      if (targetBiome !== this.currentBiome && this.isPlaying) {
        this.currentBiome = targetBiome;
        if (this.currentBiome === "garden") {
          this.ground.material = this.mats.grass;
          this.road.material = this.mats.roadAsphalt;
          this.scene.fog!.color.setHex(0x87ceeb);
          this.scene.background = new THREE.Color(0x87ceeb);
          this.wallLeft.visible = false;
          this.wallRight.visible = false;
          this.skySphere.visible = false;
          this.jungleSun.visible = false;
        } else if (this.currentBiome === "lake") {
          this.ground.material = this.mats.water;
          this.road.material = this.mats.roadWood;
          this.scene.fog!.color.setHex(0xb3e5fc);
          this.scene.background = new THREE.Color(0xb3e5fc);
          this.wallLeft.visible = true;
          this.wallRight.visible = true;
          this.skySphere.visible = false;
          this.jungleSun.visible = false;
        } else if (this.currentBiome === "jungle") {
          this.ground.material = this.mats.jungle;
          this.road.material = this.mats.roadDirt;
          this.scene.fog!.color.setHex(0xff7043);
          this.scene.background = null;
          this.wallLeft.visible = false;
          this.wallRight.visible = false;
          this.skySphere.visible = true;
          this.jungleSun.visible = true;
        }
      }

      let effectiveSpeed = this.gameSpeed;
      if (this.isSpeeding) effectiveSpeed = 0.8;
      else if (this.isPlaying && this.gameSpeed < 0.7) this.gameSpeed += 0.0001; // Capped game speed
      else if (this.demoMode) effectiveSpeed = 0.3; // Demo mode slow speed

      // Scroll textures
      this.textures.road_asphalt.offset.y += effectiveSpeed * 0.05;
      this.textures.road_wood.offset.y += effectiveSpeed * 0.05;
      this.textures.road_dirt.offset.y += effectiveSpeed * 0.05;
      this.textures.cobblestone.offset.y += effectiveSpeed * 0.05;
      (this.ground.material as THREE.MeshStandardMaterial).map!.offset.y +=
        effectiveSpeed * 0.1;

      if (this.currentBiome === "lake") {
        this.textures.water.offset.x = Math.sin(Date.now() * 0.001) * 0.03;
      } else {
        this.textures.water.offset.x = 0;
      }

      // Camera follow
      const targetCamX = this.player.position.x * 0.3;
      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.1;
      if (this.cameraShake <= 0)
        this.camera.position.y = THREE.MathUtils.lerp(
          this.camera.position.y,
          5,
          0.1,
        );

      if (this.skySphere.visible) {
        this.skySphere.position.copy(this.player.position);
        this.skySphere.rotation.y += 0.0002;
        this.jungleSun.position.y = 30 + Math.sin(Date.now() * 0.0001) * 5; // Slow vertical bobbing/setting
      }

      if (this.isSpeeding) {
        this.speedLines.forEach((line) => {
          line.visible = true;
          line.position.z += effectiveSpeed * 5;
          if (line.position.z > 5) this.resetSpeedLine(line);
        });
      } else {
        this.speedLines.forEach((l) => (l.visible = false));
      }

      // Obstacles
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.mesh.position.z += effectiveSpeed;

        if (this.isPlaying && !this.isSpeeding && obs.active) {
          
            const pMinX = this.player.position.x - 0.4;
            const pMaxX = this.player.position.x + 0.4;
            const pMinY = this.player.position.y;
            const pMaxY = this.player.position.y + (this.isDucking ? 1.0 : 2.2);
            const pMinZ = this.player.position.z - 0.3; // usually 0
            const pMaxZ = this.player.position.z + 0.3;

            const oMinX = obs.mesh.position.x - 1.3;
            const oMaxX = obs.mesh.position.x + 1.3;
            const oMinZ = obs.mesh.position.z - 0.3;
            const oMaxZ = obs.mesh.position.z + 0.3;

            if (pMaxX > oMinX && pMinX < oMaxX && pMaxZ > oMinZ && pMinZ < oMaxZ) {
              let oMinY = 0;
              let oMaxY = 2.5;

              if (obs.type === 'low') {
                  oMaxY = 1.3;
              } else if (obs.type === 'high') {
                  oMinY = 1.6; // Bar is up high, requires ducking
              }
              
              const hit = (pMaxY > oMinY && pMinY < oMaxY);

              if (hit) {
                if (this.hasShield) {
                  this.hasShield = false;
                  this.shieldMesh.visible = false;
                  this.cameraShake = 0.5;
                  
                  // Shield Impact hop
                  this.jumpVelocity = 0.25;
                  this.isJumping = true;

                  this.audio.hit();
                  this.updateCallbackEvents();
                  obs.active = false;
                  obs.mesh.visible = false;
                } else {
                  this.cameraShake = 1.0;
                  this.audio.hit();
                  this.triggerGameOver();
                }
              }
            }
        }
        if (obs.mesh.position.z > 10) {
          this.scene.remove(obs.mesh);
          this.obstacles.splice(i, 1);
        }
      }

      // Powerups
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const p = this.powerups[i];
        p.mesh.position.z += effectiveSpeed;
        p.mesh.rotation.y += 0.1;
        
        if (p.mesh.userData && p.mesh.userData.phase !== undefined) {
          p.mesh.position.y = 1.5 + Math.sin(Date.now() * 0.003 + p.mesh.userData.phase) * 0.2;
        }

        if (
          p.active &&
          Math.abs(p.mesh.position.z) < 1 &&
          Math.abs(this.player.position.x - p.mesh.position.x) < 1.3
        ) {
          if(this.isPlaying) {
              this.audio.powerup();
              p.active = false;
              this.scene.remove(p.mesh);
              this.powerups.splice(i, 1);
              if (p.type === "shield") {
                this.hasShield = true;
                this.shieldMesh.visible = true;
              }
              if (p.type === "magnet") {
                this.isMagnet = true;
                this.magnetTimer = 600;
              }
              if (p.type === "speed") {
                this.isSpeeding = true;
                this.speedTimer = 300;
                this.player.position.y = 3;
              }
              this.updateCallbackEvents();
              continue;
          }
        }
        if (p.mesh.position.z > 10) {
          this.scene.remove(p.mesh);
          this.powerups.splice(i, 1);
        }
      }

      if (this.isMagnet) {
        this.magnetTimer--;
        if (this.magnetTimer <= 0) {
          this.isMagnet = false;
          this.updateCallbackEvents();
        }
      }
      if (this.isSpeeding) {
        this.speedTimer--;
        if (this.speedTimer <= 0) {
          this.isSpeeding = false;
          this.updateCallbackEvents();
          this.player.position.y = 0;
        }
      }

      // Sunflowers
      for (let i = this.sunflowers.length - 1; i >= 0; i--) {
        const sun = this.sunflowers[i];
        sun.mesh.position.z += effectiveSpeed;
        sun.mesh.rotation.y += 0.05;
        
        if (sun.mesh.userData && sun.mesh.userData.phase !== undefined) {
          sun.mesh.position.y = sun.mesh.userData.baseY + Math.sin(Date.now() * 0.003 + sun.mesh.userData.phase) * 0.2;
        }

        if (this.isMagnet && sun.mesh.position.z > -20 && this.isPlaying) {
          sun.mesh.position.x +=
            (this.player.position.x - sun.mesh.position.x) * 0.1;
          sun.mesh.position.z += 0.2;
        }
        if (this.isPlaying && sun.active && sun.mesh.position.z > -1 && sun.mesh.position.z < 1) {
          const hitRangeY = this.isSpeeding ? 4.0 : 2.0;
          if (
            Math.abs(this.player.position.x - sun.mesh.position.x) < 1.0 &&
            this.player.position.y < hitRangeY
          ) {
            sun.active = false;
            this.spawnParticles(
              sun.mesh.position.clone(),
              0xffd700,
              5,
              "confetti",
            );
            this.audio.collect();
            this.scene.remove(sun.mesh);
            this.sunflowers.splice(i, 1);
            this.score++;
            this.updateCallbackEvents();
            continue;
          }
        }
        if (sun.mesh.position.z > 10) {
          this.scene.remove(sun.mesh);
          this.sunflowers.splice(i, 1);
        }
      }

      if (
        this.player.position.y <= 0 &&
        !this.isJumping &&
        this.gameTime % 5 === 0
      )
        this.spawnParticles(
          new THREE.Vector3(
            this.player.position.x,
            0,
            this.player.position.z - 0.5,
          ),
          0x8d6e63,
          1,
          "dust",
        );

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.position.add(p.userData.vel);
        p.userData.vel.y -= 0.01;
        p.userData.life -= 0.02;
        p.scale.setScalar(p.userData.life);
        if (p.userData.life <= 0) {
          this.scene.remove(p);
          this.particles.splice(i, 1);
        }
      }
      for (let i = this.scenery.length - 1; i >= 0; i--) {
        const s = this.scenery[i];
        s.position.z += effectiveSpeed;
        
        if (s.userData && s.userData.isPlant) {
            s.rotation.z = Math.sin(Date.now() * s.userData.swaySpeed + s.userData.phase) * 0.08;
            s.rotation.x = Math.sin(Date.now() * s.userData.swaySpeed * 0.8 + s.userData.phase) * 0.04;
        } else if (s.userData && s.userData.isWaterPlant) {
            s.position.y = Math.sin(Date.now() * 0.002 + s.userData.phase) * 0.08;
            s.rotation.x = Math.sin(Date.now() * 0.002 + s.userData.phase) * 0.04;
        }

        if (s.position.z > 15) {
          this.scene.remove(s);
          this.scenery.splice(i, 1);
        }
      }

      // Spawning
      const arrivalTime = 100 / (this.isSpeeding ? 0.8 : this.gameSpeed);
      const spawnSky = this.isSpeeding && this.speedTimer > arrivalTime;

      if (spawnSky) {
        if (Math.random() < 0.2) this.spawnSunflowerLine(-100, true);
      } else {
        const isLanding = this.isSpeeding;
        const spawnChance = Math.random();
        const lastObsZ =
          this.obstacles.length > 0
            ? this.obstacles[this.obstacles.length - 1].mesh.position.z
            : 0;

        if (this.isPlaying && !isLanding && spawnChance < 0.02 && lastObsZ > -30) {
          this.spawnObstacle(-100);
        } else if (spawnChance > 0.02 && spawnChance < 0.04) {
          this.spawnSunflowerLine(-100);
        } else if (this.isPlaying && spawnChance > 0.998) {
          this.spawnPowerup(-100);
        }
      }
      if (Math.random() < 0.05) this.spawnDecoration(-120);

      // Player Animation & movement
      this.targetX = (this.currentLane - 1) * this.laneWidth;
      // Spring momentum for smoother lane changes
      this.playerVelocityX += (this.targetX - this.player.position.x) * 0.05;
      this.playerVelocityX *= 0.82;
      this.player.position.x += this.playerVelocityX;
      
      const playerSpeedX = this.playerVelocityX;

      const pInfo = this.player as any;
      if (!this.isSpeeding) {
        if (this.isJumping) {
          this.player.position.y += this.jumpVelocity;
          
          // Apex Hang Time: gravity decreases near peak of jump
          let currentGravity = this.GRAVITY;
          if (Math.abs(this.jumpVelocity) < 0.1) currentGravity *= 0.6;
          this.jumpVelocity += currentGravity;

          if (this.player.position.y <= 0) {
            this.player.position.y = 0;
            this.isJumping = false;
            this.jumpVelocity = 0;
          }
          pInfo.leftLeg.rotation.x = -0.5;
          pInfo.rightLeg.rotation.x = -0.2;
          pInfo.leftArm.rotation.x = -2.5;
          pInfo.rightArm.rotation.x = -2.5;
        } else if (this.isDucking) {
          this.duckTimer--;
          if (this.duckTimer <= 0) {
            this.isDucking = false;
            pInfo.bodyGroup.scale.y = 1.0;
            pInfo.bodyGroup.position.y = 0;
          } else {
            pInfo.bodyGroup.scale.y = 0.5;
            pInfo.bodyGroup.position.y = 0;
          }
        } else {
          const t = Date.now() * 0.015;
          pInfo.leftLeg.rotation.x = Math.sin(t) * 0.6;
          pInfo.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.6;
          pInfo.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.6;
          pInfo.rightArm.rotation.x = Math.sin(t) * 0.6;
        }
      } else {
        pInfo.leftLeg.rotation.x = 0.5;
        pInfo.rightLeg.rotation.x = 0.5;
        pInfo.leftArm.rotation.x = 0;
        pInfo.rightArm.rotation.x = 0;
        this.shieldMesh.visible = false;
      }

      if (this.hasShield) {
        this.shieldMesh.rotation.y += 0.1;
        this.shieldMesh.position.y = 1.5 + Math.sin(Date.now() * 0.005) * 0.2;
      }
      
      const leanAngle = -playerSpeedX * 0.5;
      this.player.rotation.z = Math.sin(Date.now() * 0.01) * 0.05 + leanAngle;
      
      this.player.rotation.x = this.isJumping
        ? 0.3
        : this.isDucking
          ? 0.8
          : 0.15;

      this.frameCount++;
    }

    if (this.isCaughtAnimation) {
      // Impact Physics: Player tumbles backwards
      if (this.playerImpactY !== 0 || this.playerImpactZ !== 0) {
        this.player.position.y += this.playerImpactY;
        this.player.position.z += this.playerImpactZ;
        this.player.rotation.x += this.playerImpactRotX;
        
        this.playerImpactY += this.GRAVITY * 1.5; // heavier fall
        this.playerImpactZ *= 0.9; // friction/air resistance
        this.playerImpactRotX *= 0.95; // tumble slows down
        
        if (this.player.position.y <= 0) {
          this.player.position.y = 0;
          this.playerImpactY = 0;
          this.playerImpactZ = 0;
          this.playerImpactRotX = 0;
          this.player.rotation.x = -Math.PI / 2 + 0.2; // Lay flat on back
        }
      }

      const dx = this.player.position.x - this.boyfriend.position.x;
      const dz = this.player.position.z - 1.5 - this.boyfriend.position.z;
      this.boyfriend.position.x += dx * 0.1;
      this.boyfriend.position.z += dz * 0.05;
      this.boyfriend.position.y = Math.abs(Math.sin(Date.now() * 0.02)) * 0.2;

      const t = Date.now() * 0.015;
      const bfInfo = this.boyfriend as any;
      bfInfo.leftLeg.rotation.x = Math.sin(t) * 0.6;
      bfInfo.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.6;
      bfInfo.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.6;
      bfInfo.rightArm.rotation.x = Math.sin(t) * 0.6;

      if (Math.abs(dz) < 0.5) {
        this.isCaughtAnimation = false;
        if (this.score > this.highScore) {
          this.highScore = this.score;
          localStorage.setItem("sunflowerRunHighScore", this.score.toString());
        }
        this.onGameOver(this.score, this.score >= this.highScore);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    cancelAnimationFrame(this.animationFrameId);
    this.renderer.dispose();
  }
}
