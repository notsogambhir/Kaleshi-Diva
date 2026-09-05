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
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
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
    ambientIntensity: 0.55,
    directionalColor: 0xfffbeb,
    directionalIntensity: 1.1,
    hemiSkyColor: 0x90caf9,
    hemiGroundColor: 0xffe0b2,
    hemiIntensity: 0.35,
  },
  lake: {
    id: "lake",
    name: "Sukhna Lake",
    groundTexture: "water",
    roadTexture: "road_wood",
    fogColor: 0x7dd3fc,
    fogNear: 40,
    fogFar: 130,
    skyColor: 0x7dd3fc,
    hasWalls: true,
    hasSkySphere: false,
    hasSun: false,
    ambientColor: 0xbae6fd,
    ambientIntensity: 0.55,
    directionalColor: 0xfffaed,
    directionalIntensity: 1.1,
    hemiSkyColor: 0x7dd3fc,
    hemiGroundColor: 0x38bdf8,
    hemiIntensity: 0.35,
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
    ambientIntensity: 0.55,
    directionalColor: 0xffb74d,
    directionalIntensity: 1.15,
    hemiSkyColor: 0xff8a65,
    hemiGroundColor: 0x8d4f2a,
    hemiIntensity: 0.35,
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
    ambientIntensity: 0.55,
    directionalColor: 0xff8a65,
    directionalIntensity: 1.15,
    hemiSkyColor: 0xd84315,
    hemiGroundColor: 0x5d4037,
    hemiIntensity: 0.35,
  },
};

export const BIOME_SEQUENCE: BiomeType[] = ["park", "lake", "sunset", "dino"];
export const DISTANCE_PER_BIOME = 300; // Switch biome every 300 metres
