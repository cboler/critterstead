import * as THREE from 'three';
import { Appearance, FamilyId } from '../families';

type Vec3 = [number, number, number];

/** Shared geometry and the world's cached-material mesh factory. */
export interface FigureKit {
  mesh(geometry: THREE.BufferGeometry, color: string, position?: Vec3, scale?: Vec3): THREE.Mesh;
  sphere: THREE.BufferGeometry;
  cylinder: THREE.BufferGeometry;
  cone: THREE.BufferGeometry;
  torus: THREE.BufferGeometry;
}

/** The parts of a critter the world animates. Legs hang from the frame, the rest from body. */
export interface FigureParts {
  body: THREE.Group;
  tail: THREE.Group;
  // Ears, wings, frills or antennae: `side` and resting `baseZ` live in userData.
  ears: THREE.Mesh[];
  // Each eye remembers its open height in userData.open for blinking.
  eyes: THREE.Mesh[];
  legs: THREE.Mesh[];
  // Where a carried load sits (body units) and where the name label floats (world units).
  back: number;
  height: number;
}

// Named colours stored on individuals; presentation decides the exact shades.
const COATS: Record<string, string> = {
  peach: '#dc9e6d',
  cocoa: '#8a5e45',
  cream: '#eadcbf',
  sky: '#8cc0dd',
  sunflower: '#e9c35a',
  rose: '#dd8f98',
  ember: '#d9734a',
  teal: '#4f8f88',
  fern: '#7aa461',
  sand: '#d8bd8a',
  slate: '#7d8a96',
  gold: '#d7b366',
  coral: '#e08a72',
  ginger: '#d98a48',
  smoke: '#9a9aa3',
  moss: '#538378',
  plum: '#8a5f86',
  honey: '#c99a4a',
  chestnut: '#9c5b3b',
  mint: '#9fd8b8',
  lilac: '#b7a3dd',
  beetle: '#4d6f6a',
};
// Mallow keeps her exact original shading.
const SHADES: Record<string, Partial<Shades>> = {
  peach: { light: '#edbb87', pale: '#f2d8ac', dark: '#b27d56', ear: '#dd9f70', head: '#e8ad79' },
  moss: { light: '#789775' },
};
interface Shades {
  base: string;
  light: string;
  pale: string;
  dark: string;
  ear: string;
  head: string;
}

function shades(name: string): Shades {
  const base = COATS[name] ?? COATS['cream'];
  const tone = (lightness: number, saturation = 0) =>
    `#${new THREE.Color(base).offsetHSL(0, saturation, lightness).getHexString()}`;
  return {
    base,
    light: tone(0.08),
    pale: tone(0.2, -0.1),
    dark: tone(-0.12),
    ear: tone(0.01),
    head: tone(0.04),
    ...SHADES[name],
  };
}

// Typical build per family, multiplied by the individual's own size.
const FAMILY_SCALE: Record<FamilyId, number> = {
  avian: 0.92,
  reptile: 1,
  canine: 1,
  feline: 0.95,
  bovine: 1.12,
  ursine: 1.1,
  equine: 1,
  slime: 0.95,
  insect: 0.95,
};

class FigureBuilder {
  readonly parts: FigureParts;
  readonly coat: Shades;
  readonly accent: Shades;
  constructor(
    readonly kit: FigureKit,
    readonly frame: THREE.Group,
    appearance: Appearance,
  ) {
    this.coat = shades(appearance.coat);
    this.accent = shades(appearance.accent);
    const body = new THREE.Group();
    const tail = new THREE.Group();
    body.add(tail);
    frame.add(body);
    this.parts = { body, tail, ears: [], eyes: [], legs: [], back: 0.9, height: 1.9 };
  }

  add(
    geometry: THREE.BufferGeometry,
    color: string,
    position: Vec3,
    scale: Vec3,
    parent?: THREE.Object3D,
  ): THREE.Mesh {
    const mesh = this.kit.mesh(geometry, color, position, scale);
    (parent ?? this.parts.body).add(mesh);
    return mesh;
  }
  ball(color: string, position: Vec3, scale: Vec3, parent?: THREE.Object3D): THREE.Mesh {
    return this.add(this.kit.sphere, color, position, scale, parent);
  }
  /** A glossy eye with pupil and glint, mirrored to both sides. */
  eyes(x: number, y: number, z: number, size = 1, iris = '#384c40'): void {
    for (const side of [-1, 1])
      for (const eye of [
        this.ball('#f9e3bc', [side * x, y, z], [0.13 * size, 0.14 * size, 0.038 * size]),
        this.ball(
          iris,
          [side * x, y + 0.01 * size, z + 0.037 * size],
          [0.059 * size, 0.071 * size, 0.025 * size],
        ),
        this.ball(
          '#fff6da',
          [side * (x - 0.015 * size), y + 0.035 * size, z + 0.06 * size],
          [0.015 * size, 0.019 * size, 0.008 * size],
        ),
      ]) {
        eye.userData['open'] = eye.scale.y;
        this.parts.eyes.push(eye);
      }
  }
  ear(mesh: THREE.Mesh, side: number): void {
    mesh.userData['side'] = side;
    mesh.userData['baseZ'] = mesh.rotation.z;
    this.parts.ears.push(mesh);
  }
  leg(color: string, position: Vec3, scale: Vec3, geometry = this.kit.sphere): THREE.Mesh {
    const leg = this.add(geometry, color, position, scale, this.frame);
    this.parts.legs.push(leg);
    return leg;
  }
  cheeks(x: number, y: number, z: number): void {
    for (const side of [-1, 1]) this.ball('#d58f77', [side * x, y, z], [0.073, 0.038, 0.025]);
  }
  kerchief(y: number, z: number, radius: number): void {
    const band = this.add(this.kit.torus, '#527f77', [0, y, z], [radius / 0.26, radius / 0.26, 1]);
    band.rotation.x = Math.PI / 2;
    this.ball('#d7b366', [0, y - 0.055, z + radius + 0.02], [0.058, 0.065, 0.029]);
  }
}

type Build = (figure: FigureBuilder, kerchief: boolean) => void;

const canine: Build = (f, kerchief) => {
  const { coat, accent } = f;
  f.ball(coat.base, [0, 0.64, 0], [0.43, 0.39, 0.58]);
  f.ball(coat.light, [0, 0.71, 0.3], [0.38, 0.4, 0.36]);
  f.ball(coat.pale, [0, 0.53, 0.42], [0.28, 0.24, 0.22]);
  f.ball(coat.head, [0, 1.02, 0.29], [0.37, 0.34, 0.33]);
  for (const side of [-1, 1]) {
    const ear = f.ball(coat.ear, [side * 0.245, 1.38, 0.23], [0.135, 0.38, 0.11]);
    ear.rotation.z = -side * 0.28;
    f.ear(ear, side);
    const inner = f.ball('#ba7b67', [side * 0.248, 1.38, 0.317], [0.072, 0.245, 0.027]);
    inner.rotation.z = -side * 0.28;
    f.ear(inner, side);
    for (const front of [-1, 1])
      f.leg(coat.dark, [side * 0.29, 0.18, front * 0.32], [0.12, 0.16, 0.19]);
  }
  f.eyes(0.17, 1.045, 0.562);
  f.cheeks(0.28, 0.939, 0.507);
  f.ball('#674e3c', [0, 0.96, 0.628], [0.055, 0.038, 0.026]);
  if (kerchief) f.kerchief(0.79, 0.3, 0.26);
  // A plumed tail in the accent colour.
  f.parts.tail.position.set(0, 0.57, -0.46);
  for (let plume = 0; plume < 5; plume++) {
    const feather = f.ball(
      plume % 2 ? accent.light : accent.base,
      [(plume - 2) * 0.135, 0.15 + Math.abs(plume - 2) * 0.015, -0.23],
      [0.13, 0.16, 0.5 - Math.abs(plume - 2) * 0.05],
      f.parts.tail,
    );
    feather.rotation.y = -(plume - 2) * 0.17;
    feather.rotation.x = -0.22;
  }
};

const feline: Build = (f, kerchief) => {
  const { coat, accent } = f;
  f.ball(coat.base, [0, 0.6, -0.02], [0.35, 0.34, 0.55]);
  f.ball(coat.light, [0, 0.66, 0.28], [0.32, 0.34, 0.3]);
  f.ball(coat.pale, [0, 0.52, 0.38], [0.22, 0.2, 0.18]);
  f.ball(coat.head, [0, 1.0, 0.32], [0.36, 0.32, 0.31]);
  // Two accent stripes over the back.
  for (const z of [-0.1, -0.32]) f.ball(accent.base, [0, 0.88, z], [0.28, 0.07, 0.08]);
  for (const side of [-1, 1]) {
    const ear = f.add(f.kit.cone, coat.ear, [side * 0.2, 1.33, 0.28], [0.13, 0.27, 0.1]);
    ear.rotation.z = -side * 0.22;
    f.ear(ear, side);
    const inner = f.add(f.kit.cone, '#c98b84', [side * 0.2, 1.31, 0.32], [0.07, 0.17, 0.04]);
    inner.rotation.z = -side * 0.22;
    f.ear(inner, side);
    for (const front of [-1, 1])
      f.leg(coat.dark, [side * 0.22, 0.17, front * 0.3], [0.09, 0.17, 0.12]);
  }
  f.eyes(0.15, 1.03, 0.585, 1.05, '#4c6a3c');
  f.cheeks(0.24, 0.93, 0.55);
  f.ball('#c98b84', [0, 0.95, 0.63], [0.045, 0.03, 0.022]);
  if (kerchief) f.kerchief(0.78, 0.3, 0.23);
  // A long tail curling up like a question mark, tipped in the accent colour.
  f.parts.tail.position.set(0, 0.55, -0.5);
  const curl: Vec3[] = [
    [0, 0, 0],
    [0, 0.09, -0.14],
    [0, 0.22, -0.25],
    [0, 0.38, -0.3],
    [0, 0.54, -0.27],
    [0, 0.65, -0.18],
  ];
  curl.forEach((point, index) =>
    f.ball(
      index === curl.length - 1 ? accent.base : coat.base,
      point,
      [0.075, 0.09, 0.09],
      f.parts.tail,
    ),
  );
  f.parts.back = 0.85;
  f.parts.height = 1.75;
};

const ursine: Build = (f, kerchief) => {
  const { coat, accent } = f;
  f.ball(coat.base, [0, 0.68, -0.02], [0.55, 0.5, 0.62]);
  f.ball(coat.pale, [0, 0.62, 0.36], [0.4, 0.38, 0.3]);
  f.ball(coat.head, [0, 1.12, 0.36], [0.42, 0.4, 0.38]);
  f.ball(coat.pale, [0, 1.01, 0.68], [0.2, 0.15, 0.16]);
  f.ball('#4a382c', [0, 1.06, 0.83], [0.075, 0.05, 0.04]);
  f.ball(accent.base, [0, 0.7, 0.66], [0.2, 0.06, 0.05]);
  for (const side of [-1, 1]) {
    const ear = f.ball(coat.ear, [side * 0.3, 1.45, 0.3], [0.13, 0.13, 0.08]);
    ear.rotation.z = -side * 0.1;
    f.ear(ear, side);
    const inner = f.ball(coat.pale, [side * 0.3, 1.44, 0.36], [0.07, 0.07, 0.03]);
    inner.rotation.z = -side * 0.1;
    f.ear(inner, side);
    for (const front of [-1, 1])
      f.leg(coat.dark, [side * 0.33, 0.2, front * 0.32], [0.17, 0.2, 0.22]);
  }
  f.eyes(0.16, 1.18, 0.7, 0.62);
  f.cheeks(0.28, 1.04, 0.63);
  if (kerchief) f.kerchief(0.9, 0.36, 0.3);
  f.parts.tail.position.set(0, 0.76, -0.6);
  f.ball(coat.light, [0, 0, -0.03], [0.12, 0.12, 0.1], f.parts.tail);
  f.parts.back = 1.1;
  f.parts.height = 2;
};

const bovine: Build = (f, kerchief) => {
  const { coat, accent } = f;
  f.ball(coat.base, [0, 0.8, -0.04], [0.55, 0.44, 0.72]);
  // Patches in the accent colour.
  f.ball(accent.base, [0.5, 0.86, 0.12], [0.07, 0.22, 0.26]);
  f.ball(accent.base, [-0.48, 0.8, -0.28], [0.08, 0.2, 0.22]);
  f.ball(accent.base, [0.1, 1.2, -0.35], [0.22, 0.05, 0.2]);
  f.ball(coat.head, [0, 1.16, 0.62], [0.35, 0.33, 0.35]);
  f.ball(coat.pale, [0, 1.02, 0.9], [0.27, 0.17, 0.17]);
  for (const side of [-1, 1]) {
    f.ball('#8a6a5c', [side * 0.09, 1.03, 1.05], [0.035, 0.03, 0.02]);
    const horn = f.add(f.kit.cone, '#efe2c4', [side * 0.21, 1.47, 0.6], [0.06, 0.22, 0.06]);
    horn.rotation.z = -side * 0.55;
    const ear = f.ball(coat.ear, [side * 0.42, 1.24, 0.55], [0.2, 0.07, 0.1]);
    ear.rotation.z = side * 0.3;
    f.ear(ear, side);
    for (const front of [-1, 1])
      f.leg(coat.dark, [side * 0.3, 0.3, front * 0.4], [0.12, 0.3, 0.13]);
  }
  f.eyes(0.17, 1.24, 0.89, 0.6);
  if (kerchief) f.kerchief(0.98, 0.58, 0.3);
  // A rope tail with a tuft.
  f.parts.tail.position.set(0, 1.02, -0.72);
  const rope = f.add(
    f.kit.cylinder,
    coat.dark,
    [0, -0.22, -0.06],
    [0.03, 0.48, 0.03],
    f.parts.tail,
  );
  rope.rotation.x = 0.25;
  f.ball(accent.base, [0, -0.48, -0.12], [0.07, 0.11, 0.07], f.parts.tail);
  f.parts.back = 1.15;
  f.parts.height = 2.1;
};

const equine: Build = (f, kerchief) => {
  const { coat, accent } = f;
  f.ball(coat.base, [0, 0.98, -0.06], [0.4, 0.38, 0.68]);
  f.ball(coat.light, [0, 1.02, 0.36], [0.34, 0.36, 0.3]);
  const neck = f.ball(coat.base, [0, 1.36, 0.52], [0.2, 0.38, 0.22]);
  neck.rotation.x = 0.55;
  f.ball(coat.head, [0, 1.66, 0.72], [0.22, 0.23, 0.36]);
  f.ball(coat.pale, [0, 1.56, 0.98], [0.17, 0.16, 0.17]);
  for (let piece = 0; piece < 4; piece++)
    f.ball(accent.base, [0, 1.84 - piece * 0.17, 0.58 - piece * 0.1], [0.07, 0.13, 0.13]);
  for (const side of [-1, 1]) {
    f.ball('#6d5246', [side * 0.07, 1.55, 1.13], [0.03, 0.03, 0.02]);
    const ear = f.add(f.kit.cone, coat.ear, [side * 0.12, 1.92, 0.66], [0.07, 0.2, 0.06]);
    ear.rotation.z = -side * 0.18;
    f.ear(ear, side);
    for (const front of [-1, 1])
      f.leg(coat.dark, [side * 0.22, 0.43, front * 0.42], [0.09, 0.43, 0.1]);
  }
  f.eyes(0.15, 1.72, 0.9, 0.72);
  if (kerchief) f.kerchief(1.3, 0.48, 0.22);
  f.parts.tail.position.set(0, 1.06, -0.72);
  const plume = f.ball(accent.base, [0, -0.28, -0.12], [0.12, 0.38, 0.12], f.parts.tail);
  plume.rotation.x = 0.45;
  f.parts.back = 1.27;
  f.parts.height = 2.35;
};

const avian: Build = (f, kerchief) => {
  const { coat, accent } = f;
  f.ball(coat.base, [0, 0.72, -0.04], [0.42, 0.45, 0.44]);
  f.ball(coat.pale, [0, 0.66, 0.22], [0.32, 0.34, 0.25]);
  f.ball(coat.head, [0, 1.12, 0.12], [0.33, 0.32, 0.32]);
  const beak = f.add(f.kit.cone, '#e8b04a', [0, 1.06, 0.48], [0.08, 0.18, 0.08]);
  beak.rotation.x = Math.PI / 2;
  for (const [x, tilt] of [
    [-0.07, 0.25],
    [0, 0],
    [0.07, -0.25],
  ])
    f.ball(accent.base, [x, 1.46, 0.06], [0.045, 0.16, 0.07]).rotation.set(-0.35, 0, tilt);
  for (const side of [-1, 1]) {
    const wing = f.ball(coat.dark, [side * 0.42, 0.78, -0.04], [0.08, 0.3, 0.32]);
    wing.rotation.z = -side * 0.2;
    f.ear(wing, side);
    f.leg('#e0a14a', [side * 0.14, 0.17, 0.04], [0.035, 0.17, 0.035], f.kit.cylinder);
  }
  f.eyes(0.15, 1.15, 0.38, 0.85);
  f.cheeks(0.22, 1.02, 0.36);
  if (kerchief) f.kerchief(0.92, 0.06, 0.27);
  f.parts.tail.position.set(0, 0.72, -0.44);
  for (const [x, turn] of [
    [-0.1, 0.35],
    [0, 0],
    [0.1, -0.35],
  ])
    f.ball(accent.base, [x, 0.04, -0.12], [0.08, 0.05, 0.26], f.parts.tail).rotation.set(
      0.35,
      turn,
      0,
    );
  f.parts.back = 1;
  f.parts.height = 1.8;
};

const reptile: Build = (f, kerchief) => {
  const { coat, accent } = f;
  f.ball(coat.base, [0, 0.45, -0.02], [0.4, 0.3, 0.68]);
  f.ball(coat.pale, [0, 0.35, 0.06], [0.32, 0.18, 0.55]);
  f.ball(coat.head, [0, 0.62, 0.72], [0.3, 0.25, 0.34]);
  f.ball(coat.light, [0, 0.55, 0.98], [0.22, 0.14, 0.22]);
  for (let spine = 0; spine < 4; spine++)
    f.add(
      f.kit.cone,
      accent.base,
      [0, 0.76 - spine * 0.02, 0.38 - spine * 0.24],
      [0.06, 0.13, 0.06],
    );
  for (const side of [-1, 1]) {
    const frill = f.ball(accent.base, [side * 0.29, 0.7, 0.6], [0.04, 0.16, 0.13]);
    frill.rotation.z = -side * 0.4;
    f.ear(frill, side);
    for (const front of [-1, 1])
      f.leg(coat.dark, [side * 0.4, 0.15, front * 0.36], [0.12, 0.13, 0.16]);
  }
  f.eyes(0.17, 0.76, 0.8, 0.82, '#5a4a2a');
  if (kerchief) f.kerchief(0.55, 0.5, 0.26);
  // A long tapering tail.
  f.parts.tail.position.set(0, 0.42, -0.6);
  [0.2, 0.16, 0.12, 0.08].forEach((radius, index) =>
    f.ball(
      index === 3 ? accent.base : coat.base,
      [0, -0.06 * index, -0.22 * index],
      [radius, radius * 0.8, 0.2],
      f.parts.tail,
    ),
  );
  f.parts.back = 0.65;
  f.parts.height = 1.35;
};

const slime: Build = (f, kerchief) => {
  const { coat, accent } = f;
  f.ball(coat.base, [0, 0.5, 0], [0.55, 0.5, 0.55]);
  for (const [x, z] of [
    [-0.42, 0.22],
    [0.4, 0.26],
    [0.05, -0.45],
  ])
    f.ball(coat.light, [x, 0.08, z], [0.17, 0.09, 0.17]);
  f.ball('#fbf7ea', [-0.22, 0.82, 0.33], [0.11, 0.07, 0.05]);
  for (const side of [-1, 1]) {
    const bobble = f.ball(accent.base, [side * 0.13, 1.06, 0.08], [0.05, 0.17, 0.05]);
    bobble.rotation.z = -side * 0.3;
    f.ear(bobble, side);
  }
  f.eyes(0.17, 0.64, 0.49, 0.9);
  f.cheeks(0.3, 0.52, 0.45);
  if (kerchief) f.kerchief(0.3, 0, 0.5);
  f.parts.back = 0.95;
  f.parts.height = 1.45;
};

const insect: Build = (f, kerchief) => {
  const { coat, accent } = f;
  f.ball(coat.light, [0, 0.7, 0.14], [0.28, 0.27, 0.3]);
  f.ball(coat.head, [0, 0.86, 0.52], [0.3, 0.28, 0.28]);
  for (const side of [-1, 1]) {
    const antenna = f.ball(coat.dark, [side * 0.1, 1.24, 0.58], [0.025, 0.28, 0.025]);
    antenna.rotation.z = -side * 0.35;
    f.ear(antenna, side);
    const tip = f.ball(accent.base, [side * 0.19, 1.5, 0.58], [0.05, 0.05, 0.05]);
    f.ear(tip, side);
    for (const z of [0.3, 0.06, -0.2]) {
      const leg = f.leg(coat.dark, [side * 0.3, 0.2, z], [0.04, 0.21, 0.04]);
      leg.rotation.z = side * 0.55;
    }
  }
  f.eyes(0.15, 0.93, 0.72, 0.9, '#2f3440');
  if (kerchief) f.kerchief(0.72, 0.3, 0.24);
  // The shelled abdomen sways where other critters wag.
  f.parts.tail.position.set(0, 0.62, -0.18);
  f.ball(coat.base, [0, 0, -0.26], [0.42, 0.36, 0.5], f.parts.tail);
  for (const side of [-1, 1])
    f.ball(accent.base, [side * 0.19, 0.16, -0.24], [0.23, 0.2, 0.47], f.parts.tail);
  f.parts.back = 1;
  f.parts.height = 1.7;
};

// Brindlekin, the lineage Grandpa bred: fox-quick lines, a leafy crest, a brindled back and a
// muzzle frosted with age. Pip is the only one.
const brindlekin: Build = (f) => {
  const { coat, accent } = f;
  const frost = '#e9e4d8';
  f.ball(coat.base, [0, 0.62, -0.02], [0.4, 0.36, 0.6]);
  f.ball(frost, [0, 0.62, 0.3], [0.3, 0.32, 0.26]);
  for (const z of [0.12, -0.1, -0.32]) f.ball(coat.dark, [0, 0.93, z], [0.34, 0.05, 0.065]);
  f.ball(coat.head, [0, 0.99, 0.33], [0.33, 0.3, 0.3]);
  f.ball(frost, [0, 0.9, 0.58], [0.16, 0.13, 0.22]);
  f.ball('#4a3a30', [0, 0.93, 0.79], [0.05, 0.04, 0.03]);
  for (const [x, tilt, height] of [
    [-0.09, 0.35, 1.32],
    [0, 0, 1.36],
    [0.09, -0.35, 1.32],
  ])
    f.ball(x ? accent.base : accent.light, [x, height, 0.28], [0.06, 0.2, 0.12]).rotation.set(
      -0.25,
      0,
      tilt,
    );
  for (const side of [-1, 1]) {
    const ear = f.add(f.kit.cone, coat.ear, [side * 0.21, 1.27, 0.24], [0.12, 0.26, 0.09]);
    ear.rotation.z = -side * 0.3;
    f.ear(ear, side);
    const inner = f.add(f.kit.cone, frost, [side * 0.21, 1.25, 0.28], [0.065, 0.16, 0.04]);
    inner.rotation.z = -side * 0.3;
    f.ear(inner, side);
    // Frosted brows over eyes that squint kindly.
    f.ball(frost, [side * 0.15, 1.1, 0.56], [0.07, 0.028, 0.03]);
    for (const front of [-1, 1])
      f.leg(coat.dark, [side * 0.25, 0.17, front * 0.3], [0.1, 0.17, 0.13]);
  }
  f.eyes(0.15, 1.02, 0.55, 0.85);
  for (const eye of f.parts.eyes) eye.userData['open'] = (eye.userData['open'] as number) * 0.62;
  f.parts.tail.position.set(0, 0.6, -0.5);
  const brush = f.ball(coat.base, [0, 0.1, -0.28], [0.19, 0.19, 0.44], f.parts.tail);
  brush.rotation.x = -0.45;
  f.ball(frost, [0, 0.3, -0.64], [0.13, 0.13, 0.17], f.parts.tail);
  for (const side of [-1, 1])
    f.ball(accent.base, [side * 0.12, 0.04, -0.06], [0.05, 0.16, 0.1], f.parts.tail).rotation.z =
      side * 0.6;
  f.parts.back = 0.92;
  f.parts.height = 1.7;
};

const BUILDS: Record<FamilyId, Build> = {
  avian,
  reptile,
  canine,
  feline,
  bovine,
  ursine,
  equine,
  slime,
  insect,
};

/**
 * Builds a critter into `root` from its family (or Brindlekin) and individual appearance.
 * Unknown kinds fall back to the canine plan.
 */
export function buildFigure(
  kit: FigureKit,
  root: THREE.Group,
  speciesId: string,
  appearance: Appearance,
  kerchief: boolean,
): FigureParts {
  const family = (speciesId in BUILDS ? speciesId : 'canine') as FamilyId;
  const lineage = speciesId === 'brindlekin';
  const frame = new THREE.Group();
  frame.scale.setScalar((lineage ? 0.95 : FAMILY_SCALE[family]) * appearance.size);
  root.add(frame);
  const figure = new FigureBuilder(kit, frame, appearance);
  (lineage ? brindlekin : BUILDS[family])(figure, kerchief);
  const scale = frame.scale.x;
  figure.parts.height *= scale;
  return figure.parts;
}

export function appearanceKey(speciesId: string, appearance: Appearance): string {
  return `${speciesId}:${appearance.coat}:${appearance.accent}:${appearance.size}`;
}
