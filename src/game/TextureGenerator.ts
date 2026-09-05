import * as THREE from "three";

export type TextureType =
  | "grass"
  | "water"
  | "jungle"
  | "dino_ground"
  | "sky_sunset"
  | "sky_dino"
  | "road_asphalt"
  | "road_wood"
  | "road_dirt"
  | "road_stone"
  | "cobblestone"
  | "rose"
  | "dress"
  | "dress_dino"
  | "gambhir_hoodie"
  | "gambhir_denim"
  | "sneaker_diva"
  | "sneaker_gambhir"
  | "speech_bubble_suno"
  | "speech_bubble_wait"
  | "speech_bubble_flowers"
  | "speech_bubble_yawrrrrr"
  | "wood"
  | "leaf"
  | "glow_radial"
  | "obstacle_chevron"
  | "obstacle_duck_arch"
  | "bump_road_asphalt"
  | "bump_road_wood"
  | "bump_road_stone"
  | "normal_road_asphalt"
  | "normal_road_wood"
  | "normal_road_stone"
  | "normal_cobblestone"
  | "normal_water"
  | "particle_sparkle"
  | "particle_star"
  | "particle_smoke"
  | "particle_petal"
  | "particle_sweat"
  | "particle_dust"
  | "macro_noise";

export class TextureGenerator {
  private static cache: Map<string, THREE.Texture> = new Map();
  public static resolution = 512; // 256 for low tier, 512 for high

  public static setResolution(res: 256 | 512): void {
    this.resolution = res;
  }

  public static getTexture(type: TextureType, maxAnisotropy = 4): THREE.Texture {
    const key = `${type}_${this.resolution}_${maxAnisotropy}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const tex = this.createTexture(type);
    tex.anisotropy = maxAnisotropy;
    this.cache.set(key, tex);
    return tex;
  }

  public static async preloadAll(
    onProgress?: (progress: number, currentItem: string) => void
  ): Promise<void> {
    const allTypes: TextureType[] = [
      "glow_radial",
      "particle_sparkle",
      "particle_star",
      "particle_smoke",
      "particle_petal",
      "particle_sweat",
      "particle_dust",
      "obstacle_chevron",
      "obstacle_duck_arch",
      "dress",
      "dress_dino",
      "gambhir_hoodie",
      "gambhir_denim",
      "sneaker_diva",
      "sneaker_gambhir",
      "speech_bubble_suno",
      "speech_bubble_wait",
      "speech_bubble_flowers",
      "speech_bubble_yawrrrrr",
      "road_asphalt",
      "bump_road_asphalt",
      "normal_road_asphalt",
      "grass",
      "road_wood",
      "bump_road_wood",
      "normal_road_wood",
      "water",
      "normal_water",
      "road_dirt",
      "jungle",
      "sky_sunset",
      "road_stone",
      "bump_road_stone",
      "normal_road_stone",
      "dino_ground",
      "sky_dino",
      "cobblestone",
      "normal_cobblestone",
      "rose",
      "wood",
      "leaf",
      "macro_noise",
    ];

    for (let i = 0; i < allTypes.length; i++) {
      const type = allTypes[i];
      this.getTexture(type);
      if (onProgress) {
        onProgress((i + 1) / allTypes.length, type);
      }
      // Yield to main thread
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  }

  /**
   * Helper that invokes drawFn at (x, y) and any boundary wrap positions (x ± sz, y ± sz)
   * if the shape's bounding radius touches or crosses any canvas edges.
   */
  private static drawWrapped(
    _cx: CanvasRenderingContext2D,
    sz: number,
    x: number,
    y: number,
    radius: number,
    drawFn: (px: number, py: number) => void
  ): void {
    drawFn(x, y);

    const crossesLeft = x - radius < 0;
    const crossesRight = x + radius > sz;
    const crossesTop = y - radius < 0;
    const crossesBottom = y + radius > sz;

    if (crossesLeft) drawFn(x + sz, y);
    if (crossesRight) drawFn(x - sz, y);
    if (crossesTop) drawFn(x, y + sz);
    if (crossesBottom) drawFn(x, y - sz);

    if (crossesLeft && crossesTop) drawFn(x + sz, y + sz);
    if (crossesLeft && crossesBottom) drawFn(x + sz, y - sz);
    if (crossesRight && crossesTop) drawFn(x - sz, y + sz);
    if (crossesRight && crossesBottom) drawFn(x - sz, y - sz);
  }

  /**
   * Generates a tangent-space Normal Map by applying a Sobel gradient filter over a heightmap canvas.
   */
  private static createNormalMap(
    drawHeightmap: (cx: CanvasRenderingContext2D, sz: number, scale: number) => void,
    strength = 2.5
  ): THREE.Texture {
    const sz = this.resolution;
    const cvs = document.createElement("canvas");
    cvs.width = sz;
    cvs.height = sz;
    const cx = cvs.getContext("2d")!;
    const scale = sz / 512;

    // 1. Draw heightmap (0 = deep recess, 255 = highest peak)
    drawHeightmap(cx, sz, scale);
    const src = cx.getImageData(0, 0, sz, sz);
    const srcData = src.data;

    // 2. Sobel convolution filter for normal vectors
    const dst = cx.createImageData(sz, sz);
    const dstData = dst.data;

    const getHeight = (x: number, y: number): number => {
      const wx = (x + sz) % sz;
      const wy = (y + sz) % sz;
      return srcData[(wy * sz + wx) * 4] / 255.0;
    };

    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        const tl = getHeight(x - 1, y - 1);
        const t = getHeight(x, y - 1);
        const tr = getHeight(x + 1, y - 1);
        const l = getHeight(x - 1, y);
        const r = getHeight(x + 1, y);
        const bl = getHeight(x - 1, y + 1);
        const b = getHeight(x, y + 1);
        const br = getHeight(x + 1, y + 1);

        const dx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
        const dy = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);
        const dz = 1.0 / strength;

        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const nx = (-dx / len) * 0.5 + 0.5;
        const ny = (-dy / len) * 0.5 + 0.5;
        const nz = (dz / len) * 0.5 + 0.5;

        const idx = (y * sz + x) * 4;
        dstData[idx] = Math.floor(nx * 255);
        dstData[idx + 1] = Math.floor(ny * 255);
        dstData[idx + 2] = Math.floor(nz * 255);
        dstData[idx + 3] = 255;
      }
    }

    cx.putImageData(dst, 0, 0);
    const tex = new THREE.CanvasTexture(cvs);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = true;
    return tex;
  }

  public static createTexture(type: TextureType): THREE.Texture {
    if (type === "normal_road_asphalt") {
      return this.createNormalMap((cx, sz, scale) => {
        cx.fillStyle = "#808080";
        cx.fillRect(0, 0, sz, sz);
        const dots = Math.floor(2500 * scale * scale);
        for (let i = 0; i < dots; i++) {
          const val = Math.floor(Math.random() * 80 + 90);
          cx.fillStyle = `rgb(${val},${val},${val})`;
          const px = Math.random() * sz;
          const py = Math.random() * sz;
          this.drawWrapped(cx, sz, px, py, 2 * scale, (dx, dy) => {
            cx.fillRect(dx, dy, 2.5 * scale, 2.5 * scale);
          });
        }
      }, 3.0);
    }

    if (type === "normal_road_wood") {
      return this.createNormalMap((cx, sz, scale) => {
        cx.fillStyle = "#a0a0a0";
        cx.fillRect(0, 0, sz, sz);
        const step = 32 * scale;
        for (let y = 0; y < sz; y += step) {
          // Plank groove (deep black groove)
          cx.fillStyle = "#000000";
          cx.fillRect(0, y, sz, 4 * scale);
          // Plank chamfer bevel
          cx.fillStyle = "#e0e0e0";
          cx.fillRect(0, y + 4 * scale, sz, 2 * scale);
        }
        // Longitudinal wood grain lines
        for (let i = 0; i < sz; i += 8 * scale) {
          cx.fillStyle = Math.random() > 0.5 ? "#707070" : "#c0c0c0";
          cx.fillRect(i, 0, 1.5 * scale, sz);
        }
      }, 4.0);
    }

    if (type === "normal_road_stone") {
      return this.createNormalMap((cx, sz, scale) => {
        cx.fillStyle = "#b0b0b0";
        cx.fillRect(0, 0, sz, sz);
        cx.fillStyle = "#000000";
        const stepY = 64 * scale;
        const stepX = 128 * scale;
        for (let y = 0; y < sz; y += stepY) {
          // Horizontal groove
          cx.fillRect(0, y, sz, 5 * scale);
          for (let x = 0; x < sz; x += stepX) {
            const offsetX = (y / stepY) % 2 === 0 ? 0 : stepX / 2;
            cx.fillRect((x + offsetX) % sz, y, 5 * scale, stepY);
          }
        }
      }, 5.0);
    }

    if (type === "normal_cobblestone") {
      return this.createNormalMap((cx, sz, scale) => {
        cx.fillStyle = "#101010"; // deep recessed grout
        cx.fillRect(0, 0, sz, sz);
        for (let i = 0; i < 40; i++) {
          const x = Math.random() * sz;
          const y = Math.random() * sz;
          const w = (35 + Math.random() * 30) * scale;
          const h = (25 + Math.random() * 25) * scale;
          this.drawWrapped(cx, sz, x, y, Math.max(w, h), (dx, dy) => {
            const grad = cx.createRadialGradient(dx + w / 2, dy + h / 2, 0, dx + w / 2, dy + h / 2, Math.max(w, h) / 2);
            grad.addColorStop(0, "#ffffff");
            grad.addColorStop(0.8, "#a0a0a0");
            grad.addColorStop(1, "#202020");
            cx.fillStyle = grad;
            cx.beginPath();
            cx.roundRect(dx, dy, w, h, 8 * scale);
            cx.fill();
          });
        }
      }, 4.5);
    }

    if (type === "normal_water") {
      return this.createNormalMap((cx, sz, scale) => {
        cx.fillStyle = "#808080";
        cx.fillRect(0, 0, sz, sz);
        // Gentle, smooth wave harmonics
        for (let i = 0; i < 20; i++) {
          const x = Math.random() * sz;
          const y = Math.random() * sz;
          const rad = (40 + Math.random() * 60) * scale;
          this.drawWrapped(cx, sz, x, y, rad, (dx, dy) => {
            const grad = cx.createRadialGradient(dx, dy, 0, dx, dy, rad);
            grad.addColorStop(0, "#a0a0a0");
            grad.addColorStop(0.5, "#757575");
            grad.addColorStop(1, "#808080");
            cx.fillStyle = grad;
            cx.beginPath();
            cx.arc(dx, dy, rad, 0, Math.PI * 2);
            cx.fill();
          });
        }
      }, 1.2);
    }

    const cvs = document.createElement("canvas");
    const sz = this.resolution;
    cvs.width = sz;
    cvs.height = sz;
    const cx = cvs.getContext("2d")!;
    const scale = sz / 512;

    if (type === "particle_sparkle") {
      const center = sz / 2;
      const grad = cx.createRadialGradient(center, center, 0, center, center, center * 0.9);
      grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
      grad.addColorStop(0.3, "rgba(255, 240, 150, 0.8)");
      grad.addColorStop(0.7, "rgba(255, 180, 50, 0.2)");
      grad.addColorStop(1, "rgba(255, 150, 0, 0.0)");
      cx.fillStyle = grad;
      cx.fillRect(0, 0, sz, sz);

      // 4-point diamond cross
      cx.fillStyle = "#ffffff";
      cx.beginPath();
      cx.moveTo(center, 0);
      cx.lineTo(center + 12 * scale, center - 12 * scale);
      cx.lineTo(sz, center);
      cx.lineTo(center + 12 * scale, center + 12 * scale);
      cx.lineTo(center, sz);
      cx.lineTo(center - 12 * scale, center + 12 * scale);
      cx.lineTo(0, center);
      cx.lineTo(center - 12 * scale, center - 12 * scale);
      cx.closePath();
      cx.fill();
    } else if (type === "particle_star") {
      const center = sz / 2;
      cx.fillStyle = "rgba(255, 215, 0, 1.0)";
      cx.beginPath();
      const spikes = 5;
      const outerRadius = sz * 0.45;
      const innerRadius = sz * 0.2;
      let rot = (Math.PI / 2) * 3;
      let x = center;
      let y = center;
      const step = Math.PI / spikes;

      cx.moveTo(center, center - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = center + Math.cos(rot) * outerRadius;
        y = center + Math.sin(rot) * outerRadius;
        cx.lineTo(x, y);
        rot += step;

        x = center + Math.cos(rot) * innerRadius;
        y = center + Math.sin(rot) * innerRadius;
        cx.lineTo(x, y);
        rot += step;
      }
      cx.lineTo(center, center - outerRadius);
      cx.closePath();
      cx.fill();
      cx.strokeStyle = "#ffffff";
      cx.lineWidth = 8 * scale;
      cx.stroke();
    } else if (type === "particle_smoke") {
      const center = sz / 2;
      const grad = cx.createRadialGradient(center, center, 0, center, center, center * 0.85);
      grad.addColorStop(0, "rgba(230, 230, 230, 0.85)");
      grad.addColorStop(0.5, "rgba(180, 180, 180, 0.45)");
      grad.addColorStop(0.8, "rgba(140, 140, 140, 0.15)");
      grad.addColorStop(1, "rgba(100, 100, 100, 0.0)");
      cx.fillStyle = grad;
      cx.beginPath();
      cx.arc(center, center, center * 0.85, 0, Math.PI * 2);
      cx.fill();
    } else if (type === "particle_petal") {
      const center = sz / 2;
      cx.fillStyle = "rgba(244, 114, 182, 0.9)"; // Soft rose/cherry blossom pink
      cx.beginPath();
      cx.moveTo(center, sz * 0.1);
      cx.bezierCurveTo(sz * 0.8, sz * 0.2, sz * 0.9, sz * 0.7, center, sz * 0.9);
      cx.bezierCurveTo(sz * 0.1, sz * 0.7, sz * 0.2, sz * 0.2, center, sz * 0.1);
      cx.closePath();
      cx.fill();
    } else if (type === "particle_sweat") {
      const center = sz / 2;
      cx.fillStyle = "rgba(56, 189, 248, 0.95)";
      cx.beginPath();
      cx.moveTo(center, sz * 0.1);
      cx.bezierCurveTo(sz * 0.8, sz * 0.45, sz * 0.85, sz * 0.85, center, sz * 0.9);
      cx.bezierCurveTo(sz * 0.15, sz * 0.85, sz * 0.2, sz * 0.45, center, sz * 0.1);
      cx.closePath();
      cx.fill();

      // Specular shine highlight
      cx.fillStyle = "rgba(255, 255, 255, 0.85)";
      cx.beginPath();
      cx.arc(center - 12 * scale, center + 8 * scale, 10 * scale, 0, Math.PI * 2);
      cx.fill();
    } else if (type === "particle_dust") {
      const center = sz / 2;
      const grad = cx.createRadialGradient(center, center, 0, center, center, center * 0.85);
      grad.addColorStop(0, "rgba(215, 205, 190, 0.9)");
      grad.addColorStop(0.4, "rgba(195, 180, 160, 0.6)");
      grad.addColorStop(0.75, "rgba(165, 150, 130, 0.2)");
      grad.addColorStop(1, "rgba(140, 125, 105, 0.0)");
      cx.fillStyle = grad;
      cx.beginPath();
      cx.arc(center, center, center * 0.85, 0, Math.PI * 2);
      cx.fill();
    } else if (type === "glow_radial") {
      const center = sz / 2;
      const grad = cx.createRadialGradient(center, center, 0, center, center, center);
      grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
      grad.addColorStop(0.2, "rgba(255, 220, 100, 0.7)");
      grad.addColorStop(0.5, "rgba(255, 160, 0, 0.25)");
      grad.addColorStop(1, "rgba(255, 120, 0, 0)");
      cx.fillStyle = grad;
      cx.fillRect(0, 0, sz, sz);
    } else if (type === "macro_noise") {
      // Very low frequency value noise texture to break repeating grid across distant tiles
      const imgData = cx.createImageData(sz, sz);
      const data = imgData.data;
      for (let y = 0; y < sz; y++) {
        for (let x = 0; x < sz; x++) {
          const nx = (x / sz) * 4;
          const ny = (y / sz) * 4;
          const val =
            Math.sin(nx * Math.PI * 2) * 0.3 +
            Math.cos(ny * Math.PI * 2) * 0.3 +
            Math.sin((nx + ny) * Math.PI) * 0.2 +
            0.5;
          const byteVal = Math.floor(Math.max(0, Math.min(1, val)) * 255);
          const idx = (y * sz + x) * 4;
          data[idx] = byteVal;
          data[idx + 1] = byteVal;
          data[idx + 2] = byteVal;
          data[idx + 3] = 255;
        }
      }
      cx.putImageData(imgData, 0, 0);
    } else if (type === "obstacle_chevron") {
      // High-contrast Jump Bar: Crisp white body with black and amber chevron stripes
      cx.fillStyle = "#ffffff";
      cx.fillRect(0, 0, sz, sz);

      const stripeW = 40 * scale;
      cx.fillStyle = "#1e293b"; // charcoal
      for (let x = -sz; x < sz * 2; x += stripeW * 2) {
        cx.beginPath();
        cx.moveTo(x, 0);
        cx.lineTo(x + stripeW, 0);
        cx.lineTo(x + stripeW - sz * 0.5, sz);
        cx.lineTo(x - sz * 0.5, sz);
        cx.closePath();
        cx.fill();
      }

      cx.fillStyle = "#f59e0b"; // amber accent stripe
      for (let x = -sz + stripeW; x < sz * 2; x += stripeW * 2) {
        cx.beginPath();
        cx.moveTo(x + stripeW * 0.3, 0);
        cx.lineTo(x + stripeW * 0.6, 0);
        cx.lineTo(x + stripeW * 0.6 - sz * 0.5, sz);
        cx.lineTo(x + stripeW * 0.3 - sz * 0.5, sz);
        cx.closePath();
        cx.fill();
      }

      // Top/bottom edge borders
      cx.fillStyle = "#d97706";
      cx.fillRect(0, 0, sz, 8 * scale);
      cx.fillRect(0, sz - 8 * scale, sz, 8 * scale);
    } else if (type === "obstacle_duck_arch") {
      // High arch neon cyan/teal lit gradient
      const grad = cx.createLinearGradient(0, 0, 0, sz);
      grad.addColorStop(0, "#0891b2");
      grad.addColorStop(0.5, "#06b6d4");
      grad.addColorStop(1, "#22d3ee");
      cx.fillStyle = grad;
      cx.fillRect(0, 0, sz, sz);

      cx.fillStyle = "rgba(255, 255, 255, 0.5)";
      cx.fillRect(0, sz * 0.4, sz, sz * 0.2);
    } else if (type === "bump_road_asphalt") {
      cx.fillStyle = "#808080";
      cx.fillRect(0, 0, sz, sz);
      const dots = Math.floor(2000 * scale * scale);
      for (let i = 0; i < dots; i++) {
        const val = Math.floor(Math.random() * 40 + 110);
        cx.fillStyle = `rgb(${val},${val},${val})`;
        const px = Math.random() * sz;
        const py = Math.random() * sz;
        this.drawWrapped(cx, sz, px, py, 3 * scale, (dx, dy) => {
          cx.fillRect(dx, dy, 3 * scale, 3 * scale);
        });
      }
    } else if (type === "bump_road_wood") {
      cx.fillStyle = "#808080";
      cx.fillRect(0, 0, sz, sz);
      const step = 32 * scale;
      for (let y = 0; y < sz; y += step) {
        cx.fillStyle = "#202020";
        cx.fillRect(0, y, sz, 3 * scale);
        cx.fillStyle = "#d0d0d0";
        cx.fillRect(0, y + 3 * scale, sz, 2 * scale);
      }
    } else if (type === "bump_road_stone") {
      cx.fillStyle = "#808080";
      cx.fillRect(0, 0, sz, sz);
      cx.strokeStyle = "#202020";
      cx.lineWidth = 4 * scale;
      const stepY = 64 * scale;
      const stepX = 128 * scale;
      for (let y = 0; y < sz; y += stepY) {
        for (let x = 0; x < sz; x += stepX) {
          const offsetX = (y / stepY) % 2 === 0 ? 0 : stepX / 2;
          cx.strokeRect(x + offsetX + 2, y + 2, stepX - 4, stepY - 4);
        }
      }
    } else if (type === "grass") {
      // Seamless uniform lawn base (NO centered radial gradient to avoid 200-cell vignette grid)
      cx.fillStyle = "#388e3c";
      cx.fillRect(0, 0, sz, sz);

      // Subtle seamless micro-variation speckles
      const speckleCount = Math.floor(250 * scale * scale);
      for (let i = 0; i < speckleCount; i++) {
        const sx = Math.random() * sz;
        const sy = Math.random() * sz;
        cx.fillStyle = Math.random() > 0.5 ? "#2e7d32" : "#43a047";
        this.drawWrapped(cx, sz, sx, sy, 8 * scale, (dx, dy) => {
          cx.beginPath();
          cx.arc(dx, dy, 6 * scale, 0, Math.PI * 2);
          cx.fill();
        });
      }

      // Stylized grass blade clusters with wrapped drawing
      const clusterCount = Math.floor(70 * scale * scale);
      for (let i = 0; i < clusterCount; i++) {
        const cxPos = Math.random() * sz;
        const cyPos = Math.random() * sz;
        const col = Math.random() > 0.4 ? "#81c784" : "#a5d6a7";
        this.drawWrapped(cx, sz, cxPos, cyPos, 14 * scale, (dx, dy) => {
          cx.fillStyle = col;
          for (let b = -2; b <= 2; b++) {
            cx.beginPath();
            cx.ellipse(dx + b * 4 * scale, dy, 2 * scale, 9 * scale, b * 0.2, 0, Math.PI * 2);
            cx.fill();
          }
        });
      }

      // Clustered tiny joyful daisy dots with wrapped drawing
      const flowerClusters = Math.floor(18 * scale * scale);
      for (let i = 0; i < flowerClusters; i++) {
        const fx = Math.random() * sz;
        const fy = Math.random() * sz;
        this.drawWrapped(cx, sz, fx, fy, 10 * scale, (dx, dy) => {
          cx.fillStyle = "#ffffff";
          for (let p = 0; p < 5; p++) {
            const ang = (p / 5) * Math.PI * 2;
            cx.beginPath();
            cx.arc(dx + Math.cos(ang) * 4 * scale, dy + Math.sin(ang) * 4 * scale, 2.5 * scale, 0, Math.PI * 2);
            cx.fill();
          }
          cx.fillStyle = "#fbc02d";
          cx.beginPath();
          cx.arc(dx, dy, 2.5 * scale, 0, Math.PI * 2);
          cx.fill();
        });
      }
    } else if (type === "water") {
      // Seamless deep azure lake base with vibrant translucent ripples
      cx.fillStyle = "#0284c7";
      cx.fillRect(0, 0, sz, sz);

      // Stylized rounded ripple bars with wrapped drawing
      const rippleRows = Math.floor(28 * scale * scale);
      for (let i = 0; i < rippleRows; i++) {
        const col = i % 2 === 0 ? "rgba(56, 189, 248, 0.45)" : "rgba(125, 211, 252, 0.3)";
        const rx = Math.random() * sz;
        const ry = (i / rippleRows) * sz;
        const rw = (45 + Math.random() * 65) * scale;
        const rh = 4 * scale;
        this.drawWrapped(cx, sz, rx, ry, rw, (dx, dy) => {
          cx.fillStyle = col;
          cx.beginPath();
          cx.roundRect(dx, dy, rw, rh, 2);
          cx.fill();
        });
      }
    } else if (type === "jungle") {
      // Seamless lush tropical canopy (no vertical linear gradient)
      cx.fillStyle = "#1b4332";
      cx.fillRect(0, 0, sz, sz);

      // Stylized leaf clusters with wrapped drawing
      const leafClusters = Math.floor(45 * scale * scale);
      for (let i = 0; i < leafClusters; i++) {
        const lx = Math.random() * sz;
        const ly = Math.random() * sz;
        const col = Math.random() > 0.5 ? "#40916c" : "#52b788";
        this.drawWrapped(cx, sz, lx, ly, 25 * scale, (dx, dy) => {
          cx.fillStyle = col;
          for (let l = 0; l < 4; l++) {
            const ang = (l / 4) * Math.PI * 2;
            cx.beginPath();
            cx.ellipse(dx + Math.cos(ang) * 12 * scale, dy + Math.sin(ang) * 12 * scale, 6 * scale, 14 * scale, ang, 0, Math.PI * 2);
            cx.fill();
          }
        });
      }
    } else if (type === "dino_ground") {
      // Seamless prehistoric terrain
      cx.fillStyle = "#713f12";
      cx.fillRect(0, 0, sz, sz);

      // Stylized cracked earth lines with wrapped drawing
      const crackCount = 18;
      for (let i = 0; i < crackCount; i++) {
        const startX = Math.random() * sz;
        const startY = Math.random() * sz;
        const segments: { dx: number; dy: number }[] = [];
        let currX = 0;
        let currY = 0;
        for (let seg = 0; seg < 4; seg++) {
          currX += (Math.random() - 0.5) * 80 * scale;
          currY += (Math.random() - 0.5) * 80 * scale;
          segments.push({ dx: currX, dy: currY });
        }

        this.drawWrapped(cx, sz, startX, startY, 90 * scale, (ox, oy) => {
          cx.strokeStyle = "rgba(40, 15, 5, 0.6)";
          cx.lineWidth = 3 * scale;
          cx.beginPath();
          cx.moveTo(ox, oy);
          for (const s of segments) {
            cx.lineTo(ox + s.dx, oy + s.dy);
          }
          cx.stroke();
        });
      }

      // Warm ochre gravel patches with wrapped drawing
      const gravels = Math.floor(30 * scale * scale);
      for (let i = 0; i < gravels; i++) {
        const gx = Math.random() * sz;
        const gy = Math.random() * sz;
        const col = Math.random() > 0.5 ? "#a16207" : "#ca8a04";
        const rot = Math.random() * Math.PI;
        this.drawWrapped(cx, sz, gx, gy, 8 * scale, (dx, dy) => {
          cx.fillStyle = col;
          cx.beginPath();
          cx.ellipse(dx, dy, 6 * scale, 4 * scale, rot, 0, Math.PI * 2);
          cx.fill();
        });
      }
    } else if (type === "sky_sunset") {
      const grad = cx.createLinearGradient(0, 0, 0, sz);
      grad.addColorStop(0, "#0d0221");
      grad.addColorStop(0.3, "#3d0859");
      grad.addColorStop(0.5, "#b31e3f");
      grad.addColorStop(0.7, "#ea580c");
      grad.addColorStop(0.9, "#facc15");
      grad.addColorStop(1, "#fbbf24");
      cx.fillStyle = grad;
      cx.fillRect(0, 0, sz, sz);

      cx.fillStyle = "white";
      for (let i = 0; i < 120; i++) {
        const x = Math.random() * sz;
        const y = Math.random() * (sz * 0.4);
        const r = Math.random() * 1.5 * scale;
        cx.globalAlpha = Math.random() * 0.9 + 0.1;
        cx.beginPath();
        cx.arc(x, y, r, 0, Math.PI * 2);
        cx.fill();
      }
      cx.globalAlpha = 1.0;
    } else if (type === "sky_dino") {
      const grad = cx.createLinearGradient(0, 0, 0, sz);
      grad.addColorStop(0, "#1a0b2e");
      grad.addColorStop(0.4, "#7c2d12");
      grad.addColorStop(0.7, "#c2410c");
      grad.addColorStop(1, "#f97316");
      cx.fillStyle = grad;
      cx.fillRect(0, 0, sz, sz);
    } else if (type === "road_asphalt") {
      // Clean Red Tartan Track with crisp lane lines
      cx.fillStyle = "#b91c1c";
      cx.fillRect(0, 0, sz, sz);

      // Subtle stylized cross-weave bands
      cx.fillStyle = "rgba(153, 27, 27, 0.5)";
      const bandStep = 64 * scale;
      for (let y = 0; y < sz; y += bandStep) {
        cx.fillRect(0, y, sz, bandStep * 0.5);
      }
      cx.fillStyle = "rgba(239, 68, 68, 0.25)";
      for (let x = 0; x < sz; x += bandStep) {
        cx.fillRect(x, 0, bandStep * 0.5, sz);
      }

      // Crisp White Track Boundaries & Lane Lines
      cx.fillStyle = "rgba(255, 255, 255, 0.95)";
      const laneW = sz / 3;
      cx.fillRect(4 * scale, 0, 8 * scale, sz);
      cx.fillRect(sz - 12 * scale, 0, 8 * scale, sz);
      cx.fillRect(laneW - 4 * scale, 0, 8 * scale, sz);
      cx.fillRect(laneW * 2 - 4 * scale, 0, 8 * scale, sz);
    } else if (type === "road_wood") {
      // Clean Boardwalk Planks
      cx.fillStyle = "#785038";
      cx.fillRect(0, 0, sz, sz);
      const step = 32 * scale;
      for (let y = 0; y < sz; y += step) {
        cx.fillStyle = "#5d3a24";
        cx.fillRect(0, y, sz, 4 * scale);
        cx.fillStyle = "#8d6447";
        cx.fillRect(0, y + 4 * scale, sz, 2 * scale);

        // Brass Nailheads
        cx.fillStyle = "#2b1b17";
        cx.beginPath();
        cx.arc(24 * scale, y + 16 * scale, 3 * scale, 0, Math.PI * 2);
        cx.fill();
        cx.beginPath();
        cx.arc(sz - 24 * scale, y + 16 * scale, 3 * scale, 0, Math.PI * 2);
        cx.fill();
      }
      // Subtle wood grain lines
      cx.fillStyle = "rgba(43, 27, 23, 0.15)";
      for (let i = 0; i < 40; i++) {
        cx.fillRect(Math.random() * sz, Math.random() * sz, 40 * scale, 2 * scale);
      }
    } else if (type === "road_dirt") {
      // Warm Packed Dirt Path
      const g = cx.createLinearGradient(0, 0, sz, 0);
      g.addColorStop(0, "#4e3420");
      g.addColorStop(0.1, "#6d4c33");
      g.addColorStop(0.9, "#6d4c33");
      g.addColorStop(1, "#4e3420");
      cx.fillStyle = g;
      cx.fillRect(0, 0, sz, sz);

      // Stylized lane tire/foot grooves
      const laneW = sz / 3;
      cx.fillStyle = "rgba(0, 0, 0, 0.14)";
      for (let i = 0; i < 3; i++) {
        cx.fillRect(laneW * i + laneW / 2 - 25 * scale, 0, 50 * scale, sz);
      }

      // Smooth pebble clusters with wrapped drawing
      for (let i = 0; i < 35; i++) {
        const px = Math.random() * sz;
        const py = Math.random() * sz;
        const col = Math.random() > 0.5 ? "rgba(93, 64, 55, 0.7)" : "rgba(141, 110, 99, 0.6)";
        const rot = Math.random() * Math.PI;
        this.drawWrapped(cx, sz, px, py, 6 * scale, (dx, dy) => {
          cx.fillStyle = col;
          cx.beginPath();
          cx.ellipse(dx, dy, 5 * scale, 3 * scale, rot, 0, Math.PI * 2);
          cx.fill();
        });
      }
    } else if (type === "road_stone") {
      // Stylized Stone Flagstones
      cx.fillStyle = "#78716c";
      cx.fillRect(0, 0, sz, sz);
      cx.strokeStyle = "#44403c";
      cx.lineWidth = 4 * scale;
      const stepY = 64 * scale;
      const stepX = 128 * scale;
      for (let y = 0; y < sz; y += stepY) {
        for (let x = 0; x < sz; x += stepX) {
          const offsetX = (y / stepY) % 2 === 0 ? 0 : stepX / 2;
          cx.fillStyle = ((x + y) / stepY) % 2 === 0 ? "#a8a29e" : "#57534e";
          cx.fillRect(x + offsetX + 2, y + 2, stepX - 4, stepY - 4);
          cx.strokeRect(x + offsetX + 2, y + 2, stepX - 4, stepY - 4);
        }
      }
    } else if (type === "cobblestone") {
      cx.fillStyle = "#757575";
      cx.fillRect(0, 0, sz, sz);
      cx.strokeStyle = "#424242";
      cx.lineWidth = 3 * scale;
      for (let i = 0; i < 35; i++) {
        const x = Math.random() * sz;
        const y = Math.random() * sz;
        const w = (35 + Math.random() * 35) * scale;
        const h = (25 + Math.random() * 25) * scale;
        const col = Math.random() > 0.5 ? "#9e9e9e" : "#616161";
        this.drawWrapped(cx, sz, x, y, Math.max(w, h), (dx, dy) => {
          cx.fillStyle = col;
          cx.fillRect(dx, dy, w, h);
          cx.strokeRect(dx, dy, w, h);
        });
      }
    } else if (type === "rose") {
      cx.fillStyle = "#2e7d32";
      cx.fillRect(0, 0, sz, sz);
      cx.fillStyle = "#e11d48";
      for (let i = 0; i < 50; i++) {
        const rx = Math.random() * sz;
        const ry = Math.random() * sz;
        this.drawWrapped(cx, sz, rx, ry, 12 * scale, (dx, dy) => {
          cx.beginPath();
          cx.arc(dx, dy, 10 * scale, 0, Math.PI * 2);
          cx.fill();
        });
      }
    } else if (type === "dress") {
      // Kaleshi Diva Signature Sunflower Chic
      cx.fillStyle = "#fbc02d";
      cx.fillRect(0, 0, sz, sz);

      // Subtle vertical pleated dress stripe sheen
      const stripeW = 24 * scale;
      cx.fillStyle = "rgba(245, 124, 0, 0.15)";
      for (let x = 0; x < sz; x += stripeW * 2) {
        cx.fillRect(x, 0, stripeW, sz);
      }

      // Stylized embroidered sunflowers
      const flowers = 14;
      for (let i = 0; i < flowers; i++) {
        const fx = ((i * 137.5) % sz) + (i % 3) * 15 * scale;
        const fy = ((i * 89.3) % sz) + (i % 2) * 20 * scale;
        this.drawWrapped(cx, sz, fx, fy, 24 * scale, (dx, dy) => {
          // Petals
          cx.fillStyle = "#f59e0b";
          for (let p = 0; p < 8; p++) {
            const ang = (p / 8) * Math.PI * 2;
            cx.beginPath();
            cx.ellipse(
              dx + Math.cos(ang) * 12 * scale,
              dy + Math.sin(ang) * 12 * scale,
              4 * scale,
              10 * scale,
              ang,
              0,
              Math.PI * 2
            );
            cx.fill();
          }
          // Center Seed Disc
          cx.fillStyle = "#451a03";
          cx.beginPath();
          cx.arc(dx, dy, 7 * scale, 0, Math.PI * 2);
          cx.fill();

          // Golden sparkle center dots
          cx.fillStyle = "#fbbf24";
          cx.beginPath();
          cx.arc(dx - 2 * scale, dy - 2 * scale, 2 * scale, 0, Math.PI * 2);
          cx.fill();
        });
      }

      // Bottom Brocade Border & Golden Lace Trim
      cx.fillStyle = "#b45309";
      cx.fillRect(0, sz - 32 * scale, sz, 32 * scale);
      cx.fillStyle = "#fef08a";
      for (let x = 0; x < sz; x += 16 * scale) {
        cx.beginPath();
        cx.moveTo(x, sz - 32 * scale);
        cx.lineTo(x + 8 * scale, sz - 16 * scale);
        cx.lineTo(x + 16 * scale, sz - 32 * scale);
        cx.closePath();
        cx.fill();
      }
    } else if (type === "dress_dino") {
      // Dino Explorer Outfit
      cx.fillStyle = "#059669";
      cx.fillRect(0, 0, sz, sz);

      // Prehistoric scale hexagon grid
      cx.strokeStyle = "rgba(4, 120, 87, 0.4)";
      cx.lineWidth = 3 * scale;
      const step = 48 * scale;
      for (let y = 0; y < sz; y += step) {
        for (let x = 0; x < sz; x += step) {
          const off = (y / step) % 2 === 0 ? 0 : step / 2;
          cx.strokeRect(x + off, y, step, step);
        }
      }

      // Mini cute dino footprint tracks
      for (let i = 0; i < 12; i++) {
        const px = (i * 97) % sz;
        const py = (i * 123) % sz;
        this.drawWrapped(cx, sz, px, py, 18 * scale, (dx, dy) => {
          cx.fillStyle = "#047857";
          cx.beginPath();
          cx.arc(dx, dy, 6 * scale, 0, Math.PI * 2);
          cx.fill();
          cx.beginPath();
          cx.arc(dx - 5 * scale, dy - 6 * scale, 3 * scale, 0, Math.PI * 2);
          cx.arc(dx, dy - 8 * scale, 3 * scale, 0, Math.PI * 2);
          cx.arc(dx + 5 * scale, dy - 6 * scale, 3 * scale, 0, Math.PI * 2);
          cx.fill();
        });
      }

      // Neon lime adventure trim
      cx.fillStyle = "#a3e635";
      cx.fillRect(0, sz - 18 * scale, sz, 18 * scale);
    } else if (type === "gambhir_hoodie") {
      // Gambhir Streetwear Soft Baby Pink Hoodie
      const grad = cx.createLinearGradient(0, 0, sz, sz);
      grad.addColorStop(0, "#fce7f3"); // Soft pastel baby pink
      grad.addColorStop(0.5, "#fbcfe8");
      grad.addColorStop(1, "#f472b6"); // Blush rose
      cx.fillStyle = grad;
      cx.fillRect(0, 0, sz, sz);

      // Kangaroo front pocket curve in rich rose pink & white stitch
      cx.fillStyle = "#f472b6";
      cx.beginPath();
      cx.roundRect(sz * 0.15, sz * 0.45, sz * 0.7, sz * 0.45, [16 * scale, 16 * scale, 0, 0]);
      cx.fill();

      cx.strokeStyle = "#ffffff";
      cx.lineWidth = 3 * scale;
      cx.stroke();

      // White drawstring cords
      cx.strokeStyle = "#ffffff";
      cx.lineWidth = 4 * scale;
      cx.beginPath();
      cx.moveTo(sz * 0.4, 0);
      cx.lineTo(sz * 0.4, sz * 0.35);
      cx.moveTo(sz * 0.6, 0);
      cx.lineTo(sz * 0.6, sz * 0.35);
      cx.stroke();

      // Rose-gold aglets
      cx.fillStyle = "#f43f5e";
      cx.fillRect(sz * 0.38, sz * 0.33, 4 * scale, 8 * scale);
      cx.fillRect(sz * 0.58, sz * 0.33, 4 * scale, 8 * scale);

      // Cute Gold & Pink Streetwear Chest Badge
      const bx = sz * 0.5;
      const by = sz * 0.22;
      cx.fillStyle = "#fbbf24";
      cx.beginPath();
      cx.arc(bx, by, 20 * scale, 0, Math.PI * 2);
      cx.fill();
      cx.fillStyle = "#e11d48";
      cx.font = `900 ${14 * scale}px sans-serif`;
      cx.textAlign = "center";
      cx.textBaseline = "middle";
      cx.fillText("💖", bx, by);
    } else if (type === "gambhir_denim") {
      // Gambhir Crisp White Joggers
      cx.fillStyle = "#ffffff";
      cx.fillRect(0, 0, sz, sz);

      // Subtle fine diagonal weave texture
      cx.strokeStyle = "rgba(241, 245, 249, 0.8)";
      cx.lineWidth = 2 * scale;
      for (let i = -sz; i < sz * 2; i += 12 * scale) {
        cx.beginPath();
        cx.moveTo(i, 0);
        cx.lineTo(i + sz, sz);
        cx.stroke();
      }

      // Soft light-silver & blush double-stitched pocket & knee seams
      cx.strokeStyle = "#e2e8f0";
      cx.lineWidth = 3 * scale;
      cx.strokeRect(sz * 0.1, sz * 0.2, sz * 0.35, sz * 0.4);
      cx.strokeRect(sz * 0.55, sz * 0.2, sz * 0.35, sz * 0.4);

      // Knee reinforcement line in soft blush
      cx.strokeStyle = "#fbcfe8";
      cx.beginPath();
      cx.moveTo(0, sz * 0.65);
      cx.lineTo(sz, sz * 0.65);
      cx.stroke();
    } else if (type === "sneaker_diva") {
      // Diva Chic Running Sneaker
      cx.fillStyle = "#ffffff";
      cx.fillRect(0, 0, sz, sz);

      // Metallic gold and hot pink speed swooshes
      cx.fillStyle = "#ec4899";
      cx.beginPath();
      cx.moveTo(0, sz * 0.3);
      cx.bezierCurveTo(sz * 0.5, sz * 0.15, sz * 0.7, sz * 0.6, sz, sz * 0.4);
      cx.lineTo(sz, sz * 0.6);
      cx.bezierCurveTo(sz * 0.7, sz * 0.8, sz * 0.4, sz * 0.4, 0, sz * 0.5);
      cx.closePath();
      cx.fill();

      cx.fillStyle = "#eab308";
      cx.fillRect(0, sz * 0.8, sz, sz * 0.15);

      // Black tread lines
      cx.fillStyle = "#1e293b";
      for (let x = 0; x < sz; x += 32 * scale) {
        cx.fillRect(x, sz * 0.95, 16 * scale, sz * 0.05);
      }
    } else if (type === "sneaker_gambhir") {
      // Gambhir Clean All-White Chunky Streetwear Sneaker
      cx.fillStyle = "#ffffff";
      cx.fillRect(0, 0, sz, sz);

      // Subtle light-silver side panel accents
      cx.fillStyle = "#f8fafc";
      cx.fillRect(0, sz * 0.25, sz, sz * 0.4);
      cx.strokeStyle = "#e2e8f0";
      cx.lineWidth = 3 * scale;
      cx.strokeRect(0, sz * 0.25, sz, sz * 0.4);

      // Pastel Baby Pink heel tab
      cx.fillStyle = "#fbcfe8";
      cx.fillRect(0, sz * 0.1, sz * 0.35, sz * 0.25);

      // Clean Light Gray rubber tread sole
      cx.fillStyle = "#cbd5e1";
      cx.fillRect(0, sz * 0.88, sz, sz * 0.12);
      for (let x = 0; x < sz; x += 28 * scale) {
        cx.fillStyle = "#94a3b8";
        cx.fillRect(x, sz * 0.94, 14 * scale, sz * 0.06);
      }
    } else if (
      type === "speech_bubble_suno" ||
      type === "speech_bubble_wait" ||
      type === "speech_bubble_flowers" ||
      type === "speech_bubble_yawrrrrr"
    ) {
      // Stylized Comic Speech Bubble
      const pad = 18 * scale;
      const bw = sz - pad * 2;
      const bh = sz * 0.72;

      // Drop shadow
      cx.fillStyle = "rgba(0, 0, 0, 0.4)";
      cx.beginPath();
      cx.roundRect(pad + 10 * scale, pad + 10 * scale, bw, bh, 32 * scale);
      cx.fill();

      // Bubble Body (Warm off-white to prevent bloom overglow)
      cx.fillStyle = "#fffbf0";
      cx.beginPath();
      cx.roundRect(pad, pad, bw, bh, 32 * scale);
      cx.fill();

      // Tail pointer
      cx.fillStyle = "#fffbf0";
      cx.beginPath();
      cx.moveTo(sz * 0.5 - 24 * scale, pad + bh - 2 * scale);
      cx.lineTo(sz * 0.5, pad + bh + 36 * scale);
      cx.lineTo(sz * 0.5 + 24 * scale, pad + bh - 2 * scale);
      cx.closePath();
      cx.fill();

      // Comic Ink Border
      cx.strokeStyle = "#0f172a";
      cx.lineWidth = 12 * scale;
      cx.lineJoin = "round";
      cx.beginPath();
      cx.roundRect(pad, pad, bw, bh, 32 * scale);
      cx.stroke();

      // Tail border
      cx.beginPath();
      cx.moveTo(sz * 0.5 - 24 * scale, pad + bh - 4 * scale);
      cx.lineTo(sz * 0.5, pad + bh + 36 * scale);
      cx.lineTo(sz * 0.5 + 24 * scale, pad + bh - 4 * scale);
      cx.stroke();

      // Inner patch to clear border between bubble and tail
      cx.fillStyle = "#fffbf0";
      cx.fillRect(sz * 0.5 - 20 * scale, pad + bh - 8 * scale, 40 * scale, 12 * scale);

      cx.textAlign = "center";
      cx.textBaseline = "middle";

      if (type === "speech_bubble_suno") {
        cx.fillStyle = "#0f172a";
        cx.font = `900 ${52 * scale}px "Arial Black", Impact, sans-serif`;
        cx.fillText("Suno toh! 😭", sz * 0.5, pad + bh * 0.38);

        cx.fillStyle = "#e11d48";
        cx.font = `800 ${32 * scale}px system-ui, -apple-system, sans-serif`;
        cx.fillText("Ruk jao Diva!", sz * 0.5, pad + bh * 0.72);
      } else if (type === "speech_bubble_wait") {
        cx.fillStyle = "#0f172a";
        cx.font = `900 ${50 * scale}px "Arial Black", Impact, sans-serif`;
        cx.fillText("Wait up! 🏃‍♂️", sz * 0.5, pad + bh * 0.38);

        cx.fillStyle = "#2563eb";
        cx.font = `800 ${32 * scale}px system-ui, -apple-system, sans-serif`;
        cx.fillText("Ek minute suno!", sz * 0.5, pad + bh * 0.72);
      } else if (type === "speech_bubble_flowers") {
        cx.fillStyle = "#0f172a";
        cx.font = `900 ${48 * scale}px "Arial Black", Impact, sans-serif`;
        cx.fillText("Got flowers! 🌻", sz * 0.5, pad + bh * 0.38);

        cx.fillStyle = "#d97706";
        cx.font = `800 ${30 * scale}px system-ui, -apple-system, sans-serif`;
        cx.fillText("Special for you 💖", sz * 0.5, pad + bh * 0.72);
      } else {
        cx.fillStyle = "#0f172a";
        cx.font = `900 ${50 * scale}px "Arial Black", Impact, sans-serif`;
        cx.fillText("Yawrrrrr 😭", sz * 0.5, pad + bh * 0.38);

        cx.fillStyle = "#db2777";
        cx.font = `800 ${32 * scale}px system-ui, -apple-system, sans-serif`;
        cx.fillText("Plezzzzzz", sz * 0.5, pad + bh * 0.72);
      }
    } else if (type === "wood") {
      cx.fillStyle = "#8d6e63";
      cx.fillRect(0, 0, sz, sz);
      cx.fillStyle = "#5d4037";
      for (let i = 0; i < sz; i += 12 * scale) cx.fillRect(i, 0, 2.5 * scale, sz);
    } else if (type === "leaf") {
      cx.fillStyle = "#2e7d32";
      cx.fillRect(0, 0, sz, sz);
      cx.fillStyle = "#1b5e20";
      for (let i = 0; i < 40; i++) {
        const lx = Math.random() * sz;
        const ly = Math.random() * sz;
        this.drawWrapped(cx, sz, lx, ly, 12 * scale, (dx, dy) => {
          cx.fillRect(dx, dy, 10 * scale, 10 * scale);
        });
      }
    }

    const tex = new THREE.CanvasTexture(cvs);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    return tex;
  }

  public static disposeAll(): void {
    for (const tex of this.cache.values()) {
      tex.dispose();
    }
    this.cache.clear();
  }
}
