import * as THREE from 'three';
import { AREAS } from './content';
import type { GameState, Point } from './model';

interface WorldLabel {
  element: HTMLDivElement;
  position: THREE.Vector3;
  always?: boolean;
}

/** A view of the simulation. Geometry and animation never change game state. */
export class GameWorld {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-15, 15, 11, -11, 0.1, 120);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly observer: ResizeObserver;
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly box = this.keep(new THREE.BoxGeometry(1, 1, 1));
  private readonly sphere = this.keep(new THREE.SphereGeometry(1, 16, 12));
  private readonly pebble = this.keep(new THREE.IcosahedronGeometry(1, 1));
  private readonly cylinder = this.keep(new THREE.CylinderGeometry(1, 1, 1, 12));
  private readonly cone = this.keep(new THREE.ConeGeometry(1, 1, 7));
  private readonly raycaster = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly pointer = new THREE.Vector2();
  private readonly intersection = new THREE.Vector3();
  private readonly projection = new THREE.Vector3();
  private readonly sun = new THREE.DirectionalLight('#fff0ce', 3.3);
  private readonly hemisphere = new THREE.HemisphereLight('#eff7f1', '#988872', 2.6);
  private readonly scenery = new THREE.Group();
  private readonly farmer = new THREE.Group();
  private readonly critter = new THREE.Group();
  private readonly farmerBody = new THREE.Group();
  private readonly critterBody = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly farmerLegs: THREE.Mesh[] = [];
  private readonly critterLegs: THREE.Mesh[] = [];
  private readonly labelLayer = document.createElement('div');
  private readonly labels: WorldLabel[] = [];
  private readonly critterLabel: HTMLDivElement;
  private readonly berries = new Map<string, THREE.Group>();
  private readonly crops = new THREE.Group();
  private readonly smoke = new THREE.Group();
  private readonly shedRoof = new THREE.Group();
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private area = '';
  private clock = 0;
  private width = 1;
  private height = 1;
  private lastPlayer = new THREE.Vector2();
  private lastCritter = new THREE.Vector2();
  private permanentGeometryCount = 0;

  constructor(
    private readonly container: HTMLElement,
    private readonly onWalk: (point: Point) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.13;
    this.renderer.domElement.style.cssText =
      'display:block;width:100%;height:100%;touch-action:none;';
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Your ranch. Click or tap the ground to walk.',
    );
    this.renderer.domElement.setAttribute('role', 'img');
    this.container.appendChild(this.renderer.domElement);
    this.labelLayer.style.cssText =
      'position:absolute;inset:0;overflow:hidden;pointer-events:none;user-select:none;';
    this.labelLayer.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.labelLayer);
    this.critterLabel = this.makeLabel('Pip', true);
    this.scene.background = new THREE.Color('#dce9e3');
    this.scene.fog = new THREE.Fog('#dce9e3', 49, 95);
    this.camera.position.set(17, 22, 25);
    this.camera.lookAt(0, 0, 0);
    this.sun.position.set(-11, 22, 13);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17 });
    this.sun.shadow.normalBias = 0.06;
    this.sun.shadow.bias = -0.0001;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.hemisphere, this.scenery, this.farmer, this.critter);
    const backdrop = this.mesh(this.box, '#dce9e3', [0, -1.58, 0], [180, 0.1, 180]);
    backdrop.receiveShadow = true;
    this.scene.add(backdrop);
    this.buildFarmer();
    this.buildCritter();
    this.permanentGeometryCount = this.geometries.length;
    this.renderer.domElement.addEventListener('pointerdown', this.walk);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
  }

  render(state: GameState, dtSeconds: number): void {
    const dt = Math.min(Math.max(dtSeconds, 0), 0.1);
    this.clock += this.reducedMotion ? 0 : dt;
    if (this.area !== state.areaId) {
      this.area = state.areaId;
      this.buildArea(state);
      this.lastPlayer.set(state.player.position.x, state.player.position.z);
      this.lastCritter.set(state.critter.position.x, state.critter.position.z);
    }
    const playerMoving = this.animateActor(
      this.farmer,
      state.player.position,
      this.lastPlayer,
      this.farmerLegs,
      0.32,
    );
    const critterMoving = this.animateActor(
      this.critter,
      state.critter.position,
      this.lastCritter,
      this.critterLegs,
      0.16,
    );
    this.farmerBody.position.y = playerMoving ? Math.abs(Math.sin(this.clock * 11)) * 0.07 : 0;
    this.critterBody.position.y =
      critterMoving || state.training
        ? Math.abs(Math.sin(this.clock * 12)) * 0.11
        : Math.sin(this.clock * 2.4) * 0.025;
    this.tail.rotation.z = Math.sin(this.clock * 3.2) * 0.12;
    this.tail.rotation.x = Math.sin(this.clock * 2.1) * 0.07;
    this.critterLabel.textContent = state.critter.name;
    this.positionLabel(
      this.critterLabel,
      this.projection.set(state.critter.position.x, 1.9, state.critter.position.z),
    );
    for (const [id, cluster] of this.berries) {
      cluster.visible = state.resources.find((node) => node.id === id)?.available ?? false;
    }
    if (state.areaId === 'homestead') {
      this.crops.visible = state.crop.plantedAt !== null;
      const ready = state.crop.readyAt !== null && state.totalMinutes >= state.crop.readyAt;
      const growth = ready ? 1 : state.crop.watered ? 0.63 : 0.35;
      this.crops.scale.set(1, growth, 1);
      for (const crop of this.crops.children) {
        const fruit = crop.getObjectByName('fruit');
        if (fruit) fruit.visible = ready;
      }
      for (const roof of this.shedRoof.children) {
        (roof as THREE.Mesh).material = this.material(state.shedLevel > 0 ? '#426d65' : '#859078');
      }
      this.smoke.children.forEach((puff, index) => {
        const t = (this.clock * 0.2 + index * 0.29) % 1;
        puff.position.set(-4.22 + t * 0.4, 4.1 + t * 1.15, -4.7);
        puff.scale.setScalar(0.13 + t * 0.23);
      });
    }
    const daylight = Math.max(0, Math.sin(((state.minute - 360) / 840) * Math.PI));
    this.sun.intensity = 1.3 + daylight * 2;
    this.hemisphere.intensity = 1.8 + daylight * 0.8;
    this.sun.color.set(daylight < 0.25 ? '#f7bd87' : '#fff0ce');
    for (const label of this.labels) {
      const distance = Math.hypot(
        label.position.x - state.player.position.x,
        label.position.z - state.player.position.z,
      );
      label.element.style.opacity = label.always || distance < 5 ? '1' : '0';
      this.positionLabel(label.element, label.position);
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.observer.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.walk);
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelLayer.remove();
  }

  private readonly walk = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (this.raycaster.ray.intersectPlane(this.ground, this.intersection)) {
      this.onWalk({
        x: THREE.MathUtils.clamp(this.intersection.x, -8.8, 8.8),
        z: THREE.MathUtils.clamp(this.intersection.z, -8.8, 8.8),
      });
    }
  };

  private resize(): void {
    this.width = Math.max(this.container.clientWidth, 1);
    this.height = Math.max(this.container.clientHeight, 1);
    const aspect = this.width / this.height;
    const vertical = Math.max(10.4, 13.4 / aspect);
    this.camera.left = -vertical * aspect;
    this.camera.right = vertical * aspect;
    this.camera.top = vertical;
    this.camera.bottom = -vertical;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
  }

  private keep<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }

  private material(color: string): THREE.MeshStandardMaterial {
    let material = this.materials.get(color);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness: 0.91, metalness: 0 });
      this.materials.set(color, material);
    }
    return material;
  }

  private mesh(
    geometry: THREE.BufferGeometry,
    color: string,
    position: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1],
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, this.material(color));
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private buildArea(state: GameState): void {
    this.scenery.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    this.scenery.clear();
    this.geometries.splice(this.permanentGeometryCount).forEach((geometry) => geometry.dispose());
    this.berries.clear();
    this.crops.clear();
    this.smoke.clear();
    this.shedRoof.clear();
    this.labels.forEach((label) => label.element.remove());
    this.labels.length = 0;
    this.island();
    if (state.areaId === 'homestead') this.homestead();
    else this.glade(state);
    this.grass(state.areaId === 'homestead' ? 97 : 301);
  }

  private island(): void {
    const shape = new THREE.Shape();
    const e = 9.25;
    const r = 2.3;
    shape.moveTo(-e + r, -e);
    shape.lineTo(e - r, -e);
    shape.quadraticCurveTo(e, -e, e, -e + r);
    shape.lineTo(e, e - r);
    shape.quadraticCurveTo(e, e, e - r, e);
    shape.lineTo(-e + r, e);
    shape.quadraticCurveTo(-e, e, -e, e - r);
    shape.lineTo(-e, -e + r);
    shape.quadraticCurveTo(-e, -e, -e + r, -e);
    const geometry = this.keep(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.88,
        bevelEnabled: true,
        bevelSize: 0.22,
        bevelThickness: 0.2,
        bevelSegments: 3,
        steps: 1,
        curveSegments: 8,
      }),
    );
    const island = new THREE.Mesh(geometry, [this.material('#91ad66'), this.material('#bc9670')]);
    island.rotation.x = -Math.PI / 2;
    island.position.y = -1.08;
    island.receiveShadow = true;
    island.castShadow = true;
    this.scenery.add(island);
    const grassTop = new THREE.Mesh(
      this.keep(new THREE.ShapeGeometry(shape)),
      this.material('#9ab66d'),
    );
    grassTop.rotation.x = -Math.PI / 2;
    grassTop.position.y = 0.015;
    grassTop.receiveShadow = true;
    this.scenery.add(grassTop);
    for (let index = 0; index < 17; index++) {
      const angle = (index / 17) * Math.PI * 2;
      const x = Math.cos(angle) * 8.8;
      const z = Math.sin(angle) * 8.8;
      this.scenery.add(
        this.mesh(
          this.pebble,
          index % 2 ? '#c9af86' : '#bca17c',
          [x, -0.65, z],
          [0.35, 0.18, 0.28],
        ),
      );
    }
  }

  private path(points: [number, number][], width = 1.2, color = '#e1ce9b'): void {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, z]) => new THREE.Vector3(x, 0.035, z)),
    );
    const vertices: number[] = [];
    const normals: number[] = [];
    for (let step = 0; step <= 72; step++) {
      const t = step / 72;
      const p = curve.getPoint(t);
      const tangent = curve.getTangent(t);
      const x = -tangent.z * width * 0.5;
      const z = tangent.x * width * 0.5;
      vertices.push(p.x + x, p.y, p.z + z, p.x - x, p.y, p.z - z);
      normals.push(0, 1, 0, 0, 1, 0);
    }
    const indices: number[] = [];
    for (let step = 0; step < 72; step++) {
      const a = step * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const geometry = this.keep(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    const path = new THREE.Mesh(geometry, this.material(color));
    path.receiveShadow = true;
    this.scenery.add(path);
  }

  private homestead(): void {
    this.path(
      [
        [-5, -2.3],
        [-4, -0.7],
        [-1.1, 0],
        [2.8, -0.4],
        [6, -0.1],
        [9.2, 0],
      ],
      1.35,
    );
    this.path(
      [
        [-1.8, -0.15],
        [-1.3, 2.5],
        [-2.5, 4.6],
        [-6, 5.4],
      ],
      1,
    );
    this.path(
      [
        [2.3, -0.3],
        [3.6, -1.7],
        [4, -2.8],
      ],
      0.85,
    );
    this.path(
      [
        [-1.25, 2.5],
        [1, 4.5],
        [2.3, 6.6],
      ],
      0.9,
    );
    this.cottage(-5, -4);
    this.shed(4, -4);
    this.garden(-5, 2);
    this.training(3, 2);
    this.market(-6, 5);
    this.race(2, 6);
    const trees: [number, number, number][] = [
      [-7.3, -6.7, 1.1],
      [-2.2, -7.2, 0.9],
      [1.1, -7.1, 1.05],
      [7.3, -6.8, 1.18],
      [7.8, -3.7, 0.85],
      [-8, -1.7, 0.82],
      [7.2, 4.4, 1],
      [6.6, 7.1, 0.8],
      [-7.1, 7.4, 0.72],
    ];
    trees.forEach(([x, z, scale], index) => this.tree(x, z, scale, index));
    this.fence([-7.5, -7.9], [5.8, -7.9], 8);
    this.fence([8, -5.4], [8, -1.4], 3);
    this.fence([8, 1.4], [8, 7], 4);
    this.fence([-4.9, 7.6], [-0.1, 7.6], 3);
    this.gate(8, 0, false);
    const labelHeights = {
      house: 3.8,
      shed: 3.1,
      crop: 0.8,
      training: 1.9,
      market: 2.5,
      gate: 2.4,
      race: 1.8,
    };
    for (const object of AREAS.homestead.objects) {
      this.label(
        object.name,
        object.position.x,
        labelHeights[object.kind],
        object.position.z,
        object.kind === 'gate',
      );
    }
    this.scenery.add(this.smoke);
    for (let index = 0; index < 3; index++) {
      const puff = this.mesh(this.sphere, '#eee8d8');
      puff.castShadow = false;
      this.smoke.add(puff);
    }
  }

  private glade(state: GameState): void {
    this.path(
      [
        [-9.2, 0],
        [-5, 0],
        [-2, 1.3],
        [1.5, 0.4],
        [4, -0.7],
        [6, -3],
      ],
      1.5,
    );
    this.path(
      [
        [-1, 1.1],
        [1, 3],
        [3, 4.8],
        [5.3, 6.5],
      ],
      0.75,
    );
    const trees: [number, number, number][] = [
      [-7, -5.8, 1.2],
      [-4.6, -7.2, 1],
      [-1.3, -6, 1.4],
      [2.8, -7.2, 1.2],
      [6.8, -6.2, 1.35],
      [7.8, -2.6, 1],
      [-6.9, 5, 1.1],
      [-4, 7, 0.9],
      [0, 7.4, 1.25],
      [6.5, 6.6, 1.2],
      [8, 3.5, 1.1],
    ];
    trees.forEach(([x, z, scale], index) => this.tree(x, z, scale, index));
    state.resources
      .filter((node) => node.areaId === 'glade')
      .forEach((node, index) => {
        const group = new THREE.Group();
        group.position.set(node.position.x, 0, node.position.z);
        for (let lobe = 0; lobe < 4; lobe++) {
          const angle = lobe * 2.4;
          group.add(
            this.mesh(
              this.sphere,
              lobe % 2 ? '#567a58' : '#6c8a58',
              [Math.cos(angle) * 0.38, 0.54, Math.sin(angle) * 0.32],
              [0.66, 0.6 + lobe * 0.035, 0.6],
            ),
          );
        }
        const berries = new THREE.Group();
        for (let berry = 0; berry < 11; berry++) {
          const angle = berry * 2.4;
          const radius = 0.45 + (berry % 3) * 0.12;
          berries.add(
            this.mesh(
              this.sphere,
              berry % 2 ? '#ca7184' : '#bd4b65',
              [Math.cos(angle) * radius, 0.8 + (berry % 3) * 0.12, Math.sin(angle) * radius],
              [0.12, 0.14, 0.12],
            ),
          );
        }
        group.add(berries);
        this.berries.set(node.id, berries);
        this.scenery.add(group);
        if (index < 3) this.label('Brambleberries', node.position.x, 1.7, node.position.z);
      });
    const stones: [number, number][] = [
      [-5, -3.5],
      [4.3, 2.4],
      [5, 2.1],
      [-2, 5.2],
      [7.4, 0.8],
    ];
    stones.forEach(([x, z], index) => {
      const rock = this.mesh(this.pebble, '#a3aea0', [x, 0.33, z], [0.75, 0.65, 0.5]);
      rock.rotation.y = index * 1.7;
      this.scenery.add(rock);
      this.scenery.add(this.mesh(this.sphere, '#93a16e', [x - 0.15, 0.6, z], [0.4, 0.14, 0.35]));
    });
    this.gate(-8, 0, true);
    this.label('↙ Back to the yard', -8, 2.4, 0, true);
    for (let index = 0; index < 8; index++) {
      const x = -5.1 + index * 0.17;
      const z = -2.8 + Math.sin(index * 7) * 0.3;
      this.scenery.add(this.mesh(this.cylinder, '#e4dbb3', [x, 0.14, z], [0.055, 0.24, 0.055]));
      this.scenery.add(
        this.mesh(
          this.sphere,
          index % 2 ? '#d6a477' : '#c98c63',
          [x, 0.28, z],
          [0.16, 0.085, 0.16],
        ),
      );
    }
  }

  private tree(x: number, z: number, scale: number, variant: number): void {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    tree.add(this.mesh(this.cylinder, '#97704a', [0, 1.1, 0], [0.21, 2.2, 0.21]));
    const branch = this.mesh(this.cylinder, '#97704a', [0.31, 1.9, 0], [0.1, 1, 0.1]);
    branch.rotation.z = -0.7;
    tree.add(branch);
    const colors =
      variant % 3 === 0 ? ['#8b9f57', '#a3b566', '#b5c67a'] : ['#628965', '#7b9e6d', '#94ad72'];
    tree.add(this.mesh(this.sphere, colors[0], [0, 2.7, 0], [1.15, 1.26, 1.06]));
    tree.add(this.mesh(this.sphere, colors[1], [-0.67, 2.42, 0.13], [0.86, 0.94, 0.83]));
    tree.add(this.mesh(this.sphere, colors[1], [0.65, 2.53, 0.17], [0.85, 0.96, 0.86]));
    tree.add(this.mesh(this.sphere, colors[2], [0.09, 3.32, 0.15], [0.88, 0.86, 0.85]));
    tree.rotation.y = variant * 2.1;
    if (variant % 3 === 0) {
      for (let fruit = 0; fruit < 5; fruit++) {
        const angle = fruit * 1.7;
        tree.add(
          this.mesh(
            this.sphere,
            '#d69265',
            [Math.cos(angle) * 0.98, 2.45 + (fruit % 2) * 0.5, Math.sin(angle) * 0.94],
            [0.12, 0.14, 0.12],
          ),
        );
      }
    }
    this.scenery.add(tree);
  }

  private cottage(x: number, z: number): void {
    const house = new THREE.Group();
    house.position.set(x, 0, z);
    house.add(this.mesh(this.box, '#d7c8a3', [0, 0.12, 0], [3.65, 0.24, 3.15]));
    house.add(this.mesh(this.box, '#f1dfb5', [0, 1.23, 0], [3.35, 2.25, 2.8]));
    house.add(this.mesh(this.box, '#d6c29a', [0, 0.35, 1.43], [3.37, 0.2, 0.08]));
    this.roof(house, 3.95, 3.5, 2.25, 1.18, '#b76e54');
    // The gable fills the roof's open ends with the same warm plaster as the walls.
    const triangle = new THREE.Shape();
    triangle.moveTo(-1.66, 0);
    triangle.lineTo(1.66, 0);
    triangle.lineTo(0, 1.0);
    triangle.closePath();
    const gable = this.mesh(
      this.keep(new THREE.ExtrudeGeometry(triangle, { depth: 2.81, bevelEnabled: false })),
      '#eddbaf',
      [0, 2.28, -1.405],
    );
    house.add(gable);
    house.add(this.mesh(this.box, '#c5a880', [0.55, 0.72, 1.44], [0.9, 1.46, 0.15]));
    house.add(this.mesh(this.box, '#697f65', [0.55, 0.69, 1.54], [0.7, 1.29, 0.12]));
    house.add(this.mesh(this.sphere, '#dcb779', [0.78, 0.65, 1.63], [0.05, 0.05, 0.035]));
    this.window(house, -0.84, 1.42, 1.44, 0.72);
    this.window(house, 0, 2.61, 1.43, 0.43);
    const sideWindow = new THREE.Group();
    this.window(sideWindow, 0, 1.38, 0, 0.74);
    sideWindow.rotation.y = Math.PI / 2;
    sideWindow.position.set(1.7, 0, -0.2);
    house.add(sideWindow);
    house.add(this.mesh(this.box, '#ba8b69', [0.78, 3.33, -0.68], [0.5, 1.15, 0.54]));
    house.add(this.mesh(this.box, '#d9b18a', [0.78, 3.93, -0.68], [0.62, 0.18, 0.66]));
    house.add(this.mesh(this.box, '#766955', [0.78, 4.03, -0.68], [0.38, 0.02, 0.4]));
    for (let step = 0; step < 2; step++)
      house.add(
        this.mesh(
          this.box,
          '#b9b297',
          [0.55, 0.07 - step * 0.025, 1.71 + step * 0.3],
          [1.03 + step * 0.12, 0.14 - step * 0.05, 0.43],
        ),
      );
    this.pot(house, -1.32, 1.74);
    this.pot(house, 1.33, 1.74);
    this.scenery.add(house);
    const mailbox = new THREE.Group();
    mailbox.position.set(x + 2.4, 0, z + 2.4);
    mailbox.add(this.mesh(this.box, '#9b7855', [0, 0.58, 0], [0.12, 1.15, 0.12]));
    mailbox.add(this.mesh(this.box, '#537a74', [0, 1.13, 0], [0.43, 0.35, 0.57]));
    mailbox.add(this.mesh(this.box, '#e7d8ac', [0, 1.09, 0.29], [0.29, 0.035, 0.015]));
    this.scenery.add(mailbox);
  }

  private roof(
    parent: THREE.Group,
    width: number,
    depth: number,
    y: number,
    rise: number,
    color: string,
    target = parent,
  ): void {
    const angle = Math.atan2(rise, width / 2);
    const length = Math.hypot(width / 2, rise);
    for (const side of [-1, 1]) {
      const panel = this.mesh(
        this.box,
        color,
        [(side * width) / 4, y + rise / 2, 0],
        [length + 0.08, 0.17, depth],
      );
      panel.rotation.z = -side * angle;
      target.add(panel);
      for (let line = 0; line < 5; line++) {
        const fraction = (line + 0.5) / 5;
        const tile = this.mesh(
          this.box,
          color,
          [(side * fraction * width) / 2, y + (1 - fraction) * rise + 0.11, 0],
          [0.055, 0.045, depth + 0.02],
        );
        tile.rotation.z = -side * angle;
        target.add(tile);
      }
    }
    if (target !== parent) parent.add(target);
  }

  private window(parent: THREE.Group, x: number, y: number, z: number, size: number): void {
    parent.add(this.mesh(this.box, '#c49b6c', [x, y, z], [size + 0.15, size + 0.15, 0.12]));
    parent.add(this.mesh(this.box, '#719494', [x, y, z + 0.07], [size, size, 0.04]));
    parent.add(this.mesh(this.box, '#f3e8c5', [x, y, z + 0.1], [0.045, size, 0.035]));
    parent.add(this.mesh(this.box, '#f3e8c5', [x, y, z + 0.1], [size, 0.045, 0.035]));
    parent.add(
      this.mesh(
        this.box,
        '#d2b082',
        [x, y - size / 2 - 0.065, z + 0.06],
        [size + 0.25, 0.12, 0.22],
      ),
    );
  }

  private pot(parent: THREE.Group, x: number, z: number): void {
    parent.add(this.mesh(this.cylinder, '#b77c5f', [x, 0.2, z], [0.2, 0.4, 0.2]));
    parent.add(this.mesh(this.sphere, '#7d9b60', [x, 0.48, z], [0.28, 0.3, 0.26]));
    for (let flower = 0; flower < 3; flower++)
      parent.add(
        this.mesh(
          this.sphere,
          '#f0c071',
          [x + Math.sin(flower * 3) * 0.16, 0.68, z + Math.cos(flower * 3) * 0.13],
          [0.09, 0.075, 0.09],
        ),
      );
  }

  private shed(x: number, z: number): void {
    const shed = new THREE.Group();
    shed.position.set(x, 0, z);
    shed.add(this.mesh(this.box, '#c4b493', [0, 0.12, 0], [3.23, 0.24, 2.8]));
    shed.add(this.mesh(this.box, '#aeb99b', [0, 1, 0], [3, 1.9, 2.5]));
    for (let plank = 0; plank < 11; plank++)
      shed.add(
        this.mesh(this.box, '#99a387', [-1.44 + plank * 0.287, 1, 1.27], [0.018, 1.85, 0.027]),
      );
    shed.add(this.mesh(this.box, '#7c8061', [0.25, 0.74, 1.29], [1.45, 1.47, 0.1]));
    shed.add(this.mesh(this.box, '#a48a5d', [0.25, 0.13, 1.45], [1.7, 0.12, 0.65]));
    shed.add(this.mesh(this.box, '#c4b58b', [0.25, 0.41, 1.36], [1.43, 0.78, 0.07]));
    const brace = this.mesh(this.box, '#a1906d', [0.25, 0.41, 1.41], [1.42, 0.08, 0.035]);
    brace.rotation.z = 0.46;
    shed.add(brace);
    this.roof(shed, 3.52, 3.03, 1.99, 0.83, '#859078', this.shedRoof);
    this.window(shed, -1.02, 1.22, 1.31, 0.38);
    shed.add(this.mesh(this.box, '#e9d6a4', [0.3, 1.72, 1.35], [1.4, 0.26, 0.1]));
    this.scenery.add(shed);
    for (let bale = 0; bale < 2; bale++) {
      const hay = this.mesh(
        this.cylinder,
        '#d1b978',
        [x + 1.9, 0.34 + bale * 0.3, z + 0.7 - bale * 0.27],
        [0.4, 0.63, 0.4],
      );
      hay.rotation.z = Math.PI / 2;
      this.scenery.add(hay);
    }
    this.scenery.add(
      this.mesh(this.cylinder, '#73958c', [x - 1.7, 0.15, z + 1.1], [0.42, 0.3, 0.42]),
    );
    this.scenery.add(
      this.mesh(this.cylinder, '#a3c8c2', [x - 1.7, 0.31, z + 1.1], [0.34, 0.025, 0.34]),
    );
  }

  private garden(x: number, z: number): void {
    const garden = new THREE.Group();
    garden.position.set(x, 0, z);
    garden.add(this.mesh(this.box, '#8d6c49', [0, 0.08, 0], [2.7, 0.17, 2.65]));
    for (const side of [-1, 1]) {
      garden.add(this.mesh(this.box, '#b39c6c', [side * 1.38, 0.17, 0], [0.12, 0.3, 2.87]));
      garden.add(this.mesh(this.box, '#b39c6c', [0, 0.17, side * 1.38], [2.87, 0.3, 0.12]));
    }
    for (let row = 0; row < 3; row++) {
      garden.add(this.mesh(this.box, '#a27d4f', [0, 0.19, row * 0.78 - 0.78], [2.58, 0.11, 0.36]));
      for (let column = 0; column < 4; column++) {
        const crop = new THREE.Group();
        crop.position.set(column * 0.61 - 0.91, 0, row * 0.78 - 0.78);
        for (let leaf = 0; leaf < 3; leaf++) {
          const angle = leaf * 2.1;
          const sprout = this.mesh(
            this.sphere,
            leaf % 2 ? '#72924d' : '#8daa52',
            [Math.sin(angle) * 0.12, 0.45, Math.cos(angle) * 0.12],
            [0.13, 0.3, 0.08],
          );
          sprout.rotation.z = Math.sin(angle) * 0.6;
          crop.add(sprout);
        }
        const fruit = this.mesh(this.sphere, '#e5b670', [0, 0.25, 0], [0.18, 0.2, 0.18]);
        fruit.name = 'fruit';
        crop.add(fruit);
        this.crops.add(crop);
      }
    }
    garden.add(this.crops);
    this.scenery.add(garden);
    const can = this.mesh(this.cylinder, '#709896', [x + 1.83, 0.23, z + 0.8], [0.25, 0.42, 0.25]);
    this.scenery.add(can);
    const spout = this.mesh(this.cylinder, '#709896', [x + 1.55, 0.25, z + 0.8], [0.07, 0.5, 0.07]);
    spout.rotation.z = -0.95;
    this.scenery.add(spout);
  }

  private training(x: number, z: number): void {
    const track = this.mesh(this.cylinder, '#b2bd78', [x, 0.039, z], [2.1, 0.045, 1.9]);
    track.receiveShadow = true;
    this.scenery.add(track);
    const hoop = this.mesh(this.keep(new THREE.TorusGeometry(0.63, 0.075, 8, 36)), '#d6a367', [
      x,
      0.98,
      z,
    ]);
    hoop.rotation.y = -0.35;
    this.scenery.add(hoop);
    this.scenery.add(this.mesh(this.box, '#a5835b', [x - 0.56, 0.37, z - 0.2], [0.1, 0.75, 0.1]));
    this.scenery.add(this.mesh(this.box, '#a5835b', [x + 0.56, 0.37, z + 0.2], [0.1, 0.75, 0.1]));
    for (let hurdle = 0; hurdle < 2; hurdle++) {
      const hx = x - 0.8 + hurdle * 1.3;
      const hz = z + 1.15;
      this.scenery.add(this.mesh(this.box, '#ece0b9', [hx, 0.48, hz], [0.88, 0.08, 0.08]));
      for (const side of [-1, 1])
        this.scenery.add(
          this.mesh(this.box, '#a38262', [hx + side * 0.4, 0.25, hz], [0.085, 0.5, 0.085]),
        );
    }
    this.pennants(x - 1.65, z - 1.2, x + 1.7, z - 1.2, 1.7);
  }

  private market(x: number, z: number): void {
    const market = new THREE.Group();
    market.position.set(x, 0, z);
    for (const side of [-1, 1]) {
      market.add(this.mesh(this.box, '#9a7855', [side * 0.98, 1.05, 0], [0.11, 2.1, 0.11]));
      market.add(this.mesh(this.box, '#a28059', [side * 0.87, 0.42, 0.3], [0.12, 0.84, 0.12]));
    }
    market.add(this.mesh(this.box, '#b5986c', [0, 0.85, 0.23], [2.17, 0.15, 1.04]));
    market.add(this.mesh(this.box, '#c1a878', [0, 0.56, 0.72], [1.97, 0.48, 0.09]));
    for (let stripe = 0; stripe < 7; stripe++) {
      const awning = this.mesh(
        this.box,
        stripe % 2 ? '#e6d7ab' : '#648d80',
        [-0.99 + stripe * 0.33, 2.03, 0.07],
        [0.335, 0.09, 1.58],
      );
      awning.rotation.x = 0.14;
      market.add(awning);
      market.add(
        this.mesh(
          this.box,
          stripe % 2 ? '#e6d7ab' : '#648d80',
          [-0.99 + stripe * 0.33, 1.8, 0.84],
          [0.335, 0.27, 0.055],
        ),
      );
    }
    for (let basket = 0; basket < 3; basket++) {
      const bx = -0.64 + basket * 0.64;
      market.add(this.mesh(this.box, '#927345', [bx, 1, 0.28], [0.51, 0.23, 0.53]));
      for (let fruit = 0; fruit < 4; fruit++)
        market.add(
          this.mesh(
            this.sphere,
            basket === 1 ? '#d2ad62' : '#b96f70',
            [bx + (fruit % 2) * 0.19 - 0.09, 1.13, 0.19 + Math.floor(fruit / 2) * 0.18],
            [0.11, 0.11, 0.11],
          ),
        );
    }
    this.scenery.add(market);
  }

  private race(x: number, z: number): void {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    for (const side of [-1, 1]) {
      group.add(this.mesh(this.cylinder, '#b59569', [side * 1.14, 0.68, 0], [0.065, 1.36, 0.065]));
      const pennant = this.mesh(
        this.cone,
        side < 0 ? '#c8866a' : '#6c938b',
        [side * 1.14 + 0.22, 1.19, 0],
        [0.21, 0.5, 0.02],
      );
      pennant.rotation.z = -Math.PI / 2;
      group.add(pennant);
    }
    for (let index = 0; index < 8; index++)
      group.add(
        this.mesh(
          this.box,
          index % 2 ? '#758273' : '#f0e1b8',
          [-0.91 + index * 0.26, 0.045, 0],
          [0.26, 0.035, 0.44],
        ),
      );
    this.scenery.add(group);
  }

  private fence(from: [number, number], to: [number, number], count: number): void {
    const dx = (to[0] - from[0]) / count;
    const dz = (to[1] - from[1]) / count;
    const distance = Math.hypot(dx, dz);
    for (let section = 0; section <= count; section++) {
      const x = from[0] + dx * section;
      const z = from[1] + dz * section;
      this.scenery.add(this.mesh(this.box, '#c8b98c', [x, 0.52, z], [0.17, 1.03, 0.17]));
      this.scenery.add(this.mesh(this.sphere, '#d9cba6', [x, 1.04, z], [0.13, 0.085, 0.13]));
      if (section === count) continue;
      for (const height of [0.38, 0.79]) {
        const rail = this.mesh(
          this.box,
          '#d5c49b',
          [x + dx / 2, height, z + dz / 2],
          [distance, 0.13, 0.105],
        );
        rail.rotation.y = -Math.atan2(dz, dx);
        this.scenery.add(rail);
      }
    }
  }

  private gate(x: number, z: number, reverse: boolean): void {
    const gate = new THREE.Group();
    gate.position.set(x, 0, z);
    gate.rotation.y = Math.PI / 2;
    for (const side of [-1, 1]) {
      gate.add(this.mesh(this.box, '#c3ac7e', [side * 1.05, 0.98, 0], [0.19, 1.96, 0.19]));
      gate.add(this.mesh(this.sphere, '#d9c49a', [side * 1.05, 1.99, 0], [0.14, 0.13, 0.14]));
    }
    gate.add(this.mesh(this.box, '#839c76', [0, 1.76, 0], [2.23, 0.35, 0.16]));
    const sign = this.mesh(
      this.box,
      '#efe0b7',
      [0.05, 1.74, reverse ? 0.105 : -0.105],
      [1.32, 0.12, 0.028],
    );
    gate.add(sign);
    this.scenery.add(gate);
  }

  private pennants(x: number, z: number, endX: number, endZ: number, height: number): void {
    const dx = endX - x;
    const dz = endZ - z;
    for (const fraction of [0, 1])
      this.scenery.add(
        this.mesh(
          this.cylinder,
          '#a38b60',
          [x + dx * fraction, height / 2, z + dz * fraction],
          [0.045, height, 0.045],
        ),
      );
    const rope = this.mesh(
      this.cylinder,
      '#c5b78c',
      [x + dx / 2, height - 0.06, z + dz / 2],
      [0.014, Math.hypot(dx, dz), 0.014],
    );
    rope.rotation.z = Math.PI / 2;
    this.scenery.add(rope);
    for (let flag = 0; flag < 7; flag++) {
      const fraction = (flag + 0.5) / 7;
      const mesh = this.mesh(
        this.cone,
        ['#ca9273', '#e9cc83', '#5e9186'][flag % 3],
        [x + dx * fraction, height - 0.23, z + dz * fraction],
        [0.14, 0.31, 0.025],
      );
      mesh.rotation.z = Math.PI;
      this.scenery.add(mesh);
    }
  }

  private grass(seed: number): void {
    // This seed decorates the view only; simulation randomness lives in the game reducer.
    let randomSeed = seed;
    const random = (): number => {
      randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
      return randomSeed / 4294967296;
    };
    const grass = new THREE.InstancedMesh(this.cone, this.material('#7f9e59'), 360);
    const flowers = new THREE.InstancedMesh(this.sphere, this.material('#f4e2a2'), 94);
    const lavender = new THREE.InstancedMesh(this.sphere, this.material('#b5a5b4'), 50);
    const transform = new THREE.Object3D();
    let grassCount = 0;
    let flowerCount = 0;
    let lavenderCount = 0;
    for (let attempt = 0; attempt < 650 && grassCount < 360; attempt++) {
      const x = random() * 17 - 8.5;
      const z = random() * 17 - 8.5;
      if (Math.abs(x) > 7.3 && Math.abs(z) > 7.3) continue;
      // Keep the authored central walkways and facilities visually open.
      if (
        this.area === 'homestead' &&
        (Math.abs(z) < 1.25 || (x < -2.7 && z > -6 && z < 6) || (x > 1.5 && x < 5.7 && z < 3.7))
      )
        continue;
      if (this.area === 'glade' && Math.abs(z) < 1.4) continue;
      const size = 0.1 + random() * 0.1;
      transform.position.set(x, size * 0.4, z);
      transform.scale.set(size * 0.35, size, size * 0.35);
      transform.rotation.set(0, random() * Math.PI, random() * 0.4 - 0.2);
      transform.updateMatrix();
      grass.setMatrixAt(grassCount++, transform.matrix);
      if (flowerCount < 94 && random() < 0.32) {
        transform.position.y = size + 0.06;
        transform.scale.set(0.064, 0.035, 0.064);
        transform.updateMatrix();
        flowers.setMatrixAt(flowerCount++, transform.matrix);
      } else if (lavenderCount < 50 && random() < 0.19) {
        transform.position.y = size + 0.05;
        transform.scale.set(0.048, 0.084, 0.048);
        transform.updateMatrix();
        lavender.setMatrixAt(lavenderCount++, transform.matrix);
      }
    }
    grass.count = grassCount;
    flowers.count = flowerCount;
    lavender.count = lavenderCount;
    this.scenery.add(grass, flowers, lavender);
  }

  private buildFarmer(): void {
    this.farmer.add(this.farmerBody);
    const body = this.farmerBody;
    body.add(this.mesh(this.sphere, '#557e78', [0, 0.8, 0], [0.28, 0.4, 0.2]));
    body.add(this.mesh(this.box, '#648f83', [0, 0.92, 0.18], [0.34, 0.32, 0.04]));
    body.add(this.mesh(this.sphere, '#e3b48d', [0, 1.29, 0.035], [0.25, 0.27, 0.235]));
    body.add(this.mesh(this.sphere, '#5b4536', [0, 1.38, -0.025], [0.26, 0.2, 0.245]));
    body.add(this.mesh(this.sphere, '#e3b48d', [0, 1.29, 0.12], [0.21, 0.205, 0.17]));
    body.add(this.mesh(this.cylinder, '#d8ba77', [0, 1.52, 0], [0.44, 0.075, 0.4]));
    body.add(this.mesh(this.sphere, '#e6cc8c', [0, 1.6, 0], [0.27, 0.2, 0.25]));
    body.add(this.mesh(this.cylinder, '#a57a54', [0, 1.56, 0], [0.275, 0.07, 0.26]));
    for (const side of [-1, 1]) {
      body.add(
        this.mesh(this.sphere, '#493f32', [side * 0.078, 1.31, 0.276], [0.019, 0.025, 0.018]),
      );
      const arm = this.mesh(this.cylinder, '#e6d9ad', [side * 0.32, 0.89, 0], [0.092, 0.41, 0.092]);
      arm.rotation.z = side * 0.22;
      body.add(arm);
      body.add(this.mesh(this.sphere, '#dfad85', [side * 0.365, 0.67, 0.015], [0.085, 0.1, 0.085]));
      const leg = this.mesh(this.cylinder, '#4f7770', [side * 0.13, 0.34, 0], [0.1, 0.47, 0.1]);
      leg.add(this.mesh(this.box, '#6d604b', [0, -0.42, 0.35], [1.12, 0.3, 1.8]));
      this.farmerLegs.push(leg);
      this.farmer.add(leg);
    }
    this.farmer.rotation.y = 0.4;
  }

  private buildCritter(): void {
    this.critter.add(this.critterBody);
    const body = this.critterBody;
    body.add(this.mesh(this.sphere, '#dc9e6d', [0, 0.64, 0], [0.43, 0.39, 0.58]));
    body.add(this.mesh(this.sphere, '#edbb87', [0, 0.71, 0.3], [0.38, 0.4, 0.36]));
    body.add(this.mesh(this.sphere, '#f2d8ac', [0, 0.53, 0.42], [0.28, 0.24, 0.22]));
    body.add(this.mesh(this.sphere, '#e8ad79', [0, 1.02, 0.29], [0.37, 0.34, 0.33]));
    for (const side of [-1, 1]) {
      const ear = this.mesh(
        this.sphere,
        '#dd9f70',
        [side * 0.245, 1.38, 0.23],
        [0.135, 0.38, 0.11],
      );
      ear.rotation.z = -side * 0.28;
      body.add(ear);
      const inner = this.mesh(
        this.sphere,
        '#ba7b67',
        [side * 0.248, 1.38, 0.317],
        [0.072, 0.245, 0.027],
      );
      inner.rotation.z = -side * 0.28;
      body.add(inner);
      body.add(this.mesh(this.sphere, '#f9e3bc', [side * 0.17, 1.045, 0.562], [0.13, 0.14, 0.038]));
      body.add(
        this.mesh(this.sphere, '#384c40', [side * 0.17, 1.055, 0.599], [0.059, 0.071, 0.025]),
      );
      body.add(
        this.mesh(this.sphere, '#fff6da', [side * 0.155, 1.08, 0.622], [0.015, 0.019, 0.008]),
      );
      body.add(
        this.mesh(this.sphere, '#d58f77', [side * 0.28, 0.939, 0.507], [0.073, 0.038, 0.025]),
      );
      for (const front of [-1, 1]) {
        const leg = this.mesh(
          this.sphere,
          '#b27d56',
          [side * 0.29, 0.18, front * 0.32],
          [0.12, 0.16, 0.19],
        );
        this.critterLegs.push(leg);
        this.critter.add(leg);
      }
    }
    body.add(this.mesh(this.sphere, '#674e3c', [0, 0.96, 0.628], [0.055, 0.038, 0.026]));
    const neckerchief = this.mesh(
      this.keep(new THREE.TorusGeometry(0.26, 0.057, 6, 18)),
      '#527f77',
      [0, 0.79, 0.3],
      [1, 1, 1],
    );
    neckerchief.rotation.x = Math.PI / 2;
    body.add(neckerchief);
    body.add(this.mesh(this.sphere, '#d7b366', [0, 0.735, 0.582], [0.058, 0.065, 0.029]));
    this.tail.position.set(0, 0.57, -0.46);
    for (let plume = 0; plume < 5; plume++) {
      const feather = this.mesh(
        this.sphere,
        plume % 2 ? '#789775' : '#538378',
        [(plume - 2) * 0.135, 0.15 + Math.abs(plume - 2) * 0.015, -0.23],
        [0.13, 0.16, 0.5 - Math.abs(plume - 2) * 0.05],
      );
      feather.rotation.y = -(plume - 2) * 0.17;
      feather.rotation.x = -0.22;
      this.tail.add(feather);
    }
    body.add(this.tail);
    this.critter.rotation.y = 0.6;
  }

  private animateActor(
    actor: THREE.Group,
    position: Point,
    previous: THREE.Vector2,
    legs: THREE.Mesh[],
    stride: number,
  ): boolean {
    const dx = position.x - previous.x;
    const dz = position.z - previous.y;
    const moving = dx * dx + dz * dz > 0.000001;
    actor.position.set(position.x, 0, position.z);
    if (moving) {
      const target = Math.atan2(dx, dz);
      actor.rotation.y +=
        Math.atan2(Math.sin(target - actor.rotation.y), Math.cos(target - actor.rotation.y)) * 0.22;
    }
    legs.forEach((leg, index) => {
      leg.rotation.x =
        moving && !this.reducedMotion ? Math.sin(this.clock * 11 + index * Math.PI) * stride : 0;
    });
    previous.set(position.x, position.z);
    return moving;
  }

  private makeLabel(text: string, critter = false): HTMLDivElement {
    const element = document.createElement('div');
    element.textContent = text;
    element.style.cssText =
      'position:absolute;left:0;top:0;white-space:nowrap;pointer-events:none;will-change:transform;transition:opacity .2s;' +
      (critter
        ? 'padding:3px 9px;border-radius:20px;background:#fcf8e9e8;color:#4f6b57;font:600 10px system-ui;box-shadow:0 2px 6px #344b3515;'
        : 'padding:4px 8px;border-radius:4px;background:#faf7e6db;color:#536650;font:600 9px system-ui;letter-spacing:.04em;box-shadow:0 2px 5px #344b3510;');
    this.labelLayer.appendChild(element);
    return element;
  }

  private label(text: string, x: number, y: number, z: number, always = false): void {
    this.labels.push({
      element: this.makeLabel(text),
      position: new THREE.Vector3(x, y, z),
      always,
    });
  }

  private positionLabel(element: HTMLElement, point: THREE.Vector3): void {
    this.projection.copy(point).project(this.camera);
    const x = (this.projection.x * 0.5 + 0.5) * this.width;
    const y = (-this.projection.y * 0.5 + 0.5) * this.height;
    element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    element.style.visibility = this.projection.z < 1 ? 'visible' : 'hidden';
  }
}
