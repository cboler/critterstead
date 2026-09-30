import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const FULLSCREEN_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

// A miniature-diorama focus: blur grows with distance from a horizontal band around the
// rancher. One pass per axis keeps it cheap.
const MiniatureShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uStep: { value: new THREE.Vector2(1 / 1024, 0) },
    uFocus: { value: 0.5 },
    uBand: { value: 0.3 },
    uStrength: { value: 1 },
  },
  vertexShader: FULLSCREEN_VERTEX,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uStep;
    uniform float uFocus;
    uniform float uBand;
    uniform float uStrength;
    varying vec2 vUv;
    void main() {
      float away = max(0.0, abs(vUv.y - uFocus) - uBand);
      vec2 stepSize = uStep * min(1.0, away * 3.2) * uStrength;
      vec4 sum = texture2D(tDiffuse, vUv) * 0.2270270270;
      sum += texture2D(tDiffuse, vUv + stepSize * 1.3846153846) * 0.3162162162;
      sum += texture2D(tDiffuse, vUv - stepSize * 1.3846153846) * 0.3162162162;
      sum += texture2D(tDiffuse, vUv + stepSize * 3.2307692308) * 0.0702702703;
      sum += texture2D(tDiffuse, vUv - stepSize * 3.2307692308) * 0.0702702703;
      gl_FragColor = sum;
    }`,
};

// Display-space grade after tone mapping: a touch more color and contrast, and a vignette.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVignette: { value: 0.2 },
    uSaturation: { value: 1.12 },
    uContrast: { value: 1.06 },
  },
  vertexShader: FULLSCREEN_VERTEX,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uSaturation;
    uniform float uContrast;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      color.rgb = mix(vec3(luma), color.rgb, uSaturation);
      color.rgb = (color.rgb - 0.5) * uContrast + 0.5;
      float falloff = smoothstep(0.85, 0.22, length((vUv - 0.5) * vec2(1.1, 1.0)));
      color.rgb *= mix(1.0 - uVignette, 1.0, falloff);
      gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
    }`,
};

/** Post-processing chain for tiers that allow it; absent on the light tier. */
export class Finish {
  private readonly composer: EffectComposer;
  private readonly horizontal: ShaderPass;
  private readonly vertical: ShaderPass;
  private readonly bloom: UnrealBloomPass | null;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: { bloom: boolean },
  ) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = options.bloom
      ? new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0, 0.45, 1.05)
      : null;
    if (this.bloom) this.composer.addPass(this.bloom);
    this.horizontal = new ShaderPass(MiniatureShader);
    this.vertical = new ShaderPass(MiniatureShader);
    this.composer.addPass(this.horizontal);
    this.composer.addPass(this.vertical);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new ShaderPass(GradeShader));
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    // Blur radius in CSS pixels, so the effect looks the same at any resolution.
    this.horizontal.uniforms['uStep'].value.set(1.5 / width, 0);
    this.vertical.uniforms['uStep'].value.set(0, 1.5 / height);
  }

  /**
   * Focus follows the rancher's screen height (0 bottom, 1 top). Bloom only runs after dusk,
   * when lamps and windows are the brightest things in view; daylight would wash out.
   */
  render(focus: number, night: number, strength: number): void {
    for (const pass of [this.horizontal, this.vertical]) {
      pass.uniforms['uFocus'].value = focus;
      pass.uniforms['uStrength'].value = strength;
    }
    if (this.bloom) {
      this.bloom.enabled = night > 0.05;
      this.bloom.strength = night * 0.5;
    }
    this.composer.render();
  }

  dispose(): void {
    this.composer.dispose();
    this.bloom?.dispose();
  }
}
