import * as THREE from "three";

export const CURVE_STRENGTH = 0.0009;

/**
 * Injects curved world vertex shader logic into any Three.js material.
 * Displaces vertices downwards in view space as depth (-mvPosition.z) increases.
 * This guarantees that rotated meshes (like road/ground planes) and upright meshes
 * (scenery, characters, obstacles) bend identically.
 */
export function applyCurvedWorld(material: THREE.Material): void {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      mvPosition = modelViewMatrix * mvPosition;
      float d = -mvPosition.z;
      mvPosition.y -= ${CURVE_STRENGTH} * d * d;
      gl_Position = projectionMatrix * mvPosition;
      `
    );
  };
  // Ensure Three.js does not share shader program between curved and uncurved variants
  material.customProgramCacheKey = () => "curved_v1";
}

/**
 * Factory and registry helper. This is the canonical way materials must be initialized
 * to guarantee that all geometries and powerups curve consistently.
 */
export function registerCurvedMaterial<T extends THREE.Material>(material: T): T {
  applyCurvedWorld(material);
  return material;
}
