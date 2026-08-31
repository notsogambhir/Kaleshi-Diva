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
  | "wood"
  | "leaf"
  | "glow_radial"
  | "obstacle_chevron"
  | "obstacle_duck_arch"
  | "bump_road_asphalt"
  | "bump_road_wood"
  | "bump_road_stone"
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
      "obstacle_chevron",
      "obstacle_duck_arch",
      "dress",
      "dress_dino",
      "road_asphalt",
      "bump_road_asphalt",
      "grass",
      "road_wood",
      "bump_road_wood",
      "water",
      "road_dirt",
      "jungle",
      "sky_sunset",
      "road_stone",
      "bump_road_stone",
      "dino_ground",
      "sky_dino",
      "cobblestone",
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

  public static createTexture(type: TextureType): THREE.Texture {
    const cvs = document.createElement("canvas");
    const sz = this.resolution;
    cvs.width = sz;
    cvs.height = sz;
    const cx = cvs.getContext("2d")!;
    const scale = sz / 512;

    if (type === "glow_radial") {
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
      // Seamless crystal lake base (uniform base tone with subtle depth, no linear vertical banding)
      cx.fillStyle = "#0096c7";
      cx.fillRect(0, 0, sz, sz);

      // Stylized rounded ripple bars with wrapped drawing
      const rippleRows = Math.floor(24 * scale * scale);
      for (let i = 0; i < rippleRows; i++) {
        const col = i % 2 === 0 ? "rgba(202, 240, 248, 0.4)" : "rgba(144, 224, 239, 0.3)";
        const rx = Math.random() * sz;
        const ry = (i / rippleRows) * sz;
        const rw = (40 + Math.random() * 60) * scale;
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
      cx.fillStyle = "#ffd54f";
      cx.fillRect(0, 0, sz, sz);
      cx.fillStyle = "#f57c00";
      for (let i = 0; i < 50; i++) {
        cx.beginPath();
        cx.arc(Math.random() * sz, Math.random() * sz, 8 * scale, 0, Math.PI * 2);
        cx.fill();
      }
    } else if (type === "dress_dino") {
      cx.fillStyle = "#22c55e";
      cx.fillRect(0, 0, sz, sz);
      cx.fillStyle = "#15803d";
      for (let i = 0; i < 40; i++) {
        cx.beginPath();
        cx.arc(Math.random() * sz, Math.random() * sz, 9 * scale, 0, Math.PI * 2);
        cx.fill();
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
