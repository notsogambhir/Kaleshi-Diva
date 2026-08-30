import { TextureType } from "../TextureGenerator";

export type BiomeType = "park" | "lake" | "sunset" | "dino";

export interface BiomeConfig {
  id: BiomeType;
  name: string;
  groundTexture: TextureType;
  roadTexture: TextureType;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  skyColor: number;
  hasWalls: boolean;
  hasSkySphere: boolean;
  hasSun: boolean;
  ambientColor: number;
  ambientIntensity: number;
  directionalColor: number;
  directionalIntensity: number;
}

export const BIOMES: Record<BiomeType, BiomeConfig> = {
  park: {
    id: "park",
    name: "Sunflower Park",
    groundTexture: "grass",
    roadTexture: "road_asphalt",
    fogColor: 0x90caf9,
    fogNear: 35,
    fogFar: 120,
    skyColor: 0x90caf9,
    hasWalls: false,
    hasSkySphere: false,
    hasSun: false,
    ambientColor: 0xfff8f0,
    ambientIntensity: 0.85,
    directionalColor: 0xfffbeb,
    directionalIntensity: 0.85,
  },
  lake: {
    id: "lake",
    name: "Lotus Lake",
    groundTexture: "water",
    roadTexture: "road_wood",
    fogColor: 0xb3e5fc,
    fogNear: 35,
    fogFar: 120,
    skyColor: 0xb3e5fc,
    hasWalls: true,
    hasSkySphere: false,
    hasSun: false,
    ambientColor: 0xe1f5fe,
    ambientIntensity: 0.85,
    directionalColor: 0xffffff,
    directionalIntensity: 0.8,
  },
  sunset: {
    id: "sunset",
    name: "Golden Sunset",
    groundTexture: "jungle",
    roadTexture: "road_dirt",
    fogColor: 0xff8a65,
    fogNear: 28,
    fogFar: 110,
    skyColor: 0xff7043,
    hasWalls: false,
    hasSkySphere: true,
    hasSun: true,
    ambientColor: 0xffe0b2,
    ambientIntensity: 0.85,
    directionalColor: 0xffb74d,
    directionalIntensity: 0.9,
  },
  dino: {
    id: "dino",
    name: "Dino Valley",
    groundTexture: "dino_ground",
    roadTexture: "road_stone",
    fogColor: 0xf4511e,
    fogNear: 28,
    fogFar: 105,
    skyColor: 0xbf360c,
    hasWalls: false,
    hasSkySphere: true,
    hasSun: true,
    ambientColor: 0xffccbc,
    ambientIntensity: 0.85,
    directionalColor: 0xff8a65,
    directionalIntensity: 0.9,
  },
};

export const BIOME_SEQUENCE: BiomeType[] = ["park", "lake", "sunset", "dino"];
export const DISTANCE_PER_BIOME = 300; // Switch biome every 300 metres
