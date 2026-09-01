import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { QualitySettings } from "./Quality";

interface CustomShaderPassDef {
  name: string;
  uniforms: { [key: string]: THREE.IUniform };
  vertexShader: string;
  fragmentShader: string;
}

const ScreenEffectsShader: CustomShaderPassDef = {
  name: "ScreenEffectsShader",
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    vignetteStrength: { value: 0.3 },
    chromaticAberration: { value: 0.0 },
    speedBlur: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float vignetteStrength;
    uniform float chromaticAberration;
    uniform float speedBlur;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      vec2 center = vec2(0.5, 0.5);
      vec2 toCenter = uv - center;
      float dist = length(toCenter);

      vec4 color = vec4(0.0);

      if (speedBlur > 0.01) {
        const int SAMPLES = 6;
        float blurAmount = speedBlur * 0.035;
        for (int i = 0; i < SAMPLES; i++) {
          float scale = 1.0 - blurAmount * (float(i) / float(SAMPLES - 1)) * dist;
          vec2 sampleUv = center + toCenter * scale;
          color += texture2D(tDiffuse, sampleUv);
        }
        color /= float(SAMPLES);
      } else if (chromaticAberration > 0.005) {
        float caOffset = chromaticAberration * 0.007 * dist;
        float r = texture2D(tDiffuse, uv - toCenter * caOffset).r;
        float g = texture2D(tDiffuse, uv).g;
        float b = texture2D(tDiffuse, uv + toCenter * caOffset).b;
        color = vec4(r, g, b, 1.0);
      } else {
        color = texture2D(tDiffuse, uv);
      }

      if (vignetteStrength > 0.01) {
        float vignette = smoothstep(0.85, 0.25, dist * (0.95 + vignetteStrength * 0.5));
        color.rgb = mix(color.rgb * 0.4, color.rgb, vignette);
      }

      gl_FragColor = color;
    }
  `,
};

export class PostProcessingPipeline {
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass | null = null;
  private screenEffectsPass: ShaderPass | null = null;
  private outputPass: OutputPass;

  public isEnabled = true;
  public quality: QualitySettings;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    quality: QualitySettings
  ) {
    this.quality = quality;
    this.isEnabled = quality.tier !== "low" && (quality.bloomEnabled || quality.postEffectsEnabled);

    // Create Composer with matching render target
    const size = new THREE.Vector2();
    renderer.getSize(size);
    const pixelRatio = renderer.getPixelRatio();

    const renderTarget = new THREE.WebGLRenderTarget(
      Math.floor(size.x * pixelRatio),
      Math.floor(size.y * pixelRatio),
      {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        samples: quality.tier === "high" ? 4 : 0,
      }
    );

    this.composer = new EffectComposer(renderer, renderTarget);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(size.x, size.y);

    // 1. Scene Render Pass
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // 2. Selective Unreal Bloom Pass
    if (quality.bloomEnabled) {
      const bloomRes = new THREE.Vector2(
        Math.floor(size.x * (quality.tier === "high" ? 0.5 : 0.25)),
        Math.floor(size.y * (quality.tier === "high" ? 0.5 : 0.25))
      );
      this.bloomPass = new UnrealBloomPass(
        bloomRes,
        quality.bloomStrength,
        quality.bloomRadius,
        quality.bloomThreshold
      );
      this.composer.addPass(this.bloomPass);
    }

    // 3. Screen Effects Pass (Vignette, Speed Blur, Chromatic Aberration)
    if (quality.postEffectsEnabled) {
      this.screenEffectsPass = new ShaderPass(ScreenEffectsShader);
      this.screenEffectsPass.uniforms.resolution.value.set(size.x, size.y);
      this.composer.addPass(this.screenEffectsPass);
    }

    // 4. Final Output Pass (Tone Mapping & Color Space)
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  public setSpeedBlur(intensity: number): void {
    if (this.screenEffectsPass) {
      this.screenEffectsPass.uniforms.speedBlur.value = intensity;
    }
  }

  public setChromaticAberration(intensity: number): void {
    if (this.screenEffectsPass) {
      this.screenEffectsPass.uniforms.chromaticAberration.value = intensity;
    }
  }

  public setVignette(intensity: number): void {
    if (this.screenEffectsPass) {
      this.screenEffectsPass.uniforms.vignetteStrength.value = intensity;
    }
  }

  public setQuality(quality: QualitySettings, width: number, height: number): void {
    this.quality = quality;
    this.isEnabled = quality.tier !== "low" && (quality.bloomEnabled || quality.postEffectsEnabled);

    if (this.bloomPass) {
      this.bloomPass.enabled = quality.bloomEnabled;
      this.bloomPass.strength = quality.bloomStrength;
      this.bloomPass.radius = quality.bloomRadius;
      this.bloomPass.threshold = quality.bloomThreshold;
    }

    if (this.screenEffectsPass) {
      this.screenEffectsPass.enabled = quality.postEffectsEnabled;
      this.screenEffectsPass.uniforms.resolution.value.set(width, height);
    }

    this.setSize(width, height);
  }

  public setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    if (this.screenEffectsPass) {
      this.screenEffectsPass.uniforms.resolution.value.set(width, height);
    }
  }

  public render(): void {
    this.composer.render();
  }

  public dispose(): void {
    if (this.bloomPass) this.bloomPass.dispose();
    if (this.screenEffectsPass) this.screenEffectsPass.dispose();
    this.outputPass.dispose();
    this.composer.renderTarget1.dispose();
    this.composer.renderTarget2.dispose();
  }
}
