import * as THREE from "three";
import { registerCurvedMaterial, CURVE_STRENGTH } from "./CurvedWorld";

let sharedGradientMap: THREE.DataTexture | null = null;

/**
 * Creates a shared 3-band discrete gradient map for MeshToonMaterial.
 * NearestFilter guarantees sharp cartoon cel lighting bands.
 */
export function getToonGradientMap(): THREE.DataTexture {
  if (sharedGradientMap) return sharedGradientMap;

  // 3-step ramp: shadow (85), midtone (180), highlight (255)
  const colors = new Uint8Array([85, 180, 255]);
  sharedGradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
  sharedGradientMap.minFilter = THREE.NearestFilter;
  sharedGradientMap.magFilter = THREE.NearestFilter;
  sharedGradientMap.generateMipmaps = false;
  sharedGradientMap.needsUpdate = true;
  return sharedGradientMap;
}

/**
 * Creates a MeshToonMaterial pre-configured with discrete gradientMap
 * and curved world shader injection.
 */
export function createToonMaterial(
  parameters: THREE.MeshToonMaterialParameters = {}
): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({
    gradientMap: getToonGradientMap(),
    ...parameters,
  });
  return registerCurvedMaterial(mat);
}

/**
 * Creates a curved inverted-hull outline material that extrudes vertices along
 * their normals and bends with the curved world.
 */
export function createOutlineMaterial(
  thickness = 0.04,
  color = 0x111111
): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.BackSide,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.outlineThickness = { value: thickness };
    shader.vertexShader = `
      uniform float outlineThickness;
    ` + shader.vertexShader;

    // Extrude vertex along normal in model space
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      #ifdef USE_NORMAL
        transformed += normalize(normal) * outlineThickness;
      #else
        transformed += normalize(position) * outlineThickness;
      #endif
      `
    );

    // Apply curved world depth displacement
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_BATCHING
        mvPosition = batchingMatrix * mvPosition;
      #endif
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

  mat.customProgramCacheKey = () => `curved_outline_${thickness}_${color}`;
  return mat;
}

/**
 * Attaches an inverted-hull outline child to a mesh using its own geometry.
 */
export function attachInvertedHull(
  mesh: THREE.Mesh,
  thickness = 0.04,
  color = 0x111111
): THREE.Mesh {
  const outlineMat = createOutlineMaterial(thickness, color);
  const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMat);
  outlineMesh.name = "inverted_hull_outline";
  outlineMesh.castShadow = false;
  outlineMesh.receiveShadow = false;
  mesh.add(outlineMesh);
  return outlineMesh;
}
