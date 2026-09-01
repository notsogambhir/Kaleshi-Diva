import * as THREE from "three";
import { BiomeType } from "../world/Biomes";

export class EnvironmentMapGenerator {
  private static cache: Map<BiomeType, THREE.Texture> = new Map();
  private static pmremGenerator: THREE.PMREMGenerator | null = null;

  public static getEnvironmentMap(
    renderer: THREE.WebGLRenderer,
    biome: BiomeType
  ): THREE.Texture {
    if (this.cache.has(biome)) {
      return this.cache.get(biome)!;
    }

    if (!this.pmremGenerator) {
      this.pmremGenerator = new THREE.PMREMGenerator(renderer);
      this.pmremGenerator.compileEquirectangularShader();
    }

    const envTex = this.createGradientEnvironment(biome);
    const renderTarget = this.pmremGenerator.fromEquirectangular(envTex);
    const pmremTexture = renderTarget.texture;

    envTex.dispose();
    this.cache.set(biome, pmremTexture);
    return pmremTexture;
  }

  private static createGradientEnvironment(biome: BiomeType): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);

    switch (biome) {
      case "park":
        grad.addColorStop(0.0, "#42a5f5"); // Rich Sky Blue
        grad.addColorStop(0.45, "#e3f2fd"); // Soft Horizon
        grad.addColorStop(0.5, "#fff9c4"); // Golden Sun Haze
        grad.addColorStop(0.55, "#c8e6c9"); // Fresh Grass Bounce
        grad.addColorStop(1.0, "#43a047"); // Ground Green
        break;

      case "lake":
        grad.addColorStop(0.0, "#29b6f6"); // Azure Sky
        grad.addColorStop(0.45, "#e1f5fe"); // Bright Horizon
        grad.addColorStop(0.5, "#ffffff"); // Specular Water Glint
        grad.addColorStop(0.55, "#b2ebf2"); // Cyan Water Bounce
        grad.addColorStop(1.0, "#00838f"); // Deep Turquoise
        break;

      case "sunset":
        grad.addColorStop(0.0, "#ab47bc"); // Dusk Purple
        grad.addColorStop(0.35, "#ff7043"); // Sunset Coral
        grad.addColorStop(0.5, "#ffca28"); // Blazing Amber Sun
        grad.addColorStop(0.65, "#d84315"); // Warm Terracotta Ground
        grad.addColorStop(1.0, "#4e342e"); // Deep Earth
        break;

      case "dino":
        grad.addColorStop(0.0, "#880e4f"); // Volcanic Plum
        grad.addColorStop(0.35, "#e64a19"); // Lava Orange
        grad.addColorStop(0.5, "#ffd54f"); // Fiery Glow
        grad.addColorStop(0.6, "#bf360c"); // Rust Rock
        grad.addColorStop(1.0, "#212121"); // Volcanic Basalt
        break;
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add a soft sun specular spot in equirectangular coordinates
    const sunX = canvas.width * 0.5;
    const sunY = canvas.height * 0.42;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 32);
    sunGrad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
    sunGrad.addColorStop(0.3, "rgba(255, 240, 180, 0.8)");
    sunGrad.addColorStop(0.7, "rgba(255, 200, 100, 0.2)");
    sunGrad.addColorStop(1.0, "rgba(255, 200, 100, 0.0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.needsUpdate = true;
    return tex;
  }

  public static dispose(): void {
    this.cache.forEach((tex) => tex.dispose());
    this.cache.clear();
    if (this.pmremGenerator) {
      this.pmremGenerator.dispose();
      this.pmremGenerator = null;
    }
  }
}
