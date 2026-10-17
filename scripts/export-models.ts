// Writes every code-built figure to public/models/<kind>.glb, so they can be edited in
// Blender and loaded by the game. Run with `npm run export:models`; it overwrites the files.
import { mkdirSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { buildFigure, FIGURE_KINDS, type FigureKit } from '../src/app/game/render/figures';

// The exporter reads its buffers through a FileReader, which Node does not have.
class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onload: (() => void) | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob): void {
    void blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onload?.();
      this.onloadend?.();
    });
  }
  readAsDataURL(blob: Blob): void {
    void blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`;
      this.onload?.();
      this.onloadend?.();
    });
  }
}
(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader;

const materials = new Map<string, THREE.MeshStandardMaterial>();
const material = (color: string) => {
  let made = materials.get(color);
  if (!made) {
    made = new THREE.MeshStandardMaterial({ color, roughness: 0.91, metalness: 0 });
    made.name = color;
    materials.set(color, made);
  }
  return made;
};
const kit: FigureKit = {
  mesh(geometry, color, position = [0, 0, 0], scale = [1, 1, 1]) {
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    return mesh;
  },
  material,
  sphere: new THREE.SphereGeometry(1, 16, 12),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
  cone: new THREE.ConeGeometry(1, 1, 7),
  torus: new THREE.TorusGeometry(0.26, 0.057, 6, 18),
};

mkdirSync('public/models', { recursive: true });
const exporter = new GLTFExporter();
for (const kind of FIGURE_KINDS) {
  const root = new THREE.Group();
  root.name = kind;
  // A neutral coat and accent; the game recolours each part by its role.
  buildFigure(kit, root, kind, { coat: 'cream', accent: 'moss', size: 1 }, true);
  const glb = (await exporter.parseAsync(root, { binary: true })) as ArrayBuffer;
  writeFileSync(`public/models/${kind}.glb`, Buffer.from(glb));
  console.log(`public/models/${kind}.glb · ${(glb.byteLength / 1024).toFixed(1)} kB`);
}
