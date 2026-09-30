import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { AreaId, Season } from '../model';
import { fbm, PALETTES, scatter, smoothstep, type SeasonPalette } from './palette';
import { addWind } from './wind';

/** Scenery outside the playable square: presentation only, never walkable. */
export interface Surroundings {
  group: THREE.Group;
  update(time: number, light: number, sky: THREE.Color): void;
  dispose(): void;
}

type Pair = [number, number];
interface Layout {
  seed: number;
  river?: Pair[];
  crossing?: { x: number; z: number; angle: number };
  paths: Pair[][];
  // Hedge gaps where paths leave the playable square.
  openings: Pair[];
}

const RIVER_HALF = 1.35;
const PLAYABLE_EDGE = 10.3;
// Horizontal direction toward the camera; tall scenery on this side would hide the yard.
const TOWARD_CAMERA = new THREE.Vector2(17, 25).normalize();
// Screen height of an object covers ground about this far behind it (camera ~36° up).
const OCCLUSION_PER_HEIGHT = 1.4;

/** Whether scenery of this height at (x, z) would stand between the camera and play. */
function occludesPlay(x: number, z: number, height: number): boolean {
  const reach = height * OCCLUSION_PER_HEIGHT;
  for (let t = 0; t <= reach; t += 0.75) {
    const qx = x - TOWARD_CAMERA.x * t;
    const qz = z - TOWARD_CAMERA.y * t;
    if (Math.abs(qx) < PLAYABLE_EDGE - 0.4 && Math.abs(qz) < PLAYABLE_EDGE - 0.4) return true;
  }
  return false;
}
const LAYOUTS: Partial<Record<AreaId, Layout>> = {
  homestead: {
    seed: 97,
    river: [
      [12.2, -46],
      [11.3, -20],
      [12.7, -7],
      [12.4, 0],
      [13.3, 7],
      [15.6, 18],
      [21, 46],
    ],
    crossing: { x: 12.45, z: 0, angle: 0 },
    paths: [
      [
        [9, 0],
        [12.5, 0.05],
        [17, 0.9],
        [26, 2.6],
        [46, 5],
      ],
    ],
    openings: [[10, 0]],
  },
  glade: {
    seed: 301,
    river: [
      [-12.2, 46],
      [-11.4, 20],
      [-12.8, 6],
      [-12.4, 0],
      [-13.1, -7],
      [-15.7, -18],
      [-21, -46],
    ],
    crossing: { x: -12.45, z: 0, angle: Math.PI },
    paths: [
      [
        [-9, 0],
        [-12.5, -0.05],
        [-17, -0.9],
        [-26, -2.5],
        [-46, -5],
      ],
      [
        [7.6, -4.4],
        [10.6, -5.4],
        [16, -7.6],
        [26, -11],
        [46, -16],
      ],
    ],
    openings: [
      [-10, 0],
      [10, -4.6],
    ],
  },
  colosseum: {
    seed: 733,
    paths: [
      [
        [-9, 4],
        [-14, 4.6],
        [-24, 6],
        [-46, 8],
      ],
    ],
    openings: [[-10, 4]],
  },
};

/** Samples a smooth curve through control points into a polyline. */
function polyline(points: Pair[], samples: number): Pair[] {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  return curve.getSpacedPoints(samples).map((point) => [point.x, point.z]);
}

function distanceToPolyline(x: number, z: number, line: Pair[]): number {
  let best = Infinity;
  for (let index = 1; index < line.length; index++) {
    const [ax, az] = line[index - 1];
    const [bx, bz] = line[index];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

/** Gives every vertex of a part the same color, dropping UVs so parts can merge. */
function paint(geometry: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const part = geometry.index ? geometry.toNonIndexed() : geometry;
  part.deleteAttribute('uv');
  const colors = new Float32Array(part.attributes['position'].count * 3);
  for (let index = 0; index < colors.length; index += 3) {
    colors[index] = color.r;
    colors[index + 1] = color.g;
    colors[index + 2] = color.b;
  }
  part.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return part;
}

function part(
  geometry: THREE.BufferGeometry,
  color: string,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
  rotation: [number, number, number] = [0, 0, 0],
): THREE.BufferGeometry {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  );
  geometry.applyMatrix4(matrix);
  return paint(geometry, new THREE.Color(color));
}

function roundTree(canopy: [string, string, string], trunk: string, snow: boolean) {
  const lobe = () => new THREE.IcosahedronGeometry(1, 1);
  const parts = [
    part(new THREE.CylinderGeometry(0.15, 0.24, 2.3, 7), trunk, [0, 1.15, 0]),
    part(
      new THREE.CylinderGeometry(0.06, 0.1, 1, 6),
      trunk,
      [0.32, 1.9, 0],
      [1, 1, 1],
      [0, 0, -0.7],
    ),
    part(lobe(), canopy[0], [0, 2.75, 0], [1.15, 1.22, 1.06]),
    part(lobe(), canopy[1], [-0.68, 2.45, 0.14], [0.86, 0.92, 0.83]),
    part(lobe(), canopy[1], [0.66, 2.55, 0.18], [0.85, 0.94, 0.86]),
    part(lobe(), canopy[2], [0.08, 3.35, 0.14], [0.86, 0.84, 0.84]),
  ];
  if (snow) parts.push(part(lobe(), '#f6f8f8', [0.04, 3.62, 0.12], [0.74, 0.34, 0.72]));
  return mergeGeometries(parts)!;
}

function bareTree(trunk: string) {
  const parts = [part(new THREE.CylinderGeometry(0.14, 0.24, 2.6, 7), trunk, [0, 1.3, 0])];
  for (let branch = 0; branch < 5; branch++) {
    const angle = branch * 1.3;
    parts.push(
      part(
        new THREE.CylinderGeometry(0.04, 0.08, 1.3, 5),
        trunk,
        [Math.cos(angle) * 0.34, 2.1 + branch * 0.2, Math.sin(angle) * 0.34],
        [1, 1, 1],
        [Math.sin(angle) * 0.8, 0, -Math.cos(angle) * 0.8],
      ),
    );
  }
  parts.push(part(new THREE.IcosahedronGeometry(1, 0), '#f3f6f6', [0, 3.1, 0], [0.5, 0.2, 0.5]));
  return mergeGeometries(parts)!;
}

function conifer(colors: [string, string], trunk: string, snow: boolean) {
  const tiers: [number, number, number][] = [
    [1.35, 1.9, 1.9],
    [1.05, 1.6, 2.95],
    [0.72, 1.35, 3.85],
  ];
  const parts = [part(new THREE.CylinderGeometry(0.14, 0.2, 1.3, 6), trunk, [0, 0.65, 0])];
  tiers.forEach(([radius, height, y], index) => {
    parts.push(part(new THREE.ConeGeometry(radius, height, 8), colors[index % 2], [0, y, 0]));
    if (snow)
      parts.push(
        part(new THREE.ConeGeometry(radius * 0.72, height * 0.42, 8), '#f4f7f7', [
          0,
          y + height * 0.33,
          0,
        ]),
      );
  });
  return mergeGeometries(parts)!;
}

function bush(colors: [string, string]) {
  return mergeGeometries([
    part(new THREE.IcosahedronGeometry(1, 1), colors[0], [0, 0.42, 0], [0.62, 0.5, 0.58]),
    part(new THREE.IcosahedronGeometry(1, 1), colors[1], [0.42, 0.34, 0.1], [0.44, 0.38, 0.42]),
    part(new THREE.IcosahedronGeometry(1, 1), colors[1], [-0.38, 0.3, -0.08], [0.4, 0.34, 0.4]),
  ])!;
}

/** Builds terrain, forest, brook and paths beyond an outdoor area's fence. */
export function buildSurroundings(area: AreaId, season: Season, detail: number): Surroundings {
  const layout = LAYOUTS[area] ?? { seed: 11, paths: [], openings: [] };
  const palette: SeasonPalette = PALETTES[season];
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(item: T): T => {
    disposables.push(item);
    return item;
  };
  const river = layout.river ? polyline(layout.river, 160) : null;
  const paths = layout.paths.map((path) => polyline(path, 60));
  const riverDistance = (x: number, z: number) =>
    river ? distanceToPolyline(x, z, river) : Infinity;
  const pathDistance = (x: number, z: number) =>
    paths.reduce((best, path) => Math.min(best, distanceToPolyline(x, z, path)), Infinity);

  const height = (x: number, z: number): number => {
    const edge = Math.max(Math.abs(x), Math.abs(z));
    let rim = smoothstep(PLAYABLE_EDGE + 0.3, 18, edge) * smoothstep(1.4, 5.5, pathDistance(x, z));
    let h =
      rim * (0.45 + fbm(x * 0.07, z * 0.07, layout.seed) * 3.3) + smoothstep(24, 46, edge) * 3;
    if (river) {
      const r = riverDistance(x, z);
      rim = smoothstep(RIVER_HALF, RIVER_HALF + 4.5, r);
      h *= rim;
      const bed = smoothstep(RIVER_HALF + 1.4, RIVER_HALF - 0.3, r);
      h = h * (1 - bed) - 0.55 * bed;
    }
    return h;
  };

  // Ground: one faceted sheet, flat inside the playable square.
  const size = 96;
  const segments = Math.round(64 + 32 * detail);
  const ground = keep(new THREE.PlaneGeometry(size, size, segments, segments));
  ground.rotateX(-Math.PI / 2);
  const positions = ground.attributes['position'];
  const colors = new Float32Array(positions.count * 3);
  const grass = new THREE.Color(palette.grass);
  const grassLight = new THREE.Color(palette.grassLight);
  const meadow = new THREE.Color(palette.meadow);
  const forestFloor = new THREE.Color(palette.forestFloor);
  const bank = new THREE.Color(palette.bank);
  const color = new THREE.Color();
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const y = height(x, z);
    positions.setY(index, y);
    const edge = Math.max(Math.abs(x), Math.abs(z));
    color.copy(grass).lerp(grassLight, fbm(x * 0.16, z * 0.16, layout.seed + 5));
    color.lerp(meadow, smoothstep(PLAYABLE_EDGE, PLAYABLE_EDGE + 3, edge) * 0.8);
    color.lerp(forestFloor, smoothstep(14, 22, edge) * 0.75);
    if (river)
      color.lerp(bank, smoothstep(RIVER_HALF + 1.6, RIVER_HALF + 0.2, riverDistance(x, z)));
    color.offsetHSL(0, 0, Math.min(0.06, Math.max(-0.04, y * 0.012)));
    colors.set([color.r, color.g, color.b], index * 3);
  }
  ground.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  ground.computeVertexNormals();
  const groundMaterial = keep(
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }),
  );
  const groundMesh = new THREE.Mesh(ground, groundMaterial);
  groundMesh.receiveShadow = true;
  groundMesh.position.y = -0.002;
  group.add(groundMesh);

  const foliage = keep(
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }),
  );
  // Canopies sway; bushes are too short to bend.
  addWind(foliage, 'tree');
  const random = scatter(layout.seed * 31 + season.length);
  const instanced = (geometry: THREE.BufferGeometry, count: number): THREE.InstancedMesh => {
    const mesh = new THREE.InstancedMesh(keep(geometry), foliage, Math.max(1, count));
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    keep(mesh);
    group.add(mesh);
    return mesh;
  };
  const transform = new THREE.Object3D();
  const tint = new THREE.Color();
  const place = (
    mesh: THREE.InstancedMesh,
    x: number,
    z: number,
    scale: number,
    lift = 0,
  ): void => {
    if (mesh.count >= mesh.instanceMatrix.count) return;
    transform.position.set(x, height(x, z) - 0.04 + lift, z);
    transform.rotation.set(0, random() * Math.PI * 2, 0);
    transform.scale.setScalar(scale);
    transform.updateMatrix();
    mesh.setMatrixAt(mesh.count, transform.matrix);
    mesh.setColorAt(mesh.count, tint.setScalar(0.86 + random() * 0.22));
    mesh.count++;
  };

  const bushes = instanced(bush(palette.bush), Math.round(300 * Math.max(0.6, detail)));
  // Forest ring: denser and more coniferous with distance.
  const treeBudget = Math.round(560 * detail);
  const rounds = instanced(
    palette.snow ? bareTree(palette.trunk) : roundTree(palette.canopy, palette.trunk, false),
    treeBudget,
  );
  const accents = palette.accent
    ? instanced(roundTree(palette.accent, palette.trunk, false), Math.round(treeBudget * 0.35))
    : null;
  const conifers = instanced(conifer(palette.conifer, palette.trunk, palette.snow), treeBudget);
  for (
    let attempt = 0;
    attempt < treeBudget * 9 && rounds.count + conifers.count < treeBudget;
    attempt++
  ) {
    const x = (random() * 2 - 1) * 34;
    const z = (random() * 2 - 1) * 34;
    const edge = Math.max(Math.abs(x), Math.abs(z));
    if (edge < PLAYABLE_EDGE + 2.2) continue;
    if (random() > smoothstep(PLAYABLE_EDGE + 1.5, 17, edge) * 0.95) continue;
    if (riverDistance(x, z) < RIVER_HALF + 2 || pathDistance(x, z) < 2.6) continue;
    const scale = 0.85 + random() * 0.45 + smoothstep(14, 30, edge) * 0.35;
    // Trees on the camera side stay back far enough that the yard is never hidden.
    if (occludesPlay(x, z, 4.4 * scale)) {
      if (random() < 0.45 && !occludesPlay(x, z, 0.9)) place(bushes, x, z, 0.7 + random() * 0.6);
      continue;
    }
    const pick = random();
    if (pick < 0.22 + smoothstep(15, 30, edge) * 0.35) place(conifers, x, z, scale);
    else if (accents && pick > 0.78) place(accents, x, z, scale);
    else place(rounds, x, z, scale);
  }

  // Hedges mark the playable edge wherever a fence does not.
  for (const side of [-1, 1])
    for (let t = -PLAYABLE_EDGE; t <= PLAYABLE_EDGE; t += 1.05) {
      for (const [x, z] of [
        [t, side * PLAYABLE_EDGE],
        [side * PLAYABLE_EDGE, t],
      ] as Pair[]) {
        if (layout.openings.some(([ox, oz]) => Math.hypot(x - ox, z - oz) < 2.3)) continue;
        if (riverDistance(x, z) < RIVER_HALF + 0.6) continue;
        place(
          bushes,
          x + (random() - 0.5) * 0.4,
          z + (random() - 0.5) * 0.4,
          0.7 + random() * 0.45,
        );
      }
    }
  for (let extra = 0; extra < 40 * detail; extra++) {
    const x = (random() * 2 - 1) * 20;
    const z = (random() * 2 - 1) * 20;
    const edge = Math.max(Math.abs(x), Math.abs(z));
    if (
      edge < PLAYABLE_EDGE + 1 ||
      riverDistance(x, z) < RIVER_HALF + 1 ||
      pathDistance(x, z) < 1.8
    )
      continue;
    place(bushes, x, z, 0.6 + random() * 0.7);
  }

  // Meadow grass and flowers between the hedge and the trees.
  const bladeMaterial = keep(new THREE.MeshStandardMaterial({ color: palette.blade, roughness: 1 }));
  addWind(bladeMaterial, 'blade');
  const blades = new THREE.InstancedMesh(
    keep(new THREE.ConeGeometry(0.35, 1, 4)),
    bladeMaterial,
    Math.round(1100 * detail),
  );
  const petals = new THREE.InstancedMesh(
    keep(new THREE.IcosahedronGeometry(1, 0)),
    keep(new THREE.MeshStandardMaterial({ color: palette.flower, roughness: 0.8 })),
    Math.round(260 * detail),
  );
  keep(blades);
  keep(petals);
  blades.count = 0;
  petals.count = 0;
  for (let attempt = 0; attempt < blades.instanceMatrix.count * 2; attempt++) {
    const x = (random() * 2 - 1) * 19;
    const z = (random() * 2 - 1) * 19;
    const edge = Math.max(Math.abs(x), Math.abs(z));
    if (
      edge < PLAYABLE_EDGE - 0.4 ||
      riverDistance(x, z) < RIVER_HALF + 0.4 ||
      pathDistance(x, z) < 0.9
    )
      continue;
    const size = 0.12 + random() * 0.14;
    transform.position.set(x, height(x, z) + size * 0.4, z);
    transform.rotation.set(0, random() * Math.PI, random() * 0.4 - 0.2);
    transform.scale.set(size * 0.35, size, size * 0.35);
    transform.updateMatrix();
    if (blades.count < blades.instanceMatrix.count)
      blades.setMatrixAt(blades.count++, transform.matrix);
    if (!palette.snow && random() < 0.25 && petals.count < petals.instanceMatrix.count) {
      transform.position.y += size * 0.62;
      transform.scale.setScalar(0.055);
      transform.updateMatrix();
      petals.setMatrixAt(petals.count++, transform.matrix);
    }
  }
  blades.receiveShadow = true;
  group.add(blades, petals);

  // Paths continue past the gates toward the rest of the world.
  const pathMaterial = keep(
    new THREE.MeshStandardMaterial({ color: palette.snow ? '#d9d2c2' : '#e1ce9b', roughness: 1 }),
  );
  for (const line of paths) {
    const vertices: number[] = [];
    const indices: number[] = [];
    for (let index = 0; index < line.length; index++) {
      const [x, z] = line[index];
      const [nx, nz] = line[Math.min(line.length - 1, index + 1)];
      const [px, pz] = line[Math.max(0, index - 1)];
      const length = Math.hypot(nx - px, nz - pz) || 1;
      const ox = (-(nz - pz) / length) * 0.68;
      const oz = ((nx - px) / length) * 0.68;
      const y =
        Math.max(height(x, z), river && riverDistance(x, z) < RIVER_HALF + 0.8 ? 0.08 : -1) + 0.04;
      vertices.push(x + ox, y, z + oz, x - ox, y, z - oz);
      if (index) {
        const a = (index - 1) * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geometry = keep(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, pathMaterial);
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // The brook: a stylized, animated ribbon with foam at its banks.
  let water: THREE.ShaderMaterial | null = null;
  if (river) {
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let along = 0;
    for (let index = 0; index < river.length; index++) {
      const [x, z] = river[index];
      const [nx, nz] = river[Math.min(river.length - 1, index + 1)];
      const [px, pz] = river[Math.max(0, index - 1)];
      const length = Math.hypot(nx - px, nz - pz) || 1;
      const ox = (-(nz - pz) / length) * (RIVER_HALF + 0.25);
      const oz = ((nx - px) / length) * (RIVER_HALF + 0.25);
      if (index) along += Math.hypot(x - river[index - 1][0], z - river[index - 1][1]);
      vertices.push(x + ox, -0.16, z + oz, x - ox, -0.16, z - oz);
      uvs.push(0, along, 1, along);
      if (index) {
        const a = (index - 1) * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geometry = keep(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    water = keep(
      new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          uTime: { value: 0 },
          uLight: { value: 1 },
          uDeep: { value: new THREE.Color(palette.snow ? '#7f9fae' : '#4f8e95') },
          uShallow: { value: new THREE.Color(palette.snow ? '#b9d0d8' : '#86bfb8') },
          uFoam: { value: new THREE.Color('#f4fbf6') },
          uSky: { value: new THREE.Color('#dfeae2') },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vWorld;
          void main() {
            vUv = uv;
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uLight;
          uniform vec3 uDeep;
          uniform vec3 uShallow;
          uniform vec3 uFoam;
          uniform vec3 uSky;
          varying vec2 vUv;
          varying vec3 vWorld;
          void main() {
            float across = abs(vUv.x - 0.5) * 2.0;
            float flow = vUv.y * 0.42 - uTime * 0.32;
            float ripple = sin(flow * 11.0 + sin(vWorld.x * 1.9 + uTime * 0.8) * 1.4) * 0.5 + 0.5;
            float glint = smoothstep(0.9, 1.0, sin(vWorld.x * 3.3 + uTime * 1.4) * sin(vWorld.z * 2.9 - uTime * 1.2));
            vec3 color = mix(uDeep, uShallow, smoothstep(0.15, 0.95, across));
            color += (ripple - 0.5) * 0.06;
            float foam = smoothstep(0.8, 0.98, across + sin(flow * 7.0 + vWorld.z * 1.3) * 0.06);
            color = mix(color, uFoam, foam * 0.8);
            color += glint * 0.22;
            // The surface borrows the sky's hue, more so as light fades.
            color = mix(color * uLight, uSky, 0.16 + (1.0 - uLight) * 0.34);
            gl_FragColor = vec4(color, 0.9);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    );
    const mesh = new THREE.Mesh(geometry, water);
    mesh.renderOrder = 1;
    group.add(mesh);
  }

  // A plank bridge carries the path over the brook.
  if (layout.crossing) {
    const wood = ['#b89366', '#a8835a', '#9a7650'];
    const parts: THREE.BufferGeometry[] = [];
    const span = RIVER_HALF * 2 + 2.6;
    for (let plank = 0; plank < 17; plank++) {
      const x = -span / 2 + (plank + 0.5) * (span / 17);
      parts.push(
        part(new THREE.BoxGeometry(span / 17 - 0.03, 0.1, 1.7), wood[plank % 2], [
          x,
          0.2 - Math.abs(x) * 0.02,
          0,
        ]),
      );
    }
    for (const side of [-1, 1]) {
      parts.push(part(new THREE.BoxGeometry(span, 0.14, 0.12), wood[2], [0, 0.1, side * 0.78]));
      for (let post = 0; post < 4; post++)
        parts.push(
          part(new THREE.BoxGeometry(0.11, 0.62, 0.11), wood[2], [
            -span / 2 + 0.3 + post * ((span - 0.6) / 3),
            0.5,
            side * 0.84,
          ]),
        );
      parts.push(
        part(new THREE.BoxGeometry(span - 0.3, 0.09, 0.1), wood[0], [0, 0.78, side * 0.84]),
      );
    }
    const timber = keep(
      new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }),
    );
    const bridge = new THREE.Mesh(keep(mergeGeometries(parts)!), timber);
    bridge.position.set(layout.crossing.x, 0, layout.crossing.z);
    bridge.rotation.y = layout.crossing.angle;
    bridge.castShadow = true;
    bridge.receiveShadow = true;
    group.add(bridge);
  }

  return {
    group,
    update(time: number, light: number, sky: THREE.Color) {
      if (water) {
        water.uniforms['uTime'].value = time;
        water.uniforms['uLight'].value = light;
        water.uniforms['uSky'].value.copy(sky);
      }
    },
    dispose() {
      disposables.forEach((item) => item.dispose());
      group.clear();
    },
  };
}
