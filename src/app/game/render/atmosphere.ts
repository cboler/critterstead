import * as THREE from 'three';
import type { Weather } from '../model';

/** One lighting mood at a minute of the day. Colors are sRGB hex. */
interface Mood {
  minute: number;
  sun: string;
  sunIntensity: number;
  sky: string;
  ground: string;
  hemisphere: number;
  fog: string;
  exposure: number;
}

// The day's grading: moonlit night, rosy dawn, clear day, golden hour, sunset, dusk.
const MOODS: Mood[] = [
  {
    minute: 0,
    sun: '#8fa3d6',
    sunIntensity: 0.75,
    sky: '#6a7aab',
    ground: '#343a4f',
    hemisphere: 1.3,
    fog: '#1f2a3e',
    exposure: 0.95,
  },
  {
    minute: 290,
    sun: '#95a4d4',
    sunIntensity: 0.5,
    sky: '#6b77a6',
    ground: '#353848',
    hemisphere: 1,
    fog: '#2c3552',
    exposure: 0.95,
  },
  {
    minute: 360,
    sun: '#ffab7a',
    sunIntensity: 1.5,
    sky: '#f0c0ae',
    ground: '#6b5a58',
    hemisphere: 1.55,
    fog: '#e6bfae',
    exposure: 1.02,
  },
  {
    minute: 430,
    sun: '#ffe0b6',
    sunIntensity: 2.7,
    sky: '#eef1e8',
    ground: '#8f8670',
    hemisphere: 2.25,
    fog: '#e2e8df',
    exposure: 1.1,
  },
  {
    minute: 720,
    sun: '#fff3da',
    sunIntensity: 3.25,
    sky: '#eff7f1',
    ground: '#988872',
    hemisphere: 2.6,
    fog: '#dde9e3',
    exposure: 1.13,
  },
  {
    minute: 1020,
    sun: '#ffe5bd',
    sunIntensity: 3,
    sky: '#f1f3e7',
    ground: '#958470',
    hemisphere: 2.45,
    fog: '#e4e7da',
    exposure: 1.12,
  },
  {
    minute: 1110,
    sun: '#ffb56c',
    sunIntensity: 2.35,
    sky: '#f6d6ae',
    ground: '#7c6551',
    hemisphere: 2,
    fog: '#efd3ae',
    exposure: 1.1,
  },
  {
    minute: 1170,
    sun: '#ff8a5c',
    sunIntensity: 1.45,
    sky: '#e7a7a0',
    ground: '#5d4a54',
    hemisphere: 1.5,
    fog: '#d99b91',
    exposure: 1.04,
  },
  {
    minute: 1235,
    sun: '#8a92c8',
    sunIntensity: 0.7,
    sky: '#6e71a1',
    ground: '#393347',
    hemisphere: 1.1,
    fog: '#484670',
    exposure: 0.98,
  },
  {
    minute: 1320,
    sun: '#8fa3d6',
    sunIntensity: 0.75,
    sky: '#6a7aab',
    ground: '#343a4f',
    hemisphere: 1.3,
    fog: '#1f2a3e',
    exposure: 0.95,
  },
  {
    minute: 1440,
    sun: '#8fa3d6',
    sunIntensity: 0.75,
    sky: '#6a7aab',
    ground: '#343a4f',
    hemisphere: 1.3,
    fog: '#1f2a3e',
    exposure: 0.95,
  },
];

const SUNRISE = 360;
const SUNSET = 1200;
const MOON_DIRECTION = new THREE.Vector3(-0.45, 0.82, 0.38).normalize();
const WEATHER_LIGHT: Record<
  Weather,
  { sun: number; sky: number; haze: string; mix: number; tint: string; exposure: number }
> = {
  sunny: { sun: 1, sky: 1, haze: '#ffffff', mix: 0, tint: '#ffffff', exposure: 1 },
  cloudy: { sun: 0.55, sky: 1.05, haze: '#c9d1d2', mix: 0.35, tint: '#e2e8ee', exposure: 0.97 },
  rain: { sun: 0.28, sky: 0.9, haze: '#9aa8b0', mix: 0.6, tint: '#c9d5de', exposure: 0.9 },
  snow: { sun: 0.62, sky: 1.08, haze: '#e1e8ee', mix: 0.5, tint: '#e6eeff', exposure: 0.98 },
};

/** A small canvas-drawn radial glow for halos and fireflies. */
export function glowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** GPU-animated precipitation in a box that follows the camera focus. */
function precipitation(count: number, snow: boolean): THREE.Points | THREE.LineSegments {
  const bases = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    bases[index * 3] = Math.random() * 40;
    bases[index * 3 + 1] = Math.random() * 16;
    bases[index * 3 + 2] = Math.random() * 40;
    speeds[index] = snow ? 0.9 + Math.random() * 0.8 : 13 + Math.random() * 6;
  }
  const geometry = new THREE.BufferGeometry();
  const uniforms = {
    uTime: { value: 0 },
    uFocus: { value: new THREE.Vector3() },
    uStrength: { value: 1 },
    uColor: { value: new THREE.Color(snow ? '#ffffff' : '#dfe8ef') },
  };
  const wrap = /* glsl */ `
    uniform float uTime;
    uniform vec3 uFocus;
    attribute vec3 base;
    attribute float speed;
    vec3 place(float lift) {
      float fall = mod(base.y - uTime * speed + lift, 16.0);
      vec3 p = vec3(base.x, fall - 2.0, base.z);
      p.x = uFocus.x + mod(p.x - uFocus.x, 40.0) - 20.0;
      p.z = uFocus.z + mod(p.z - uFocus.z, 40.0) - 20.0;
      ${snow ? 'p.x += sin(uTime * 0.7 + base.z) * 0.6; p.z += cos(uTime * 0.5 + base.x) * 0.5;' : 'p.x -= (16.0 - fall) * 0.12;'}
      return p;
    }`;
  let object: THREE.Points | THREE.LineSegments;
  if (snow) {
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('base', new THREE.BufferAttribute(bases, 3));
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
    object = new THREE.Points(
      geometry,
      new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        vertexShader: `${wrap}
          void main() {
            vec4 view = viewMatrix * vec4(place(0.0), 1.0);
            gl_Position = projectionMatrix * view;
            gl_PointSize = 3.0 + fract(base.x * 7.1) * 3.0;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uStrength;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            gl_FragColor = vec4(uColor, smoothstep(0.5, 0.15, d) * 0.9 * uStrength);
          }`,
      }),
    );
  } else {
    // Each drop is a short segment; both ends share a base, the tail lags behind the head.
    const doubled = new Float32Array(count * 6);
    const doubledSpeeds = new Float32Array(count * 2);
    const tails = new Float32Array(count * 2);
    for (let index = 0; index < count; index++) {
      for (const end of [0, 1]) {
        doubled.set(bases.subarray(index * 3, index * 3 + 3), (index * 2 + end) * 3);
        doubledSpeeds[index * 2 + end] = speeds[index];
        tails[index * 2 + end] = end;
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3));
    geometry.setAttribute('base', new THREE.BufferAttribute(doubled, 3));
    geometry.setAttribute('speed', new THREE.BufferAttribute(doubledSpeeds, 1));
    geometry.setAttribute('tail', new THREE.BufferAttribute(tails, 1));
    object = new THREE.LineSegments(
      geometry,
      new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        vertexShader: `${wrap}
          attribute float tail;
          varying float vTail;
          void main() {
            vTail = tail;
            gl_Position = projectionMatrix * viewMatrix * vec4(place(tail * 0.85), 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uStrength;
          varying float vTail;
          void main() {
            gl_FragColor = vec4(uColor, mix(0.8, 0.0, vTail) * uStrength);
          }`,
      }),
    );
  }
  object.frustumCulled = false;
  object.renderOrder = 3;
  return object;
}

/** Drifting night lights near the ground. */
function fireflies(count: number, texture: THREE.Texture): THREE.Points {
  const bases = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    bases[index * 3] = (Math.random() * 2 - 1) * 16;
    bases[index * 3 + 1] = 0.35 + Math.random() * 1.8;
    bases[index * 3 + 2] = (Math.random() * 2 - 1) * 16;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(bases, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uStrength: { value: 0 },
        uMap: { value: texture },
        uScale: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uScale;
        varying float vPulse;
        void main() {
          vec3 p = position;
          float seed = position.x * 1.7 + position.z * 3.1;
          p.x += sin(uTime * 0.35 + seed) * 1.2;
          p.z += cos(uTime * 0.28 + seed * 1.3) * 1.2;
          p.y += sin(uTime * 0.9 + seed * 2.0) * 0.35;
          vPulse = 0.35 + 0.65 * pow(max(0.0, sin(uTime * 1.6 + seed * 5.0)), 3.0);
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
          gl_PointSize = 22.0 * uScale;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uStrength;
        varying float vPulse;
        void main() {
          vec4 glow = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vec3(1.0, 0.92, 0.55) * glow.rgb, glow.a * vPulse * uStrength);
        }`,
    }),
  );
  points.frustumCulled = false;
  points.renderOrder = 4;
  return points;
}

export interface AtmosphereFrame {
  minute: number;
  weather: Weather;
  indoors: boolean;
  outdoorsNight: boolean;
}

/**
 * Drives sky-light, sun path, fog, exposure, precipitation, fireflies and night glow from
 * the game clock and the day's forecast. Presentation only.
 */
export class Atmosphere {
  readonly sunDirection = new THREE.Vector3(-0.42, 0.78, 0.47).normalize();
  /** 0 by day, 1 at full night; lamps and windows follow it. */
  night = 0;
  /** Overall brightness for unlit materials such as water. */
  light = 1;
  /** The current distant-haze color, which also tints the water. */
  readonly haze = new THREE.Color();
  private readonly group = new THREE.Group();
  private readonly lamps = new THREE.Group();
  private readonly texture = glowTexture();
  private readonly glass: THREE.MeshStandardMaterial[] = [];
  private readonly flames: THREE.MeshStandardMaterial[] = [];
  private readonly lampLights: THREE.PointLight[] = [];
  private readonly halos: THREE.Sprite[] = [];
  private rain?: THREE.LineSegments | THREE.Points;
  private snow?: THREE.Points;
  private flies?: THREE.Points;
  private readonly scratch = { a: new THREE.Color(), b: new THREE.Color() };

  constructor(
    private readonly scene: THREE.Scene,
    private readonly sun: THREE.DirectionalLight,
    private readonly hemisphere: THREE.HemisphereLight,
    private readonly renderer: THREE.WebGLRenderer,
  ) {
    scene.add(this.group, this.lamps);
  }

  /** Rebuilds per-area effects. Detail is the quality tier's share of optional particles. */
  configure(detail: number, pointLights: boolean): void {
    for (const object of [this.rain, this.snow, this.flies])
      if (object) {
        this.group.remove(object);
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
    this.rain = precipitation(Math.round(1400 * detail), false);
    this.snow = precipitation(Math.round(1100 * detail), true) as THREE.Points;
    this.flies = fireflies(Math.round(70 * Math.max(0.5, detail)), this.texture);
    this.group.add(this.rain, this.snow, this.flies);
    this.pointLights = pointLights;
  }
  private pointLights = true;

  /** Clears lamps and glowing materials registered by the previous area. */
  resetLamps(): void {
    for (const light of this.lampLights) light.dispose();
    for (const halo of this.halos) (halo.material as THREE.SpriteMaterial).dispose();
    this.lamps.clear();
    this.lampLights.length = 0;
    this.halos.length = 0;
    this.glass.length = 0;
    this.flames.length = 0;
  }

  /** Window glass and flames glow at night. */
  glow(material: THREE.MeshStandardMaterial, kind: 'glass' | 'flame'): void {
    (kind === 'glass' ? this.glass : this.flames).push(material);
  }

  /** A warm light source with a halo; a real point light only on capable tiers. */
  lamp(position: THREE.Vector3, radius = 1.2): void {
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.texture,
        color: '#ffcf86',
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    halo.position.copy(position);
    halo.scale.setScalar(radius);
    halo.renderOrder = 5;
    this.lamps.add(halo);
    this.halos.push(halo);
    if (this.pointLights && this.lampLights.length < 4) {
      const light = new THREE.PointLight('#ffc27a', 0, 7, 1.7);
      light.position.copy(position);
      this.lamps.add(light);
      this.lampLights.push(light);
    }
  }

  update(frame: AtmosphereFrame, clock: number, focus: THREE.Vector3, sky: string): void {
    const { a, b } = this.scratch;
    const minute = ((frame.minute % 1440) + 1440) % 1440;
    let next = MOODS.findIndex((mood) => mood.minute > minute);
    if (next <= 0) next = MOODS.length - 1;
    const from = MOODS[next - 1];
    const to = MOODS[next];
    const t = (minute - from.minute) / (to.minute - from.minute);
    const weather = frame.indoors ? WEATHER_LIGHT.sunny : WEATHER_LIGHT[frame.weather];

    // Sun path: rises in the east, arcs south, sets in the west; the moon takes over at night.
    const day = THREE.MathUtils.clamp((minute - SUNRISE) / (SUNSET - SUNRISE), 0, 1);
    const sunUp = minute > SUNRISE - 20 && minute < SUNSET + 20;
    const arc = Math.PI * day;
    this.sunDirection.set(Math.cos(arc), 0.18 + Math.sin(arc) * 0.95, 0.62).normalize();
    const twilight = Math.min(
      THREE.MathUtils.smoothstep(minute, SUNRISE - 30, SUNRISE + 25),
      1 - THREE.MathUtils.smoothstep(minute, SUNSET - 25, SUNSET + 30),
    );
    if (!sunUp || twilight < 1) this.sunDirection.lerp(MOON_DIRECTION, 1 - twilight).normalize();
    if (frame.indoors) this.sunDirection.set(-0.35, 0.8, 0.5).normalize();

    this.sun.color.copy(a.set(from.sun).lerp(b.set(to.sun), t)).lerp(b.set(weather.tint), 0.55);
    this.sun.intensity =
      THREE.MathUtils.lerp(from.sunIntensity, to.sunIntensity, t) *
      weather.sun *
      (frame.indoors ? 0.7 : 1);
    this.hemisphere.color.copy(a.set(from.sky).lerp(b.set(to.sky), t));
    this.hemisphere.groundColor.copy(a.set(from.ground).lerp(b.set(to.ground), t));
    this.hemisphere.intensity =
      THREE.MathUtils.lerp(from.hemisphere, to.hemisphere, t) * weather.sky;
    this.renderer.toneMappingExposure =
      THREE.MathUtils.lerp(from.exposure, to.exposure, t) * weather.exposure;

    if (frame.indoors) {
      // Indoors stays warm at every hour: window daylight by day, lamplight and hearth at night.
      const daylit = THREE.MathUtils.clamp(Math.sin(arc) * (sunUp ? 1 : 0) * 1.4, 0, 1);
      this.sun.color.set('#fff0d6');
      this.sun.intensity = 0.35 + daylit * 1.5;
      this.hemisphere.color.set('#f6e1c4');
      this.hemisphere.groundColor.set('#6e5641');
      this.hemisphere.intensity = 1.55 + daylit * 0.55;
      this.renderer.toneMappingExposure = 1.05;
    }
    // Distant haze blends the season's sky, the hour and the weather.
    const daylight = Math.max(0, Math.sin(arc)) * (sunUp ? 1 : 0);
    a.set(from.fog).lerp(b.set(to.fog), t);
    const haze = b.set(sky).lerp(a, 1 - daylight * 0.75);
    haze.lerp(a.set(weather.haze), weather.mix * (0.4 + daylight * 0.6));
    this.haze.copy(haze);
    if (!frame.indoors) {
      (this.scene.background as THREE.Color).copy(haze);
      this.scene.fog?.color.copy(haze);
    }

    this.night = frame.indoors
      ? 0.35 + (1 - daylight) * 0.5
      : 1 - THREE.MathUtils.smoothstep(daylight, 0.02, 0.35);
    this.light = frame.indoors
      ? 1
      : 0.3 +
        0.7 *
          THREE.MathUtils.smoothstep(
            this.sun.intensity + this.hemisphere.intensity * 0.4,
            0.8,
            3.5,
          );

    for (const material of this.glass) {
      material.emissive.set('#ffb85c');
      material.emissiveIntensity = this.night * 1.25;
    }
    for (const material of this.flames) {
      material.emissive.set('#ff9c3c');
      material.emissiveIntensity = 0.6 + this.night * 1.4;
    }
    const flicker = 0.9 + Math.sin(clock * 9.1) * 0.04 + Math.sin(clock * 5.3) * 0.05;
    for (const light of this.lampLights) light.intensity = this.night * 5.5 * flicker;
    for (const halo of this.halos)
      (halo.material as THREE.SpriteMaterial).opacity = this.night * 0.85 * flicker;

    // Precipitation and fireflies follow the view.
    const raining = !frame.indoors && frame.weather === 'rain';
    const snowing = !frame.indoors && frame.weather === 'snow';
    const showers = 0.65 + 0.35 * Math.sin(clock * 0.05 + minute * 0.01);
    for (const [object, active] of [
      [this.rain, raining],
      [this.snow, snowing],
    ] as const) {
      if (!object) continue;
      object.visible = active;
      if (!active) continue;
      const uniforms = (object.material as THREE.ShaderMaterial).uniforms;
      uniforms['uTime'].value = clock;
      uniforms['uFocus'].value.copy(focus);
      uniforms['uStrength'].value = active ? showers : 0;
    }
    if (this.flies) {
      const uniforms = (this.flies.material as THREE.ShaderMaterial).uniforms;
      const strength = frame.outdoorsNight && !raining && !snowing ? this.night : 0;
      this.flies.visible = strength > 0.01;
      uniforms['uTime'].value = clock;
      uniforms['uStrength'].value = strength;
      uniforms['uScale'].value = this.renderer.getPixelRatio();
      this.flies.position.set(focus.x, 0, focus.z);
    }
  }

  dispose(): void {
    this.resetLamps();
    for (const object of [this.rain, this.snow, this.flies])
      if (object) {
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
    this.texture.dispose();
    this.scene.remove(this.group, this.lamps);
  }
}
