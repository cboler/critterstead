import { backpack, satchel } from './model';
import * as THREE from 'three';
import { productionStatus, quantity } from './logistics';
import { AREAS, CROPS } from './content';
import { plotReady } from './garden';
import { calendarDate, weatherFor } from './calendar';
import { buildSurroundings, type Surroundings } from './render/terrain';
import { PALETTES, type SeasonPalette } from './render/palette';
import { activeCritter, type AreaId, type CropId, type GameState, type Point } from './model';
import {
  detectQuality,
  QUALITY_SETTINGS,
  rendererName,
  type Quality,
  type QualityChoice,
} from './render/quality';

interface BedModel {
  soil: THREE.Mesh;
  weeds: THREE.Group;
  plants: THREE.Group;
  leaves: THREE.Mesh[];
  fruit: THREE.Mesh[];
}
// Presentation colors per crop species: leaf, then produce.
const LEAF_SHAPES: Record<CropId, [number, number, number]> = {
  feed: [0.1, 0.26, 0.07],
  turnip: [0.12, 0.22, 0.08],
  wheat: [0.035, 0.44, 0.035],
  sunberry: [0.13, 0.2, 0.12],
};
const CROP_COLORS: Record<CropId, [string, string]> = {
  feed: ['#8daa52', '#e5b670'],
  turnip: ['#6f9b58', '#e7dcef'],
  wheat: ['#b7b45e', '#e2c46a'],
  sunberry: ['#567a58', '#bd4b65'],
};

interface WorldLabel {
  element: HTMLDivElement;
  position: THREE.Vector3;
  always?: boolean;
}
/** Screen space, in CSS pixels, covered by HUD panels; the camera frames the rest. */
export interface ViewInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
// The camera always looks along the same diagonal, so screen-relative controls stay stable.
const VIEW_DIRECTION = new THREE.Vector3(17, 22, 25).normalize();
const SUN_OFFSET = new THREE.Vector3(-11, 22, 13);
const ZOOM_LIMITS = { min: 4.2, max: 12, standard: 6.6 } as const;
const INDOOR_ZOOM = 4.6;
// Narrow phone screens still show a useful width of the world around the rancher.
const MIN_HALF_WIDTH = 5.4;
const RELEASE_EVENTS = ['pointerup', 'pointercancel', 'pointerleave'] as const;

/** A view of the simulation. Geometry and animation never change game state. */
export class GameWorld {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-15, 15, 11, -11, 1, 220);
  private readonly focus = new THREE.Vector3();
  private readonly focusGoal = new THREE.Vector3();
  private readonly insets: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  private readonly frameShift = new THREE.Vector2();
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDistance = 0;
  private zoom: number = ZOOM_LIMITS.standard;
  private zoomGoal: number = ZOOM_LIMITS.standard;
  private snapCamera = true;
  private wasIndoors = false;
  private outdoorZoom: number = ZOOM_LIMITS.standard;
  private shadowExtent = 0;
  private qualityTier: Quality = 'balanced';
  private surroundings?: Surroundings;
  // Scenery depends on the area, the season's palette, and the detail tier.
  private builtKey = '';
  private palette: SeasonPalette = PALETTES.spring;
  private readonly gpuName: string;
  private readonly sunRight = new THREE.Vector3();
  private readonly sunUp = new THREE.Vector3();
  private readonly sunDirection = SUN_OFFSET.clone().normalize();
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
  private readonly materialsInWorld = new Map<string, THREE.Group>();
  private readonly groundLoads = new THREE.Group();
  private readonly carriedLoad = new THREE.Group();
  private readonly companionLoad = new THREE.Group();
  private readonly containerModels = new Map<string, THREE.Group>();
  private readonly millBlade = new THREE.Group();
  private readonly workTool = new THREE.Group();
  private cargoSignature = '';
  private readonly beds = new Map<string, BedModel>();
  private backdrop!: THREE.Mesh;
  private readonly smoke = new THREE.Group();
  private readonly shedRoof = new THREE.Group();
  private readonly affection = new THREE.Group();
  private readonly delight = new THREE.Group();
  private readonly walkMarker = this.mesh(
    this.keep(new THREE.RingGeometry(0.22, 0.29, 32)),
    '#fff3c5',
  );
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private area = '';
  private clock = 0;
  private width = 1;
  private height = 1;
  private lastPlayer = new THREE.Vector2();
  private lastCritter = new THREE.Vector2();
  private permanentGeometryCount = 0;
  private feedbackTime = 0;
  private markerTime = 0;
  private cueTime = 10;
  private lastCueCount = 0;
  private lastJournal: string | undefined;
  private raceProgress = 0;
  // Station props that animate with a gauge drill, plus the Colosseum crowd.
  private readonly liftStone = new THREE.Group();
  private readonly pullStone = new THREE.Group();
  private readonly spectators = new THREE.Group();
  private readonly confetti = new THREE.Group();
  private fanfareTime = 0;
  private lastShowings = -1;

  constructor(
    private readonly container: HTMLElement,
    private readonly onWalk: (point: Point) => void,
    qualityChoice: QualityChoice = 'auto',
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.gpuName = rendererName(this.renderer.getContext());
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
    this.critterLabel = this.makeLabel('', true);
    this.scene.background = new THREE.Color('#dce9e3');
    this.scene.fog = new THREE.Fog('#dce9e3', 49, 95);
    this.camera.position.copy(VIEW_DIRECTION).multiplyScalar(60);
    this.camera.lookAt(0, 0, 0);
    this.sun.position.copy(SUN_OFFSET);
    this.sun.castShadow = true;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 90;
    this.scene.add(this.sun.target);
    this.sun.shadow.normalBias = 0.06;
    this.sun.shadow.bias = -0.0001;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.hemisphere, this.scenery, this.farmer, this.critter);
    this.backdrop = this.mesh(this.box, '#dce9e3', [0, -1.58, 0], [180, 0.1, 180]);
    this.backdrop.receiveShadow = true;
    this.scene.add(this.backdrop);
    this.buildFarmer();
    this.carriedLoad.add(this.mesh(this.cylinder, '#986441', [0, 1, 0.42], [0.22, 1.25, 0.22]));
    this.carriedLoad.children[0].rotation.z = Math.PI / 2;
    this.carriedLoad.add(this.mesh(this.pebble, '#8d9b9a', [0, 1, 0.42], [0.5, 0.3, 0.3]));
    this.workTool.add(this.mesh(this.box, '#996d45', [0, 0.4, 0], [0.08, 0.85, 0.08]));
    this.workTool.add(this.mesh(this.box, '#c6d4d3', [0.12, 0.78, 0], [0.35, 0.23, 0.1]));
    this.workTool.position.set(0.45, 0.9, 0.25);
    this.farmerBody.add(this.carriedLoad, this.workTool);
    this.buildCritter();
    this.companionLoad.add(this.mesh(this.box, '#c59160', [0, 0.9, 0.3], [0.85, 0.18, 0.35]));
    this.companionLoad.add(this.mesh(this.box, '#866546', [0.37, 0.6, 0], [0.27, 0.35, 0.4]));
    this.critterBody.add(this.companionLoad);
    this.buildFeedback();
    this.permanentGeometryCount = this.geometries.length;
    this.renderer.domElement.addEventListener('pointerdown', this.walk);
    this.renderer.domElement.addEventListener('pointermove', this.pinch);
    for (const type of RELEASE_EVENTS)
      this.renderer.domElement.addEventListener(type, this.release);
    this.renderer.domElement.addEventListener('wheel', this.wheel, { passive: false });
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.setQuality(qualityChoice);
  }

  get quality(): Quality {
    return this.qualityTier;
  }

  get gpu(): string {
    return this.gpuName;
  }

  /** Applies a tier; 'auto' picks one from the device and renderer. */
  setQuality(choice: QualityChoice): void {
    this.qualityTier = choice === 'auto' ? detectQuality(this.gpuName) : choice;
    const settings = QUALITY_SETTINGS[this.qualityTier];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.pixelRatio));
    if (this.sun.shadow.mapSize.x !== settings.shadowMapSize) {
      this.sun.shadow.mapSize.set(settings.shadowMapSize, settings.shadowMapSize);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
      this.shadowExtent = 0;
    }
    this.resize();
  }

  render(state: GameState, dtSeconds: number): void {
    const companion = activeCritter(state);
    const dt = Math.min(Math.max(dtSeconds, 0), 0.1);
    this.clock += this.reducedMotion ? 0 : dt;
    this.cueTime += dt;
    const sceneryKey = `${state.areaId}:${calendarDate(state.day).season}:${this.qualityTier}`;
    if (this.builtKey !== sceneryKey) {
      const moved = this.area !== state.areaId;
      this.builtKey = sceneryKey;
      this.area = state.areaId;
      this.palette = PALETTES[calendarDate(state.day).season];
      this.buildArea(state);
      if (!moved) {
        // A season or quality change rebuilds scenery in place without moving the camera.
        this.lastPlayer.set(state.player.position.x, state.player.position.z);
        this.lastCritter.set(companion.position.x, companion.position.z);
      }
      this.snapCamera = true;
      this.resize();
      this.lastPlayer.set(state.player.position.x, state.player.position.z);
      this.lastCritter.set(companion.position.x, companion.position.z);
      this.walkMarker.visible = false;
      this.markerTime = 0;
    }
    const playerMoving = this.animateActor(
      this.farmer,
      state.player.position,
      this.lastPlayer,
      this.farmerLegs,
      0.32,
    );
    let visualCritterPosition = companion.position;
    let jumpHeight = 0;
    const activity = state.training;
    const gaugeMeter = activity?.meter ?? 0;
    if (activity?.kind === 'lift') {
      visualCritterPosition = { x: 4.3, z: 6.6 };
    } else if (activity?.kind === 'pace') {
      const angle = (activity.progress ?? 0) * Math.PI * 2 - Math.PI / 2;
      visualCritterPosition = { x: 1.2 + Math.cos(angle) * 1.6, z: 6.8 + Math.sin(angle) * 1.6 };
    } else if (activity?.kind === 'exhibition') {
      visualCritterPosition =
        activity.stage === 1
          ? { x: 2.2, z: -1 }
          : { x: -3.5 + ((activity.hits.length + activity.phase * 0.3) / 3) * 6, z: -1 };
    } else if (state.training) {
      if (state.training.hits.length !== this.lastCueCount) this.cueTime = 0;
      if (state.training.kind === 'race') {
        const progress = (state.training.hits.length + state.training.phase * 0.2) / 3;
        this.raceProgress +=
          (Math.max(progress, this.raceProgress) - this.raceProgress) * Math.min(1, dt * 7);
        visualCritterPosition = {
          x: 1.7 + this.raceProgress * 0.6,
          z: 4.1 + this.raceProgress * 3.3,
        };
      } else {
        const jump = Math.min(1, this.cueTime / 0.65);
        const towardsFront = state.training.hits.length % 2 === 1;
        const across = state.training.hits.length === 0 ? 0 : towardsFront ? jump : 1 - jump;
        visualCritterPosition = { x: 3, z: 1.1 + across * 1.8 };
        jumpHeight =
          this.reducedMotion || state.training.hits.length === 0
            ? 0
            : Math.sin(jump * Math.PI) * 0.65;
      }
      this.lastCueCount = state.training.hits.length;
    } else {
      this.lastCueCount = 0;
      this.raceProgress = 0;
    }
    // Frame before any label is projected so labels never trail the camera.
    this.frame(state, visualCritterPosition, dt);
    this.surroundings?.update(this.clock, 1);
    const critterMoving = this.animateActor(
      this.critter,
      visualCritterPosition,
      this.lastCritter,
      this.critterLegs,
      0.16,
    );
    this.farmerBody.position.y = playerMoving ? Math.abs(Math.sin(this.clock * 11)) * 0.07 : 0;
    this.critterBody.position.y =
      critterMoving || state.training
        ? Math.abs(Math.sin(this.clock * 12)) * 0.11
        : Math.sin(this.clock * 2.4) * 0.025;
    this.critter.position.y = jumpHeight;
    // Gauge drills lift their stones with the force meter.
    this.liftStone.position.y = activity?.kind === 'lift' ? gaugeMeter * 0.6 : 0;
    this.pullStone.position.x =
      activity?.kind === 'exhibition' && activity.stage === 1 ? (activity.progress ?? 0) * 1.5 : 0;
    const showings = companion.competitions.filter((item) => item.event === 'exhibition').length;
    if (this.lastShowings >= 0 && showings > this.lastShowings) this.fanfareTime = 4;
    this.lastShowings = showings;
    this.fanfareTime = Math.max(0, this.fanfareTime - dt);
    const cheering = activity?.kind === 'exhibition' || this.fanfareTime > 0;
    this.spectators.children.forEach((fan, index) => {
      fan.position.y =
        cheering && !this.reducedMotion
          ? Math.abs(Math.sin(this.clock * 9 + index * 1.3)) * 0.25
          : 0;
    });
    this.confetti.visible = this.fanfareTime > 0;
    this.confetti.children.forEach((piece, index) => {
      const t = (this.clock * 0.6 + index * 0.137) % 1;
      piece.position.y = 4.5 - t * 4.2;
      piece.rotation.z = this.clock * 3 + index;
    });
    if (
      (state.training?.kind === 'race' ||
        activity?.kind === 'pace' ||
        (activity?.kind === 'exhibition' && activity.stage !== 1)) &&
      !this.reducedMotion
    ) {
      this.critterLegs.forEach((leg, index) => {
        leg.rotation.x = Math.sin(this.clock * 17 + index * Math.PI) * 0.6;
      });
    }
    this.tail.rotation.z = Math.sin(this.clock * 3.2) * 0.12;
    this.tail.rotation.x = Math.sin(this.clock * 2.1) * 0.07;
    // A companion working in the yard is not drawn inside the cottage.
    this.critter.visible = state.areaId !== 'cottage' || state.companionIndoors;
    this.critterLabel.style.display = this.critter.visible ? '' : 'none';
    this.critterLabel.textContent = companion.name;
    this.positionLabel(
      this.critterLabel,
      this.projection.set(visualCritterPosition.x, 1.9 + jumpHeight, visualCritterPosition.z),
    );
    this.animateFeedback(state, dt);
    const timber = backpack(state).items.some(
      (item) => (item.itemId === 'timber' || item.itemId === 'lumber') && item.quantity > 0,
    );
    const stone = backpack(state).items.some(
      (item) => item.itemId === 'stone' && item.quantity > 0,
    );
    this.carriedLoad.visible = (timber || stone) && !state.work;
    this.carriedLoad.children[0].visible = timber;
    this.carriedLoad.children[1].visible = !timber && stone;
    this.companionLoad.visible = satchel(state).items.some((item) => item.quantity > 0);
    this.companionLoad.children[0].visible = satchel(state).items.some((item) =>
      ['timber', 'lumber', 'stone'].includes(item.itemId),
    );
    for (const container of state.containers) {
      const model = this.containerModels.get(container.id);
      if (model)
        model.children.forEach((child, index) => {
          child.visible = index < quantity(container);
        });
    }
    if (
      state.areaId === 'homestead' &&
      productionStatus(state.containers).startsWith('Sawing') &&
      !this.reducedMotion
    )
      this.millBlade.rotation.z += dt * 5;
    this.workTool.visible = !!state.work;
    if (state.work) {
      const node = state.materialNodes.find((item) => item.id === state.work!.nodeId)!;
      this.farmer.rotation.y = Math.atan2(
        node.position.x - state.player.position.x,
        node.position.z - state.player.position.z,
      );
      this.workTool.rotation.x = this.reducedMotion
        ? -0.5
        : Math.sin((this.clock * 8) / state.work.result.durationSeconds) * 1.1;
    }
    for (const node of state.materialNodes) {
      const model = this.materialsInWorld.get(node.id);
      if (model) model.scale.setScalar(node.remaining > 0 ? 0.65 + node.remaining / 18 : 0.25);
    }
    const signature = JSON.stringify(state.groundCargo);
    if (signature !== this.cargoSignature) {
      this.cargoSignature = signature;
      this.groundLoads.clear();
      for (const pile of state.groundCargo.filter((pile) => pile.areaId === state.areaId)) {
        const group = new THREE.Group();
        group.position.set(pile.position.x, 0, pile.position.z);
        pile.items.forEach((item, index) => {
          const mesh = this.mesh(
            item.itemId === 'stone' ? this.pebble : this.box,
            item.itemId === 'stone' ? '#8d9b9a' : '#aa7c50',
            [index * 0.4, 0.25, 0],
            [0.65, 0.35, 0.6],
          );
          group.add(mesh);
        });
        this.groundLoads.add(group);
      }
    }
    for (const [id, cluster] of this.berries) {
      cluster.visible = state.resources.find((node) => node.id === id)?.available ?? false;
    }
    if (state.areaId === 'homestead') {
      for (const plot of state.plots) {
        const bed = this.beds.get(plot.id);
        if (!bed) continue;
        const moist = plot.moistUntil > state.totalMinutes;
        bed.soil.material = this.material(!plot.tilled ? '#7f8f55' : moist ? '#4a3120' : '#bf9763');
        bed.weeds.visible = !plot.tilled;
        bed.plants.visible = !!plot.crop;
        if (!plot.crop) continue;
        const [leaf, produce] = CROP_COLORS[plot.crop.speciesId];
        const growth = plot.crop.growthMinutes / CROPS[plot.crop.speciesId].growthMinutes;
        bed.plants.scale.set(1, 0.3 + growth * 0.7, 1);
        for (const mesh of bed.leaves) {
          mesh.material = this.material(plot.crop.withered ? '#9a8a5c' : leaf);
          mesh.scale.set(...LEAF_SHAPES[plot.crop.speciesId]);
        }
        for (const mesh of bed.fruit) {
          mesh.visible = plotReady(plot);
          mesh.material = this.material(produce);
        }
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
    const indoors = state.areaId === 'cottage';
    const overcast = !indoors && ['rain', 'cloudy', 'snow'].includes(weatherFor(state.day));
    const daylight = indoors
      ? 0.45
      : Math.max(0, Math.sin(((state.minute - 360) / 840) * Math.PI)) * (overcast ? 0.6 : 1);
    this.sun.intensity = 1.3 + daylight * 2;
    this.hemisphere.intensity = 1.8 + daylight * 0.8;
    this.sun.color.set(indoors || daylight < 0.25 ? '#f7bd87' : '#fff0ce');
    const closestLabel = this.labels
      .filter((label) => !label.always)
      .sort(
        (a, b) =>
          Math.hypot(
            a.position.x - state.player.position.x,
            a.position.z - state.player.position.z,
          ) -
          Math.hypot(
            b.position.x - state.player.position.x,
            b.position.z - state.player.position.z,
          ),
      )[0];
    for (const label of this.labels) {
      const distance = Math.hypot(
        label.position.x - state.player.position.x,
        label.position.z - state.player.position.z,
      );
      label.element.style.opacity =
        label.always || (label === closestLabel && distance < 5) ? '1' : '0';
      this.positionLabel(label.element, label.position);
    }
    this.renderer.render(this.scene, this.camera);
  }

  /** HUD coverage in CSS pixels; the camera keeps the rancher in the uncovered area. */
  setInsets(insets: ViewInsets): void {
    Object.assign(this.insets, insets);
  }

  /** Where a world point appears on the canvas, in CSS pixels (used by layout checks). */
  screenPoint(point: Point, height = 1): { x: number; y: number } {
    const projected = new THREE.Vector3(point.x, height, point.z).project(this.camera);
    return {
      x: (projected.x * 0.5 + 0.5) * this.width,
      y: (-projected.y * 0.5 + 0.5) * this.height,
    };
  }

  /** Multiplies the visible world span; values above 1 zoom out. */
  zoomBy(factor: number): void {
    const indoors = this.area === 'cottage';
    this.zoomGoal = THREE.MathUtils.clamp(
      this.zoomGoal * factor,
      indoors ? INDOOR_ZOOM * 0.8 : ZOOM_LIMITS.min,
      indoors ? INDOOR_ZOOM * 1.3 : ZOOM_LIMITS.max,
    );
  }

  dispose(): void {
    this.observer.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.walk);
    this.renderer.domElement.removeEventListener('pointermove', this.pinch);
    for (const type of RELEASE_EVENTS)
      this.renderer.domElement.removeEventListener(type, this.release);
    this.renderer.domElement.removeEventListener('wheel', this.wheel);
    this.scenery.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelLayer.remove();
  }

  private readonly wheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.zoomBy(Math.exp(THREE.MathUtils.clamp(event.deltaY, -120, 120) * 0.0016));
  };

  private readonly pinch = (event: PointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size !== 2) return;
    const [a, b] = [...this.pointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (this.pinchDistance > 0 && distance > 0) this.zoomBy(this.pinchDistance / distance);
    this.pinchDistance = distance;
  };

  private readonly release = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinchDistance = 0;
  };

  private readonly walk = (event: PointerEvent): void => {
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    // A second finger starts a pinch rather than a walk.
    if (event.button !== 0 || this.pointers.size > 1) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (this.raycaster.ray.intersectPlane(this.ground, this.intersection)) {
      const edge = (AREAS[this.area as AreaId]?.halfSize ?? 10) - 1.2;
      const destination = {
        x: THREE.MathUtils.clamp(this.intersection.x, -edge, edge),
        z: THREE.MathUtils.clamp(this.intersection.z, -edge, edge),
      };
      this.walkMarker.position.set(destination.x, 0.075, destination.z);
      this.markerTime = 1.3;
      this.walkMarker.visible = true;
      this.onWalk(destination);
    }
  };

  private resize(): void {
    this.width = Math.max(this.container.clientWidth, 1);
    this.height = Math.max(this.container.clientHeight, 1);
    this.renderer.setSize(this.width, this.height, false);
    this.updateProjection();
  }

  /** Follows the rancher (or the current activity) with damped motion and zoom. */
  private frame(state: GameState, companionView: Point, dt: number): void {
    const player = state.player.position;
    const indoors = state.areaId === 'cottage';
    if (this.snapCamera) {
      // The cottage frames its small room; the player's outdoor zoom returns afterwards.
      if (indoors && !this.wasIndoors) this.outdoorZoom = this.zoomGoal;
      if (indoors) this.zoomGoal = INDOOR_ZOOM;
      else if (this.wasIndoors) this.zoomGoal = this.outdoorZoom;
      this.wasIndoors = indoors;
      this.zoom = this.zoomGoal;
    }
    if (indoors) this.focusGoal.set(player.x * 0.35, 0, player.z * 0.35);
    else if (state.training)
      this.focusGoal.set((player.x + companionView.x) / 2, 0, (player.z + companionView.z) / 2);
    else this.focusGoal.set(player.x, 0, player.z);
    const edge = (AREAS[state.areaId]?.halfSize ?? 10) - 2;
    this.focusGoal.x = THREE.MathUtils.clamp(this.focusGoal.x, -edge, edge);
    this.focusGoal.z = THREE.MathUtils.clamp(this.focusGoal.z, -edge, edge);
    const shiftGoalX = (this.insets.left - this.insets.right) / 2;
    const shiftGoalY = (this.insets.top - this.insets.bottom) / 2;
    if (this.snapCamera) {
      this.focus.copy(this.focusGoal);
      this.frameShift.set(shiftGoalX, shiftGoalY);
      this.snapCamera = false;
    } else {
      const follow = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 4.5);
      this.focus.lerp(this.focusGoal, follow);
      this.zoom += (this.zoomGoal - this.zoom) * (this.reducedMotion ? 1 : 1 - Math.exp(-dt * 9));
      const settle = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 6);
      this.frameShift.x += (shiftGoalX - this.frameShift.x) * settle;
      this.frameShift.y += (shiftGoalY - this.frameShift.y) * settle;
    }
    this.camera.position.copy(this.focus).addScaledVector(VIEW_DIRECTION, 60);
    this.camera.lookAt(this.focus);
    this.updateProjection();
    this.followSun();
  }

  private updateProjection(): void {
    const aspect = this.width / this.height;
    const halfHeight = Math.max(this.zoom, MIN_HALF_WIDTH / aspect);
    const halfWidth = halfHeight * aspect;
    const unitsPerPixel = (halfHeight * 2) / this.height;
    const shiftX = this.frameShift.x * unitsPerPixel;
    const shiftY = this.frameShift.y * unitsPerPixel;
    this.camera.left = -halfWidth - shiftX;
    this.camera.right = halfWidth - shiftX;
    this.camera.top = halfHeight + shiftY;
    this.camera.bottom = -halfHeight + shiftY;
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
  }

  /** Keeps the shadow map centered on the view, snapped to texels to avoid shimmering. */
  private followSun(): void {
    const aspect = this.width / this.height;
    const halfHeight = Math.max(this.zoom, MIN_HALF_WIDTH / aspect);
    const extent = Math.min(30, Math.hypot(halfHeight * aspect, halfHeight * 1.7) + 2);
    const shadow = this.sun.shadow.camera;
    if (Math.abs(extent - this.shadowExtent) > 0.25) {
      this.shadowExtent = extent;
      Object.assign(shadow, { left: -extent, right: extent, top: extent, bottom: -extent });
      shadow.updateProjectionMatrix();
    }
    const texel = (this.shadowExtent * 2) / this.sun.shadow.mapSize.x;
    const direction = this.sunDirection;
    const right = this.sunRight.set(0, 1, 0).cross(direction).normalize();
    const up = this.sunUp.copy(direction).cross(right);
    const along = this.focus.dot(direction);
    const x = Math.round(this.focus.dot(right) / texel) * texel;
    const y = Math.round(this.focus.dot(up) / texel) * texel;
    this.sun.target.position
      .set(0, 0, 0)
      .addScaledVector(right, x)
      .addScaledVector(up, y)
      .addScaledVector(direction, along);
    this.sun.position
      .copy(this.sun.target.position)
      .addScaledVector(direction, SUN_OFFSET.length());
    this.sun.target.updateMatrixWorld();
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
    this.surroundings?.dispose();
    this.surroundings = undefined;
    this.scenery.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    this.scenery.clear();
    this.geometries.splice(this.permanentGeometryCount).forEach((geometry) => geometry.dispose());
    this.berries.clear();
    this.materialsInWorld.clear();
    this.containerModels.clear();
    this.millBlade.clear();
    this.groundLoads.clear();
    this.cargoSignature = '';
    this.beds.clear();
    this.liftStone.clear();
    this.pullStone.clear();
    this.spectators.clear();
    this.confetti.clear();
    this.smoke.clear();
    this.shedRoof.clear();
    this.labels.forEach((label) => label.element.remove());
    this.labels.length = 0;
    const indoors = state.areaId === 'cottage';
    const sky = indoors ? '#e9dcc6' : this.palette.sky;
    (this.scene.background as THREE.Color).set(sky);
    this.scene.fog?.color.set(sky);
    this.backdrop.material = this.material(sky);
    if (indoors) this.cottageInterior();
    else {
      this.surroundings = buildSurroundings(
        state.areaId,
        calendarDate(state.day).season,
        QUALITY_SETTINGS[this.qualityTier].detail,
      );
      this.scenery.add(this.surroundings.group);
      if (state.areaId === 'homestead') {
        this.homestead();
        this.gardenBeds(state);
      } else if (state.areaId === 'colosseum') this.colosseum();
      else this.glade(state);
    }
    for (const node of state.materialNodes.filter((node) => node.areaId === state.areaId)) {
      const group = new THREE.Group();
      group.position.set(node.position.x, 0, node.position.z);
      if (node.kind === 'timber') {
        const log = this.mesh(this.cylinder, '#8c603e', [0, 0.42, 0], [0.46, 2.1, 0.46]);
        log.rotation.z = Math.PI / 2;
        const end = this.mesh(this.cylinder, '#ddb87e', [1.06, 0.42, 0], [0.37, 0.04, 0.37]);
        end.rotation.z = Math.PI / 2;
        group.add(log, end);
      } else {
        group.add(this.mesh(this.pebble, '#819394', [0, 0.65, 0], [1, 0.85, 0.85]));
        group.add(this.mesh(this.box, '#d6dfd6', [0.1, 0.9, 0.65], [0.07, 0.65, 0.04]));
      }
      this.materialsInWorld.set(node.id, group);
      this.scenery.add(group);
      this.label(
        node.kind === 'timber' ? 'Fallen timber' : 'Quarry stone',
        node.position.x,
        1.7,
        node.position.z,
      );
    }
    this.scenery.add(this.groundLoads);
    if (state.areaId === 'homestead') {
      for (const container of state.containers) {
        if (!('position' in container.location)) continue;
        const { x, z } = container.location.position;
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        const trough = container.kind === 'trough';
        group.add(
          this.mesh(this.box, trough ? '#857b60' : '#9b714b', [0, 0.25, 0], [1.1, 0.45, 0.85]),
        );
        for (const side of [-1, 1])
          group.add(this.mesh(this.box, '#d1ac79', [side * 0.55, 0.5, 0], [0.1, 0.4, 0.95]));
        const contents = new THREE.Group();
        for (let i = 0; i < (container.capacity ?? 4); i++) {
          // Display at most eight pieces; counts remain inspectable in the dock.
          if (i >= 8) break;
          contents.add(
            this.mesh(
              this.box,
              trough ? '#8ca060' : '#d7b17b',
              [(i % 2) * 0.35 - 0.18, 0.5 + Math.floor(i / 2) * 0.12, 0],
              [0.3, 0.1, 0.65],
            ),
          );
        }
        group.add(contents);
        this.containerModels.set(container.id, contents);
        this.scenery.add(group);
        this.label(
          container.kind === 'chest'
            ? 'Yard chest'
            : trough
              ? 'Feed trough'
              : container.kind === 'mill-input'
                ? 'Timber hopper'
                : 'Lumber crate',
          x,
          1.35,
          z,
        );
      }
      const frame = new THREE.Group();
      frame.position.set(5.65, 0, 0.3);
      frame.add(this.mesh(this.box, '#786344', [0, 0.75, 0], [1.8, 0.2, 0.65]));
      for (const side of [-1, 1])
        frame.add(this.mesh(this.box, '#6c7868', [side * 0.65, 0.45, 0], [0.15, 0.9, 0.5]));
      this.millBlade.add(this.mesh(this.cylinder, '#d3ded8', [0, 0, 0], [0.5, 0.06, 0.5]));
      this.millBlade.children[0].rotation.x = Math.PI / 2;
      this.millBlade.add(this.mesh(this.box, '#7e9390', [0, 0, 0.05], [0.08, 0.9, 0.08]));
      this.millBlade.position.set(0, 1, 0);
      frame.add(this.millBlade);
      this.scenery.add(frame);
    }
    if (state.areaId === 'homestead' || state.areaId === 'glade')
      this.grass(state.areaId === 'homestead' ? 97 : 301);
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
    this.training(3, 2);
    this.market(-6, 5);
    this.race(2, 6);
    this.liftStation(5.2, 6.6);
    const trees: [number, number, number][] = [
      [-7.3, -6.7, 1.1],
      [-2.2, -7.2, 0.9],
      [1.1, -7.1, 1.05],
      [7.3, -6.8, 1.18],
      [7.8, -3.7, 0.85],
      [-8, -1.7, 0.82],
      [8.3, 3.5, 0.45],
      [7.8, 7.7, 0.5],
      [-7.1, 7.4, 0.72],
    ];
    trees.forEach(([x, z, scale], index) => this.tree(x, z, scale, index));
    this.fence([-7.5, -7.9], [5.8, -7.9], 8);
    this.fence([8, -5.4], [8, -1.4], 3);
    this.fence([8, 1.4], [8, 7], 4);
    this.fence([-4.9, 7.6], [-0.1, 7.6], 3);
    this.gate(8, 0, false);
    const labelHeights: Partial<Record<string, number>> = {
      house: 3.8,
      shed: 3.1,
      training: 1.9,
      market: 2.5,
      gate: 2.4,
      race: 1.8,
    };
    for (const object of AREAS.homestead.objects) {
      this.label(
        object.name,
        object.position.x,
        labelHeights[object.kind] ?? 1.8,
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
      [-7.4, 5.8, 0.85],
      [-4, 7, 0.9],
      [-0.8, 8, 0.85],
      [7, 7.2, 0.9],
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
        if (index < 3) this.label('Sunberries', node.position.x, 1.7, node.position.z);
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
    this.gate(7.6, -4.4, false);
    this.label('Colosseum grounds ↗', 7.6, 2.4, -4.4, true);
    const loop = this.mesh(
      this.keep(new THREE.RingGeometry(1.25, 1.95, 40)),
      '#d9c38e',
      [1.2, 0.04, 6.8],
    );
    loop.rotation.x = -Math.PI / 2;
    this.scenery.add(loop);
    this.scenery.add(this.mesh(this.cylinder, '#b59569', [1.2, 0.55, 6.8], [0.07, 1.1, 0.07]));
    this.scenery.add(this.mesh(this.box, '#6c938b', [1.2, 1.05, 6.8], [0.6, 0.3, 0.05]));
    this.label('Pacing loop', 1.2, 1.7, 6.8);
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
      variant % 3 === 0 && this.palette.accent ? this.palette.accent : this.palette.canopy;
    tree.add(this.mesh(this.sphere, colors[0], [0, 2.7, 0], [1.15, 1.26, 1.06]));
    tree.add(this.mesh(this.sphere, colors[1], [-0.67, 2.42, 0.13], [0.86, 0.94, 0.83]));
    tree.add(this.mesh(this.sphere, colors[1], [0.65, 2.53, 0.17], [0.85, 0.96, 0.86]));
    tree.add(this.mesh(this.sphere, colors[2], [0.09, 3.32, 0.15], [0.88, 0.86, 0.85]));
    if (this.palette.snow)
      tree.add(this.mesh(this.sphere, '#f6f8f8', [0.05, 3.62, 0.14], [0.76, 0.36, 0.74]));
    tree.rotation.y = variant * 2.1;
    if (variant % 3 === 0 && !this.palette.accent && !this.palette.snow) {
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

  private gardenBeds(state: GameState): void {
    state.plots.forEach((plot, index) => {
      const bed = new THREE.Group();
      bed.position.set(plot.position.x, 0, plot.position.z);
      const soil = this.mesh(this.box, '#a27d4f', [0, 0.09, 0], [1.14, 0.15, 1.14]);
      bed.add(soil);
      for (const side of [-1, 1]) {
        bed.add(this.mesh(this.box, '#b39c6c', [side * 0.6, 0.14, 0], [0.08, 0.24, 1.28]));
        bed.add(this.mesh(this.box, '#b39c6c', [0, 0.14, side * 0.6], [1.28, 0.24, 0.08]));
      }
      const weeds = new THREE.Group();
      for (let tuft = 0; tuft < 6; tuft++) {
        const angle = tuft * 2.3 + index;
        weeds.add(
          this.mesh(
            this.cone,
            '#6f8f4c',
            [Math.cos(angle) * 0.34, 0.3, Math.sin(angle) * 0.3],
            [0.09, 0.26, 0.09],
          ),
        );
      }
      bed.add(weeds);
      const plants = new THREE.Group();
      const leaves: THREE.Mesh[] = [];
      const fruit: THREE.Mesh[] = [];
      for (let row = 0; row < 2; row++)
        for (let column = 0; column < 2; column++) {
          const x = column * 0.5 - 0.25;
          const z = row * 0.5 - 0.25;
          for (let leaf = 0; leaf < 3; leaf++) {
            const angle = leaf * 2.1;
            const sprout = this.mesh(
              this.sphere,
              '#8daa52',
              [x + Math.sin(angle) * 0.09, 0.4, z + Math.cos(angle) * 0.09],
              [0.1, 0.26, 0.07],
            );
            sprout.rotation.z = Math.sin(angle) * 0.6;
            leaves.push(sprout);
            plants.add(sprout);
          }
          const produce = this.mesh(this.sphere, '#e5b670', [x, 0.24, z], [0.14, 0.16, 0.14]);
          fruit.push(produce);
          plants.add(produce);
        }
      bed.add(plants);
      this.beds.set(plot.id, { soil, weeds, plants, leaves, fruit });
      this.scenery.add(bed);
    });
    this.label('Garden beds', -4.3, 1.1, 2.7);
    const can = this.mesh(this.cylinder, '#709896', [-6.2, 0.23, 2.2], [0.25, 0.42, 0.25]);
    this.scenery.add(can);
    const spout = this.mesh(this.cylinder, '#709896', [-5.92, 0.25, 2.2], [0.07, 0.5, 0.07]);
    spout.rotation.z = -0.95;
    this.scenery.add(spout);
  }

  private liftStation(x: number, z: number): void {
    const base = this.mesh(
      this.cylinder,
      this.palette.snow ? '#dde5e2' : '#b2bd78',
      [x, 0.039, z],
      [1.3, 0.045, 1.3],
    );
    this.scenery.add(base);
    this.liftStone.position.set(0, 0, 0);
    this.liftStone.add(this.mesh(this.pebble, '#8f9c97', [x, 0.55, z], [0.7, 0.55, 0.6]));
    this.liftStone.add(this.mesh(this.box, '#a5835b', [x, 0.55, z + 0.62], [0.9, 0.1, 0.1]));
    this.scenery.add(this.liftStone);
    for (const side of [-1, 1])
      this.scenery.add(
        this.mesh(this.box, '#a5835b', [x + side * 0.8, 0.5, z - 0.3], [0.1, 1, 0.1]),
      );
  }

  private colosseum(): void {
    this.path(
      [
        [-9.2, 4],
        [-6, 3.2],
        [-3.5, 1.5],
        [-2, 0.4],
      ],
      1.4,
    );
    const arena = this.mesh(this.cylinder, '#e3cf9e', [1, 0.03, -1], [5.4, 0.06, 3.6]);
    arena.receiveShadow = true;
    this.scenery.add(arena);
    const lane = this.mesh(this.box, '#d2b887', [0.5, 0.07, -1], [8, 0.02, 0.8]);
    this.scenery.add(lane);
    // Low arena wall, and tiered but unfinished stands around the far half.
    for (let post = 0; post < 22; post++) {
      const angle = (post / 22) * Math.PI * 2;
      this.scenery.add(
        this.mesh(
          this.box,
          '#c9b58c',
          [1 + Math.cos(angle) * 5.6, 0.3, -1 + Math.sin(angle) * 3.8],
          [0.6, 0.6, 0.6],
        ),
      );
    }
    const colors = ['#c8866a', '#6c938b', '#e0b35c', '#8e7bb0', '#d9a77f', '#5f8a6a'];
    for (let tier = 0; tier < 3; tier++) {
      const radiusX = 6.2 + tier * 0.8;
      const radiusZ = 4.4 + tier * 0.75;
      for (let seat = 0; seat < 16; seat++) {
        // Only the back arc is built; gaps and bare scaffolding mark the unfinished shell.
        const angle = Math.PI * 1.02 + (seat / 15) * Math.PI * 0.96;
        const x = 1 + Math.cos(angle) * radiusX;
        const z = -1 + Math.sin(angle) * radiusZ;
        if ((seat + tier) % 5 === 4) {
          this.scenery.add(
            this.mesh(
              this.box,
              '#a38b60',
              [x, 0.6 + tier * 0.45, z],
              [0.08, 1.2 + tier * 0.9, 0.08],
            ),
          );
          continue;
        }
        this.scenery.add(
          this.mesh(this.box, '#bfae8d', [x, 0.25 + tier * 0.45, z], [1.3, 0.5 + tier * 0.9, 0.9]),
        );
        if ((seat * 7 + tier) % 3 === 0) continue;
        const fan = new THREE.Group();
        fan.add(
          this.mesh(
            this.sphere,
            colors[(seat + tier) % colors.length],
            [x, 0.85 + tier * 0.9, z],
            [0.2, 0.26, 0.2],
          ),
        );
        fan.add(this.mesh(this.sphere, '#e3b48d', [x, 1.2 + tier * 0.9, z], [0.14, 0.14, 0.14]));
        this.spectators.add(fan);
      }
    }
    this.scenery.add(this.spectators);
    for (let piece = 0; piece < 30; piece++) {
      this.confetti.add(
        this.mesh(
          this.box,
          colors[piece % colors.length],
          [
            1 + Math.cos(piece * 2.4) * (1 + (piece % 5)),
            3,
            -1 + Math.sin(piece * 2.4) * (0.8 + (piece % 4)),
          ],
          [0.12, 0.02, 0.08],
        ),
      );
    }
    this.confetti.visible = false;
    this.scenery.add(this.confetti);
    this.pullStone.add(this.mesh(this.pebble, '#7f8c88', [2.9, 0.5, -1], [0.75, 0.5, 0.6]));
    this.scenery.add(this.pullStone);
    this.pennants(-4, -4.8, 6, -4.8, 3.2);
    const booth = new THREE.Group();
    booth.position.set(-3, 0, 1);
    booth.add(this.mesh(this.box, '#9b714b', [0, 0.45, 0], [1.2, 0.9, 0.7]));
    booth.add(this.mesh(this.box, '#e7d8ac', [0, 0.93, 0], [1.3, 0.06, 0.8]));
    booth.add(this.mesh(this.cylinder, '#b59569', [-0.55, 1.2, -0.25], [0.05, 1.3, 0.05]));
    booth.add(this.mesh(this.cylinder, '#b59569', [0.55, 1.2, -0.25], [0.05, 1.3, 0.05]));
    booth.add(this.mesh(this.box, '#c8866a', [0, 1.85, -0.25], [1.4, 0.12, 0.8]));
    this.scenery.add(booth);
    this.gate(-8, 4, true);
    const heights: Partial<Record<string, number>> = { gate: 2.4, exhibition: 2.3 };
    for (const object of AREAS.colosseum.objects)
      this.label(
        object.kind === 'gate' ? '↙ Back to Clover Glade' : object.name,
        object.position.x,
        heights[object.kind] ?? 1.8,
        object.position.z,
        object.kind === 'gate',
      );
  }

  private cottageInterior(): void {
    const floor = this.mesh(this.box, '#c89f6e', [0, -0.1, 0], [10.4, 0.2, 10.4]);
    this.scenery.add(floor);
    for (let board = 0; board < 12; board++)
      this.scenery.add(
        this.mesh(this.box, '#b58a5c', [-5 + board * 0.87, 0.005, 0], [0.03, 0.02, 10.3]),
      );
    // Only the two far walls stand, so the camera looks into the room like a dollhouse.
    this.scenery.add(this.mesh(this.box, '#f1dfb5', [-5.2, 1.5, 0], [0.3, 3, 10.4]));
    this.scenery.add(this.mesh(this.box, '#eddbaf', [0, 1.5, -5.2], [10.4, 3, 0.3]));
    this.scenery.add(this.mesh(this.box, '#b9905f', [-5.02, 0.15, 0], [0.08, 0.3, 10.3]));
    this.scenery.add(this.mesh(this.box, '#b9905f', [0, 0.15, -5.02], [10.3, 0.3, 0.08]));
    const pane = new THREE.Group();
    this.window(pane, -2.4, 1.8, -5.04, 0.9);
    this.scenery.add(pane);
    this.scenery.add(this.mesh(this.cylinder, '#b76e54', [0.2, 0.02, 0.4], [2.3, 0.02, 1.7]));
    this.scenery.add(this.mesh(this.cylinder, '#d9a77f', [0.2, 0.03, 0.4], [1.8, 0.02, 1.3]));
    // Bed with a quilted cover.
    const bed = new THREE.Group();
    bed.position.set(-3, 0, -2.6);
    bed.add(this.mesh(this.box, '#8c603e', [0, 0.3, 0], [1.6, 0.4, 2.4]));
    bed.add(this.mesh(this.box, '#f3e8c5', [0, 0.58, 0], [1.45, 0.18, 2.25]));
    bed.add(this.mesh(this.box, '#537a74', [0, 0.7, 0.3], [1.5, 0.08, 1.6]));
    bed.add(this.mesh(this.box, '#fbf3dc', [0, 0.74, -0.8], [0.9, 0.16, 0.4]));
    bed.add(this.mesh(this.box, '#8c603e', [0, 0.75, -1.2], [1.6, 1.1, 0.12]));
    this.scenery.add(bed);
    // Stone hearth with a small fire and chimney breast.
    const hearth = new THREE.Group();
    hearth.position.set(3, 0, -3.7);
    hearth.add(this.mesh(this.box, '#a39c8c', [0, 0.75, -0.8], [1.9, 1.5, 0.9]));
    hearth.add(this.mesh(this.box, '#8f887a', [0, 2.25, -0.95], [1.1, 1.5, 0.6]));
    hearth.add(this.mesh(this.box, '#3f3530', [0, 0.55, -0.35], [1, 0.8, 0.1]));
    hearth.add(this.mesh(this.box, '#b8b0a0', [0, 0.08, -0.1], [2.1, 0.16, 0.7]));
    for (let flame = 0; flame < 3; flame++)
      hearth.add(
        this.mesh(
          this.cone,
          flame === 1 ? '#f6c25d' : '#ee8a45',
          [(flame - 1) * 0.2, 0.4, -0.3],
          [0.16, 0.45 - Math.abs(flame - 1) * 0.12, 0.16],
        ),
      );
    const glow = new THREE.PointLight('#ffb36b', 6, 7, 1.6);
    glow.position.set(0, 0.8, 0.4);
    hearth.add(glow);
    this.scenery.add(hearth);
    // Kitchen counter along the side wall with a kettle.
    const counter = new THREE.Group();
    counter.position.set(-3.9, 0, 1.6);
    counter.add(this.mesh(this.box, '#9b714b', [-0.4, 0.5, 0], [1, 1, 2.2]));
    counter.add(this.mesh(this.box, '#e0cfa6', [-0.4, 1.03, 0], [1.1, 0.08, 2.3]));
    counter.add(this.mesh(this.sphere, '#537a74', [-0.35, 1.2, -0.5], [0.2, 0.17, 0.2]));
    counter.add(this.mesh(this.box, '#d8b98a', [-0.35, 1.1, 0.5], [0.5, 0.05, 0.35]));
    this.scenery.add(counter);
    // Wall calendar: a paper sheet with a grid of season rows.
    const calendar = new THREE.Group();
    calendar.position.set(0.2, 1.75, -5.03);
    calendar.add(this.mesh(this.box, '#8c603e', [0, 0, 0], [1.25, 1.05, 0.05]));
    calendar.add(this.mesh(this.box, '#fbf3dc', [0, -0.03, 0.03], [1.1, 0.88, 0.02]));
    const seasonColors = ['#8daa52', '#e2b35a', '#c7784e', '#8fb0c0'];
    seasonColors.forEach((color, row) =>
      calendar.add(this.mesh(this.box, color, [0, 0.3 - row * 0.2, 0.045], [0.95, 0.06, 0.01])),
    );
    calendar.add(this.mesh(this.box, '#b76e54', [0, 0.46, 0.04], [1.1, 0.1, 0.02]));
    this.scenery.add(calendar);
    this.scenery.add(this.mesh(this.box, '#b39c6c', [1.6, 0.02, 4.6], [1.3, 0.04, 0.6]));
    const heights: Partial<Record<string, number>> = {
      door: 1.2,
      bed: 1.6,
      calendar: 2.8,
      hearth: 3,
      counter: 1.8,
    };
    for (const object of AREAS.cottage.objects)
      this.label(
        object.name,
        object.position.x,
        heights[object.kind] ?? 1.5,
        object.position.z,
        object.kind === 'door',
      );
  }

  private training(x: number, z: number): void {
    const track = this.mesh(
      this.cylinder,
      this.palette.snow ? '#dde5e2' : '#b2bd78',
      [x, 0.039, z],
      [2.1, 0.045, 1.9],
    );
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
    const grass = new THREE.InstancedMesh(this.cone, this.material(this.palette.blade), 360);
    const flowers = new THREE.InstancedMesh(this.sphere, this.material(this.palette.flower), 94);
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

  private buildFeedback(): void {
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.22);
    heart.bezierCurveTo(-0.3, -0.03, -0.28, 0.19, -0.14, 0.21);
    heart.bezierCurveTo(-0.05, 0.24, 0, 0.16, 0, 0.1);
    heart.bezierCurveTo(0, 0.16, 0.05, 0.24, 0.14, 0.21);
    heart.bezierCurveTo(0.28, 0.19, 0.3, -0.03, 0, -0.22);
    const heartGeometry = this.keep(new THREE.ShapeGeometry(heart));
    const sparkle = new THREE.Shape();
    for (let point = 0; point < 8; point++) {
      const angle = (point / 8) * Math.PI * 2;
      const radius = point % 2 ? 0.055 : 0.2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (point === 0) sparkle.moveTo(x, y);
      else sparkle.lineTo(x, y);
    }
    sparkle.closePath();
    const sparkleGeometry = this.keep(new THREE.ShapeGeometry(sparkle));
    for (let particle = 0; particle < 3; particle++) {
      this.affection.add(this.mesh(heartGeometry, '#c17c7c'));
    }
    for (let particle = 0; particle < 5; particle++) {
      this.delight.add(this.mesh(sparkleGeometry, '#ebc66d'));
    }
    for (const color of ['#c17c7c', '#ebc66d', '#fff3c5']) {
      const material = this.material(color);
      material.transparent = true;
      material.depthWrite = false;
    }
    this.affection.visible = false;
    this.delight.visible = false;
    this.walkMarker.visible = false;
    this.walkMarker.rotation.x = -Math.PI / 2;
    this.walkMarker.castShadow = false;
    this.scene.add(this.affection, this.delight, this.walkMarker);
  }

  private animateFeedback(state: GameState, dt: number): void {
    const message = state.journal[0];
    if (this.lastJournal !== undefined && message !== this.lastJournal) {
      // Journal language chooses an ephemeral expression, never a gameplay outcome.
      const care = /trill|crunches|nibble|soft bedding/i.test(message);
      const achievement = /sunberries|watches|learn|rhythm|practice|gains|ribbon|medal/i.test(
        message,
      );
      if (care || achievement) {
        this.feedbackTime = 1.8;
        this.affection.visible = care;
        this.delight.visible = !care;
      }
    }
    this.lastJournal = message;
    this.feedbackTime = Math.max(0, this.feedbackTime - dt);
    const elapsed = 1.8 - this.feedbackTime;
    for (const group of [this.affection, this.delight]) {
      if (this.feedbackTime === 0) group.visible = false;
      if (!group.visible) continue;
      group.position.copy(this.critter.position);
      group.position.y += 1.75;
      group.quaternion.copy(this.camera.quaternion);
      group.children.forEach((particle, index) => {
        particle.position.set(
          Math.sin(index * 2.5) * 0.7,
          index * 0.18 + (this.reducedMotion ? 0 : elapsed * 0.55),
          0,
        );
        particle.rotation.z = this.reducedMotion ? 0 : Math.sin(elapsed * 3 + index) * 0.2;
        (
          particle as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
        ).material.opacity = Math.min(1, this.feedbackTime / 0.6);
      });
    }
    if (this.affection.visible && !this.reducedMotion && !state.training) {
      this.critterBody.rotation.z = Math.sin(elapsed * 8) * 0.065;
    } else this.critterBody.rotation.z = 0;
    this.markerTime = Math.max(0, this.markerTime - dt);
    this.walkMarker.visible = this.markerTime > 0;
    this.material('#fff3c5').opacity = Math.min(1, this.markerTime / 0.6);
    this.walkMarker.scale.setScalar(this.reducedMotion ? 1 : 1 + (1.3 - this.markerTime) * 0.4);
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
    element.className = critter ? 'world-label critter-label' : 'world-label';
    element.style.cssText =
      'position:absolute;left:0;top:0;will-change:transform;transition:opacity .25s;';
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
