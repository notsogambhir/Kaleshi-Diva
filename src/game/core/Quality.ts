export type QualityTier = "low" | "medium" | "high";

export interface QualitySettings {
  tier: QualityTier;
  pixelRatio: number;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  maxAnisotropy: number;
  particleBudget: number;
  glowSpritesEnabled: boolean;
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  postEffectsEnabled: boolean;
  weatherParticlesEnabled: boolean;
  normalMapsEnabled: boolean;
  environmentMapIntensity: number;
}

export class QualityManager {
  public static detectQuality(): QualitySettings {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const hardwareConcurrency = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;

    let tier: QualityTier = "medium";

    if (isMobile) {
      tier = hardwareConcurrency <= 4 ? "low" : "medium";
    } else {
      tier = hardwareConcurrency >= 8 ? "high" : "medium";
    }

    return this.getSettingsForTier(tier, dpr);
  }

  public static getSettingsForTier(tier: QualityTier, dpr = 1): QualitySettings {
    switch (tier) {
      case "low":
        return {
          tier: "low",
          pixelRatio: Math.min(dpr, 1.25),
          shadowsEnabled: false,
          shadowMapSize: 512,
          maxAnisotropy: 2,
          particleBudget: 35,
          glowSpritesEnabled: false,
          bloomEnabled: false,
          bloomStrength: 0,
          bloomRadius: 0,
          bloomThreshold: 1.0,
          postEffectsEnabled: false,
          weatherParticlesEnabled: false,
          normalMapsEnabled: false,
          environmentMapIntensity: 0.25,
        };
      case "medium":
        return {
          tier: "medium",
          pixelRatio: Math.min(dpr, 1.75),
          shadowsEnabled: true,
          shadowMapSize: 1024,
          maxAnisotropy: 4,
          particleBudget: 80,
          glowSpritesEnabled: true,
          bloomEnabled: true,
          bloomStrength: 0.35,
          bloomRadius: 0.25,
          bloomThreshold: 0.94,
          postEffectsEnabled: true,
          weatherParticlesEnabled: true,
          normalMapsEnabled: true,
          environmentMapIntensity: 0.3,
        };
      case "high":
        return {
          tier: "high",
          pixelRatio: Math.min(dpr, 2),
          shadowsEnabled: true,
          shadowMapSize: 2048,
          maxAnisotropy: 16,
          particleBudget: 150,
          glowSpritesEnabled: true,
          bloomEnabled: true,
          bloomStrength: 0.45,
          bloomRadius: 0.3,
          bloomThreshold: 0.92,
          postEffectsEnabled: true,
          weatherParticlesEnabled: true,
          normalMapsEnabled: true,
          environmentMapIntensity: 0.35,
        };
    }
  }
}
