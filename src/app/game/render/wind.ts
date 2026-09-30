import type * as THREE from 'three';

/** Shared wind uniforms; the world advances time and sets strength from the weather. */
export const wind = {
  time: { value: 0 },
  strength: { value: 1 },
};

// How far a vertex bends, from its height above the object's (or instance's) base.
const BEND = {
  // Blades are centered cones: the base stays put and the tip moves.
  blade: { speed: '2.3', bend: 'clamp(windHeight + 0.05, 0.0, 0.3) * 0.9' },
  tree: { speed: '0.9', bend: 'max(windHeight - 1.6, 0.0) * 0.05' },
} as const;

/**
 * Sways a standard material's vertices in world space. Instanced meshes bend around each
 * instance's base; ordinary meshes around their own origin. Shadows keep the rest pose.
 */
export function addWind(material: THREE.Material, mode: keyof typeof BEND): void {
  const { speed, bend } = BEND[mode];
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uWindTime'] = wind.time;
    shader.uniforms['uWindStrength'] = wind.strength;
    shader.vertexShader =
      'uniform float uWindTime;\nuniform float uWindStrength;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        /* glsl */ `
        vec4 mvPosition = vec4(transformed, 1.0);
        vec3 windBase = modelMatrix[3].xyz;
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
          windBase += instanceMatrix[3].xyz;
        #endif
        vec4 windWorld = modelMatrix * mvPosition;
        float windHeight = windWorld.y - windBase.y;
        float windPhase = uWindTime * ${speed} + windBase.x * 0.7 + windBase.z * 0.53;
        float windAmount = (${bend}) * uWindStrength;
        windWorld.x += sin(windPhase) * windAmount;
        windWorld.z += cos(windPhase * 0.83) * windAmount * 0.55;
        mvPosition = viewMatrix * windWorld;
        gl_Position = projectionMatrix * mvPosition;`,
      );
  };
  material.customProgramCacheKey = () => `wind-${mode}`;
}
