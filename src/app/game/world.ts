import { backpack, satchel } from './model';
import * as THREE from 'three';
import { productionStatus, quantity } from './logistics';
import { AREAS, CROPS } from './content';
import { plotReady } from './garden';
import { calendarDate, weatherFor } from './calendar';
import { buildSurroundings, type Surroundings } from './render/terrain';
import { PALETTES, type SeasonPalette } from './render/palette';
import { Atmosphere, glowTexture } from './render/atmosphere';
import { addWind, wind } from './render/wind';
import { Finish } from './render/post';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  activeCritter,
  type AreaId,
  type CropId,
  type Critter,
  type GameState,
  type Point,
} from './model';
import { type Appearance } from './families';
import { GRANDPA, grandpaWhereabouts, PIP_ID, pipWhereabouts } from './household';
import { type SceneStage } from './opening';
import { appearanceKey, buildFigure, type FigureKit, type FigureParts } from './render/figures';
import {
  detectQuality,
  pixelRatioFor,
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
// A press becomes a steering hold after this long or this much travel; a finger this close
// to the rancher (in world units) stands still rather than jittering around them.
const STEER_HOLD_MS = 260;
const STEER_SLOP = 14;
const STEER_DEADZONE = 0.6;
const FLOAT_LIFE = 2;
// The companion's expressions: reactions the app asks for, and idle fidgets in between.
export type Reaction = 'pet' | 'eat' | 'cheer' | 'try' | 'learned';
type Emote = Reaction | 'look' | 'hop' | 'stretch' | 'sniff' | 'yawn' | 'beg';
const EMOTE_SECONDS: Record<Emote, number> = {
  pet: 1.8,
  eat: 2.2,
  cheer: 1.6,
  try: 1.3,
  learned: 2.2,
  look: 2.2,
  hop: 0.9,
  stretch: 1.8,
  sniff: 2,
  yawn: 2.4,
  beg: 1.6,
};
const IDLE_EMOTES = ['look', 'hop', 'stretch', 'sniff'] as const;
const RESTING_POSE = {
  hop: 0,
  pitch: 0,
  yaw: 0,
  roll: 0,
  tall: 0,
  long: 0,
  squint: 1,
  ears: 0,
  wag: 1,
  reach: 0,
};
// Wind by weather: blustery rain, still snow.
const WIND_BY_WEATHER = { sunny: 1, cloudy: 1.25, rain: 1.8, snow: 0.6 } as const;
const BUTTERFLY_COLORS = ['#f4e3a1', '#fbf6e8', '#bcd3e6', '#f2c1a8'];
const PUFF_LIFE = 0.7;

/** A critter shown in the world before it belongs to anyone, such as a starter on offer. */
export interface GuestCritter {
  id: string;
  name: string;
  speciesId: string;
  visualTraits: Appearance;
  position: Point;
}
interface Guest {
  id: string;
  root: THREE.Group;
  parts: FigureParts;
  label: HTMLDivElement;
  shadow: THREE.Mesh;
  phase: number;
  blink: number;
}

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
  private readonly atmosphere: Atmosphere;
  // Ambient life: sway, expressions, footstep dust, contact shadows, and the target ring.
  private readonly soft = glowTexture();
  private readonly areaMaterials: THREE.Material[] = [];
  private readonly swaying: { object: THREE.Object3D; phase: number; amount: number }[] = [];
  private critterEyes: THREE.Mesh[] = [];
  private readonly farmerEyes: THREE.Mesh[] = [];
  private critterEars: THREE.Mesh[] = [];
  private readonly farmerArms: THREE.Group[] = [];
  private blink = { critter: 1.6, farmer: 2.8, twitch: 3.5 };
  private readonly puffs: { sprite: THREE.Sprite; life: number }[] = [];
  private puffTimer = 0;
  private readonly contactShadows: THREE.Mesh[] = [];
  private readonly targetRing: THREE.Mesh;
  private targetId: string | null = null;
  private readonly butterflies = new THREE.Group();
  private finish: Finish | null = null;
  private environment: THREE.Texture | null = null;
  private readonly glossy = new Map<string, THREE.MeshStandardMaterial>();
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
  private readonly torus = this.keep(new THREE.TorusGeometry(0.26, 0.057, 6, 18));
  private readonly figureKit: FigureKit = {
    mesh: (geometry, color, position, scale) => this.mesh(geometry, color, position, scale),
    sphere: this.sphere,
    cylinder: this.cylinder,
    cone: this.cone,
    torus: this.torus,
  };
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
  private critterBody = new THREE.Group();
  private tail = new THREE.Group();
  // The companion's figure is rebuilt whenever its family or appearance changes.
  private figureKey = '';
  private critterHeight = 1.9;
  private guests: Guest[] = [];
  private guestFocus: string | null = null;
  // Grandpa and Pip: figures, eased view positions, labels and shadows.
  private readonly grandpa = new THREE.Group();
  private readonly grandpaBody = new THREE.Group();
  private readonly grandpaLegs: THREE.Mesh[] = [];
  private readonly pip = new THREE.Group();
  private pipParts?: FigureParts;
  private readonly gemothy = new THREE.Group();
  private gemothyParts?: FigureParts;
  // The opening walk stages Grandpa, Pip and Gemothy by hand; null in ordinary play.
  private staging: SceneStage | null = null;
  private townHedge: THREE.Group[] = [];
  private townBin: THREE.Group | null = null;
  private readonly residentViews = new Map<
    string,
    {
      at: Point | null;
      last: THREE.Vector2;
      label: HTMLDivElement;
      shadow: THREE.Mesh;
      phase: number;
      blink: number;
    }
  >();
  private readonly farmerLegs: THREE.Mesh[] = [];
  private critterLegs: THREE.Mesh[] = [];
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
  // A held pointer steers toward itself every frame (the camera follows, so holding still
  // keeps walking that way); a quick tap walks to the spot.
  private steer: {
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    since: number;
    held: boolean;
  } | null = null;
  private readonly floats: { element: HTMLDivElement; who: 'player' | 'critter'; age: number }[] =
    [];
  private emote: { kind: Emote; time: number; requested: boolean } | null = null;
  private idleTimer = 3;

  constructor(
    private readonly container: HTMLElement,
    // A destination to walk to, or null to stop (a released hold or a pinch).
    private readonly onWalk: (point: Point | null) => void,
    qualityChoice: QualityChoice = 'auto',
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.gpuName = rendererName(this.renderer.getContext());
    // PCF filtering softens by `shadow.radius` (three.js folded PCFSoft into it).
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
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
    // The camera sits 60 units from its focus; haze begins beyond the playable view.
    this.scene.fog = new THREE.Fog('#dce9e3', 74, 150);
    this.camera.position.copy(VIEW_DIRECTION).multiplyScalar(60);
    this.camera.lookAt(0, 0, 0);
    this.sun.position.copy(SUN_OFFSET);
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
    this.glaze(this.farmer);
    this.companionLoad.add(this.mesh(this.box, '#c59160', [0, 0.9, 0.3], [0.85, 0.18, 0.35]));
    this.companionLoad.add(this.mesh(this.box, '#866546', [0.37, 0.6, 0], [0.27, 0.35, 0.4]));
    this.critter.rotation.y = 0.6;
    this.buildFeedback();
    this.atmosphere = new Atmosphere(this.scene, this.sun, this.hemisphere, this.renderer);
    for (let index = 0; index < 28; index++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: this.soft, transparent: true, depthWrite: false }),
      );
      sprite.visible = false;
      this.puffs.push({ sprite, life: 0 });
      this.scene.add(sprite);
    }
    const shadowGeometry = this.keep(new THREE.PlaneGeometry(1, 1));
    for (const size of [1.05, 1.3]) {
      const shadow = new THREE.Mesh(
        shadowGeometry,
        new THREE.MeshBasicMaterial({
          map: this.soft,
          color: '#1b261f',
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
        }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.scale.setScalar(size);
      shadow.renderOrder = 1;
      this.contactShadows.push(shadow);
      this.scene.add(shadow);
    }
    this.buildGrandpa();
    this.scene.add(this.grandpa, this.pip, this.gemothy);
    for (const [id, name] of [
      [GRANDPA.id, GRANDPA.name],
      [PIP_ID, 'Pip'],
      ['gemothy', 'Gemothy'],
    ]) {
      const shadow = this.contactShadows[1].clone();
      shadow.visible = false;
      this.scene.add(shadow);
      const label = this.makeLabel(name, true);
      label.style.display = 'none';
      this.residentViews.set(id, {
        at: null,
        last: new THREE.Vector2(),
        label,
        shadow,
        phase: id.length,
        blink: 2,
      });
    }
    this.targetRing = new THREE.Mesh(
      this.keep(new THREE.RingGeometry(0.78, 0.95, 56)),
      new THREE.MeshBasicMaterial({ color: '#f0bf45', transparent: true, depthWrite: false }),
    );
    this.targetRing.rotation.x = -Math.PI / 2;
    this.targetRing.renderOrder = 2;
    this.targetRing.visible = false;
    this.scene.add(this.targetRing);
    const wingGeometry = this.keep(new THREE.PlaneGeometry(0.26, 0.2).translate(0.13, 0, 0));
    for (let index = 0; index < 7; index++) {
      const butterfly = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({
        color: BUTTERFLY_COLORS[index % BUTTERFLY_COLORS.length],
        side: THREE.DoubleSide,
        roughness: 0.6,
      });
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(wingGeometry, material);
        wing.scale.x = side;
        butterfly.add(wing);
      }
      this.butterflies.add(butterfly);
    }
    this.scene.add(this.butterflies);
    this.permanentGeometryCount = this.geometries.length;
    this.renderer.domElement.addEventListener('pointerdown', this.walk);
    this.renderer.domElement.addEventListener('pointermove', this.pointerMove);
    for (const type of RELEASE_EVENTS)
      this.renderer.domElement.addEventListener(type, this.release);
    this.renderer.domElement.addEventListener('wheel', this.wheel, { passive: false });
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.setQuality(qualityChoice);
  }

  /** Whether the outdoor scene is dark enough that HUD text should switch to its night style. */
  get night(): boolean {
    return this.area !== 'cottage' && this.atmosphere.night > 0.55;
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
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, pixelRatioFor(this.qualityTier, this.gpuName)),
    );
    // Toggling the caster changes the lights' state, so materials recompile to match.
    this.renderer.shadowMap.enabled = settings.shadows;
    this.sun.castShadow = settings.shadows;
    this.atmosphere.configure(settings.detail, this.qualityTier !== 'light');
    this.finish?.dispose();
    this.finish = settings.post
      ? new Finish(this.renderer, this.scene, this.camera, { bloom: settings.bloom })
      : null;
    // A soft studio-light reflection gives the figures (only) a glazed, toy-like sheen.
    if (this.qualityTier !== 'light' && !this.environment) {
      const generator = new THREE.PMREMGenerator(this.renderer);
      this.environment = generator.fromScene(new RoomEnvironment(), 0.04).texture;
      generator.dispose();
    }
    for (const glaze of this.glossy.values()) {
      glaze.envMap = this.qualityTier === 'light' ? null : this.environment;
      glaze.envMapIntensity = 0.28;
      glaze.needsUpdate = true;
    }
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
    const figure = appearanceKey(companion.speciesId, companion.visualTraits);
    if (figure !== this.figureKey) {
      this.figureKey = figure;
      this.rebuildCritter(companion);
    }
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
    this.steerTowardPointer(state.player.position);
    this.surroundings?.update(this.clock, this.atmosphere.light, this.atmosphere.haze);
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
    this.animateLife(state, dt, visualCritterPosition, playerMoving, critterMoving, jumpHeight);
    // A companion working in the yard is not drawn inside the cottage, nor before it is chosen.
    this.critter.visible =
      (state.areaId !== 'cottage' || state.companionIndoors) &&
      this.guests.length === 0 &&
      !this.staging;
    this.animateGuests(state, dt);
    this.animateResidents(state, dt);
    // The opening walk tips the tavern bin and empties one bush of the hedge.
    this.townHedge[0]?.traverse((part) => (part.visible = !this.staging?.berriesPicked));
    if (this.townBin) {
      const [can, spill] = this.townBin.children;
      can.rotation.z = this.staging?.binTipped ? -Math.PI / 2 : 0;
      can.position.set(this.staging?.binTipped ? 0.45 : 0, this.staging?.binTipped ? 0.38 : 0, 0);
      spill.visible = !!this.staging?.binTipped;
    }
    this.critterLabel.style.display = this.critter.visible ? '' : 'none';
    this.critterLabel.textContent = companion.name;
    this.positionLabel(
      this.critterLabel,
      this.projection.set(
        visualCritterPosition.x,
        this.critterHeight + jumpHeight,
        visualCritterPosition.z,
      ),
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
        (roof as THREE.Mesh).material = this.material(
          this.palette.snow ? '#e6ecec' : state.shedLevel > 0 ? '#426d65' : '#859078',
        );
      }
      this.smoke.children.forEach((puff, index) => {
        const t = (this.clock * 0.2 + index * 0.29) % 1;
        puff.position.set(-4.22 + t * 0.4, 4.1 + t * 1.15, -4.7);
        puff.scale.setScalar(0.13 + t * 0.23);
      });
    }
    const indoors = state.areaId === 'cottage';
    this.atmosphere.update(
      {
        minute: state.minute,
        weather: weatherFor(state.day),
        indoors,
        outdoorsNight: state.areaId === 'homestead' || state.areaId === 'glade',
      },
      this.clock,
      this.focus,
      this.palette.sky,
    );
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
    this.animateFloats(dt);
    if (this.finish) {
      // Keep the rancher inside the sharp band of the miniature focus.
      const focus = this.projection
        .set(state.player.position.x, 0.9, state.player.position.z)
        .project(this.camera);
      this.finish.render(focus.y * 0.5 + 0.5, this.atmosphere.night, indoors ? 0.55 : 1);
    } else this.renderer.render(this.scene, this.camera);
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

  /** Marks the thing the interaction dock acts on with a soft ring (null hides it). */
  setTarget(id: string | null): void {
    this.targetId = id;
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
    this.setGuests(null);
    this.observer.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.walk);
    this.renderer.domElement.removeEventListener('pointermove', this.pointerMove);
    for (const type of RELEASE_EVENTS)
      this.renderer.domElement.removeEventListener(type, this.release);
    this.renderer.domElement.removeEventListener('wheel', this.wheel);
    this.scenery.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.areaMaterials.forEach((material) => material.dispose());
    this.glossy.forEach((material) => material.dispose());
    this.finish?.dispose();
    this.environment?.dispose();
    this.atmosphere.dispose();
    this.soft.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelLayer.remove();
  }

  private readonly wheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.zoomBy(Math.exp(THREE.MathUtils.clamp(event.deltaY, -120, 120) * 0.0016));
  };

  private readonly pointerMove = (event: PointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.steer?.id === event.pointerId) {
      this.steer.x = event.clientX;
      this.steer.y = event.clientY;
      const travel = Math.hypot(
        event.clientX - this.steer.startX,
        event.clientY - this.steer.startY,
      );
      if (travel > STEER_SLOP) this.steer.held = true;
    }
    if (this.pointers.size !== 2) return;
    const [a, b] = [...this.pointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (this.pinchDistance > 0 && distance > 0) this.zoomBy(this.pinchDistance / distance);
    this.pinchDistance = distance;
  };

  private readonly release = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinchDistance = 0;
    if (this.steer?.id !== event.pointerId) return;
    // Letting go of a hold stops; a quick tap keeps walking to where it landed.
    if (this.steer.held) this.onWalk(null);
    this.steer = null;
  };

  private readonly walk = (event: PointerEvent): void => {
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    // A second finger starts a pinch rather than a walk.
    if (this.pointers.size > 1) {
      if (this.steer) this.onWalk(null);
      this.steer = null;
      return;
    }
    if (event.button !== 0) return;
    const destination = this.groundPoint(event.clientX, event.clientY);
    if (!destination) return;
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
    this.steer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      since: performance.now(),
      held: false,
    };
    this.walkMarker.position.set(destination.x, 0.075, destination.z);
    this.markerTime = 1.3;
    this.walkMarker.visible = true;
    this.onWalk(destination);
  };

  /** The walkable ground point under a screen position, kept inside the area's edge. */
  private groundPoint(clientX: number, clientY: number): Point | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.ground, this.intersection)) return null;
    const edge = (AREAS[this.area as AreaId]?.halfSize ?? 10) - 1.2;
    return {
      x: THREE.MathUtils.clamp(this.intersection.x, -edge, edge),
      z: THREE.MathUtils.clamp(this.intersection.z, -edge, edge),
    };
  }

  /** While a pointer is held, walk toward the ground under it; near the rancher, stand still. */
  private steerTowardPointer(player: Point): void {
    if (!this.steer) return;
    if (!this.steer.held && performance.now() - this.steer.since > STEER_HOLD_MS)
      this.steer.held = true;
    if (!this.steer.held) return;
    const target = this.groundPoint(this.steer.x, this.steer.y);
    if (!target) return;
    const near = Math.hypot(target.x - player.x, target.z - player.z) < STEER_DEADZONE;
    this.onWalk(near ? null : target);
    this.walkMarker.position.set(target.x, 0.075, target.z);
    this.markerTime = near ? 0 : 0.5;
  }

  /** Plays a brief reaction on the companion (a view of an outcome, never a rule). */
  react(kind: Reaction): void {
    this.emote = { kind, time: 0, requested: true };
  }

  /** Advances the companion's current expression and returns how it changes the pose. */
  private express(state: GameState, dt: number, busy: boolean): typeof RESTING_POSE {
    const pose = { ...RESTING_POSE };
    if (this.reducedMotion) {
      this.emote = null;
      return pose;
    }
    // Walking or a drill ends idle fidgets; a requested reaction still plays.
    if (busy && !this.emote?.requested) {
      this.emote = null;
      this.idleTimer = 2 + Math.random() * 3;
      return pose;
    }
    if (!this.emote) {
      this.idleTimer -= dt;
      if (this.idleTimer > 0) return pose;
      const companion = activeCritter(state);
      const chance = Math.random();
      // Needs show in the body: a tired yawn, or a hopeful little dance when hungry.
      const kind: Emote =
        companion.stamina < 25 && chance < 0.6
          ? 'yawn'
          : companion.hunger > 70 && chance < 0.6
            ? 'beg'
            : IDLE_EMOTES[Math.floor(Math.random() * IDLE_EMOTES.length)];
      this.emote = { kind, time: 0, requested: false };
      this.idleTimer = 3.5 + Math.random() * 5;
    }
    this.emote.time += dt;
    const t = Math.min(1, this.emote.time / EMOTE_SECONDS[this.emote.kind]);
    const arc = Math.sin(t * Math.PI);
    const bounce = (count: number) => Math.abs(Math.sin(t * Math.PI * count));
    switch (this.emote.kind) {
      case 'pet':
        // Eyes closed, leaning into the hand with a happy wriggle.
        Object.assign(pose, {
          squint: 0.18,
          roll: Math.sin(t * Math.PI * 6) * 0.07,
          pitch: -0.1 * arc,
          hop: bounce(3) * 0.06,
          wag: 3,
          ears: -0.12 * arc,
          reach: arc,
        });
        break;
      case 'eat':
        // Head down for a few bites, then a pleased hop.
        Object.assign(pose, {
          pitch: t < 0.8 ? 0.32 * bounce(5) : 0,
          hop: t > 0.8 ? Math.sin(((t - 0.8) / 0.2) * Math.PI) * 0.22 : 0,
          wag: 2,
          reach: t < 0.4 ? Math.sin((t / 0.4) * Math.PI) : 0,
        });
        break;
      case 'cheer':
      case 'learned':
        Object.assign(pose, {
          hop: bounce(this.emote.kind === 'learned' ? 3 : 2) * 0.42,
          yaw: t * Math.PI * 2,
          wag: 3,
          ears: -0.16,
        });
        break;
      case 'try':
        // A small, determined shake-off after a hard attempt.
        Object.assign(pose, { tall: -0.08 * arc, ears: 0.26 * arc, pitch: 0.12 * arc });
        break;
      case 'look':
        Object.assign(pose, { yaw: Math.sin(t * Math.PI * 2) * 0.7, ears: -0.08 * arc });
        break;
      case 'hop':
        Object.assign(pose, { hop: bounce(2) * 0.2, wag: 2 });
        break;
      case 'stretch':
        Object.assign(pose, { long: 0.16 * arc, tall: -0.1 * arc, pitch: -0.14 * arc });
        break;
      case 'sniff':
        Object.assign(pose, { pitch: 0.3 * arc + Math.sin(t * 40) * 0.025 * arc });
        break;
      case 'yawn':
        Object.assign(pose, {
          squint: 0.15,
          tall: 0.07 * arc,
          pitch: -0.2 * arc,
          ears: 0.25 * arc,
        });
        break;
      case 'beg':
        Object.assign(pose, {
          hop: bounce(3) * 0.1,
          roll: Math.sin(t * Math.PI * 2) * 0.16,
          ears: -0.15 * arc,
        });
        break;
    }
    if (t >= 1) this.emote = null;
    return pose;
  }

  /** Floats a short note (such as "+5 ♥") up from the rancher or the companion. */
  float(text: string, who: 'player' | 'critter', tone: 'gain' | 'cost' | 'note' = 'note'): void {
    const element = document.createElement('div');
    element.textContent = text;
    element.className = `world-float ${tone}`;
    element.style.cssText = 'position:absolute;left:0;top:0;will-change:transform,opacity;';
    this.labelLayer.appendChild(element);
    this.floats.push({ element, who, age: 0 });
  }

  private animateFloats(dt: number): void {
    const stacks = { player: 0, critter: 0 };
    for (const note of this.floats) {
      note.age += dt;
      const anchor = note.who === 'player' ? this.farmer.position : this.critter.position;
      const rise = this.reducedMotion ? 0 : note.age * 26;
      // The companion's notes start just above its name tag, which sits at the same height.
      const clearance = note.who === 'critter' ? 32 : 0;
      this.projection
        .set(anchor.x, note.who === 'player' ? 2 : this.critterHeight, anchor.z)
        .project(this.camera);
      const x = (this.projection.x * 0.5 + 0.5) * this.width;
      const y =
        (-this.projection.y * 0.5 + 0.5) * this.height - clearance - rise - stacks[note.who] * 22;
      stacks[note.who]++;
      note.element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      note.element.style.opacity = String(
        1 - THREE.MathUtils.smoothstep(note.age, 1.4, FLOAT_LIFE),
      );
    }
    for (let index = this.floats.length - 1; index >= 0; index--)
      if (this.floats[index].age >= FLOAT_LIFE) {
        this.floats[index].element.remove();
        this.floats.splice(index, 1);
      }
  }

  private resize(): void {
    this.width = Math.max(this.container.clientWidth, 1);
    this.height = Math.max(this.container.clientHeight, 1);
    this.renderer.setSize(this.width, this.height, false);
    this.finish?.setSize(this.width, this.height, this.renderer.getPixelRatio());
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
    const direction = this.atmosphere.sunDirection;
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
    this.townHedge = [];
    this.townBin = null;
    this.surroundings?.dispose();
    this.surroundings = undefined;
    this.atmosphere.resetLamps();
    this.swaying.length = 0;
    this.areaMaterials.splice(0).forEach((material) => material.dispose());
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
      else if (state.areaId === 'town') this.town();
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
    // Window glass glows at night in every area that has windows.
    this.atmosphere.glow(this.material('#719494'), 'glass');
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
    if (state.areaId !== 'cottage' && state.areaId !== 'colosseum')
      this.grass(state.areaId === 'homestead' ? 97 : state.areaId === 'town' ? 419 : 301);
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
        [-4, -0.7],
        [-6.2, 0.7],
        [-9.2, 1.2],
      ],
      1.2,
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
    this.gate(-8, 1.2, true);
    for (const [x, z] of [
      [-3.55, -1.75],
      [-1.95, 1.1],
      [2.45, -2.25],
      [7.2, -1.35],
      [-2.9, 4.9],
    ] as [number, number][])
      this.lantern(x, z);
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
    this.swaying.push({ object: tree, phase: variant * 1.7, amount: 0.022 });
  }

  private cottage(x: number, z: number): void {
    const house = new THREE.Group();
    house.position.set(x, 0, z);
    house.add(this.mesh(this.box, '#d7c8a3', [0, 0.12, 0], [3.65, 0.24, 3.15]));
    house.add(this.mesh(this.box, '#f1dfb5', [0, 1.23, 0], [3.35, 2.25, 2.8]));
    house.add(this.mesh(this.box, '#d6c29a', [0, 0.35, 1.43], [3.37, 0.2, 0.08]));
    this.roof(house, 3.95, 3.5, 2.25, 1.18, this.palette.snow ? '#eef2f2' : '#b76e54');
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
      this.swaying.push({ object: plants, phase: index * 2.3, amount: 0.07 });
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
    for (let post = 0; post < 26; post++) {
      const angle = (post / 26) * Math.PI * 2;
      const block = this.mesh(
        this.box,
        post % 2 ? '#bdb6a4' : '#cdc6b2',
        [1 + Math.cos(angle) * 5.6, 0.26, -1 + Math.sin(angle) * 3.8],
        [0.78, 0.52, 0.5],
      );
      block.rotation.y = -angle;
      this.scenery.add(block);
    }
    // Tall festival banners at the arena's ends.
    const bannerColors = ['#c8866a', '#5f8a6a', '#e0b35c', '#6c938b'];
    [
      [-5.2, -1],
      [7.2, -1],
      [1, -5.4],
      [1, 3.3],
    ].forEach(([x, z], index) => {
      this.scenery.add(this.mesh(this.cylinder, '#8c6a45', [x, 1.6, z], [0.07, 3.2, 0.07]));
      this.scenery.add(
        this.mesh(this.box, bannerColors[index], [x + 0.32, 2.45, z], [0.6, 1.3, 0.04]),
      );
      this.scenery.add(this.mesh(this.cone, '#f0d27a', [x, 3.3, z], [0.12, 0.25, 0.12]));
    });
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
        // Stone risers topped with wooden benches and the odd bright cushion.
        const riser = this.mesh(
          this.box,
          tier % 2 ? '#b9ae96' : '#c7bca3',
          [x, 0.25 + tier * 0.45, z],
          [1.3, 0.5 + tier * 0.9, 0.9],
        );
        riser.rotation.y = -angle + Math.PI / 2;
        this.scenery.add(riser);
        const bench = this.mesh(
          this.box,
          seat % 2 ? '#a57e55' : '#b58c60',
          [x, 0.54 + tier * 0.9, z],
          [1.26, 0.1, 0.62],
        );
        bench.rotation.y = -angle + Math.PI / 2;
        this.scenery.add(bench);
        if (seat % 3 === 1) {
          const cushion = this.mesh(
            this.box,
            colors[(seat + tier * 2) % colors.length],
            [x, 0.61 + tier * 0.9, z],
            [0.9, 0.05, 0.4],
          );
          cushion.rotation.y = -angle + Math.PI / 2;
          this.scenery.add(cushion);
        }
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
    this.lantern(-4.4, 1.6);
    this.lantern(-6.6, 5.1);
    const heights: Partial<Record<string, number>> = { gate: 2.4, exhibition: 2.3 };
    for (const object of AREAS.colosseum.objects)
      this.label(
        object.kind === 'gate' ? '↙ Back to Oakhaven' : object.name,
        object.position.x,
        heights[object.kind] ?? 1.8,
        object.position.z,
        object.kind === 'gate',
      );
  }

  /** Oakhaven: a square with a well, shopfronts along the north, and roads east and west. */
  private town(): void {
    this.path(
      [
        [9.2, 1],
        [6, 1.1],
        [3.4, 0.7],
      ],
      1.4,
    );
    this.path(
      [
        [-3.4, 0.7],
        [-6, 1.1],
        [-9.2, 1],
      ],
      1.4,
    );
    for (const [x, z] of [
      [-5.2, -3.4],
      [0, -3.9],
      [5.2, -3.4],
    ])
      this.path(
        [
          [x * 0.4, 0],
          [x, z],
        ],
        0.9,
      );
    const square = this.mesh(this.cylinder, '#ddd2b8', [0, 0.03, 0.2], [3.7, 0.05, 3.3]);
    square.receiveShadow = true;
    this.scenery.add(square);
    for (let stone = 0; stone < 22; stone++) {
      const angle = (stone / 22) * Math.PI * 2;
      this.scenery.add(
        this.mesh(
          this.box,
          stone % 2 ? '#c9bea4' : '#d3c8ae',
          [Math.cos(angle) * 3.55, 0.06, 0.2 + Math.sin(angle) * 3.15],
          [0.5, 0.06, 0.3],
        ),
      );
    }
    // The well at the heart of the square.
    const well = new THREE.Group();
    well.add(this.mesh(this.cylinder, '#b9b1a0', [0, 0.35, 0], [0.85, 0.7, 0.85]));
    well.add(this.mesh(this.cylinder, '#5f8a8a', [0, 0.66, 0], [0.68, 0.05, 0.68]));
    for (const side of [-1, 1])
      well.add(this.mesh(this.box, '#8c6a45', [side * 0.75, 1.15, 0], [0.1, 1.6, 0.1]));
    this.roof(well, 1.9, 1.2, 1.9, 0.45, this.palette.snow ? '#eef2f2' : '#b76e54');
    well.add(this.mesh(this.cylinder, '#7d6448', [0, 1.55, 0], [0.06, 1.4, 0.06]));
    well.children.at(-1)!.rotation.z = Math.PI / 2;
    this.scenery.add(well);
    this.townhouse(-5.2, -5.2, 3.2, 2.4, '#efd9b0', '#7f8f6a', 'General store');
    this.townhouse(0, -5.8, 3.4, 2.4, '#f3ece0', '#6f8ea0', 'Clinic');
    this.townhouse(5.2, -5.2, 3.4, 2.6, '#e6c9a1', '#a0604a', 'Tavern');
    this.townhouse(-8.2, -5.6, 2.2, 2.2, '#e9dcc0', '#b76e54');
    this.townhouse(8.4, -5.4, 2, 2.2, '#f0e2c4', '#8a7660');
    // Covered carts wait along the south side of the square.
    for (const [x, z, color] of [
      [-4.6, 6, '#c8866a'],
      [5, 6, '#5f8a6a'],
    ] as [number, number, string][]) {
      const cart = new THREE.Group();
      cart.position.set(x, 0, z);
      cart.add(this.mesh(this.box, '#9b714b', [0, 0.65, 0], [1.9, 0.45, 1.1]));
      for (const side of [-1, 1])
        cart.add(this.mesh(this.cylinder, '#6e5640', [side * 0.6, 0.35, 0.6], [0.35, 0.08, 0.35]));
      cart.children.slice(-2).forEach((wheel) => (wheel.rotation.x = Math.PI / 2));
      const cover = this.mesh(this.cylinder, color, [0, 1.15, 0], [0.75, 1.8, 0.62]);
      cover.rotation.z = Math.PI / 2;
      cart.add(cover);
      this.scenery.add(cart);
    }
    const board = new THREE.Group();
    board.position.set(2.6, 0, 2.6);
    for (const side of [-1, 1])
      board.add(this.mesh(this.box, '#7d6448', [side * 0.55, 0.75, 0], [0.1, 1.5, 0.1]));
    board.add(this.mesh(this.box, '#a98458', [0, 1.25, 0], [1.3, 0.8, 0.08]));
    for (const [x, y, color] of [
      [-0.3, 1.35, '#f3ead2'],
      [0.25, 1.4, '#e9cc83'],
      [0.05, 1.08, '#f3ead2'],
    ] as [number, number, string][])
      board.add(this.mesh(this.box, color, [x, y, 0.05], [0.42, 0.3, 0.02]));
    this.scenery.add(board);
    this.pennants(-3.2, -2.8, 3.2, -2.8, 3);
    // A sunberry hedge along the lane into town, and the tavern's bin.
    this.townHedge = [];
    for (const [x, z] of [
      [5.9, -1.5],
      [6.9, -1.9],
      [4.9, -1.8],
    ]) {
      const bush = new THREE.Group();
      bush.position.set(x, 0, z);
      bush.add(this.mesh(this.sphere, '#6f9a5c', [0, 0.45, 0], [0.62, 0.48, 0.5]));
      bush.add(this.mesh(this.sphere, '#7fa868', [0.3, 0.55, 0.12], [0.4, 0.36, 0.36]));
      const berries = new THREE.Group();
      for (let berry = 0; berry < 6; berry++) {
        const angle = berry * 1.1;
        berries.add(
          this.mesh(
            this.sphere,
            '#d8604f',
            [Math.cos(angle) * 0.5, 0.45 + (berry % 3) * 0.13, 0.25 + Math.sin(angle) * 0.18],
            [0.07, 0.07, 0.07],
          ),
        );
      }
      bush.add(berries);
      this.townHedge.push(berries);
      this.scenery.add(bush);
    }
    const bin = new THREE.Group();
    bin.position.set(3.3, 0, -3.3);
    const can = new THREE.Group();
    can.add(this.mesh(this.cylinder, '#7d8a86', [0, 0.42, 0], [0.38, 0.84, 0.38]));
    can.add(this.mesh(this.cylinder, '#6a7672', [0, 0.87, 0], [0.42, 0.06, 0.42]));
    const spill = new THREE.Group();
    for (const [x, z, color] of [
      [0.5, 0.6, '#d9c38e'],
      [0.9, 0.2, '#c8866a'],
      [0.2, 0.95, '#e8e2d0'],
    ] as [number, number, string][])
      spill.add(this.mesh(this.box, color, [x, 0.06, z], [0.22, 0.08, 0.16]));
    spill.visible = false;
    bin.add(can, spill);
    this.townBin = bin;
    this.scenery.add(bin);
    // Benches, planters and a low hedge keep the south side of the square lived-in.
    for (const [x, z, turn] of [
      [-2.6, 3.9, 0.3],
      [2.4, -2.3, Math.PI],
      [-3.9, -1.4, Math.PI * 0.75],
    ] as [number, number, number][]) {
      const bench = new THREE.Group();
      bench.position.set(x, 0, z);
      bench.rotation.y = turn;
      bench.add(this.mesh(this.box, '#a57e55', [0, 0.45, 0], [1.4, 0.1, 0.45]));
      bench.add(this.mesh(this.box, '#a57e55', [0, 0.75, -0.2], [1.4, 0.4, 0.08]));
      for (const side of [-1, 1])
        bench.add(this.mesh(this.box, '#7d6448', [side * 0.6, 0.22, 0], [0.1, 0.45, 0.4]));
      this.scenery.add(bench);
    }
    const planters = new THREE.Group();
    for (const [x, z] of [
      [-6.6, -3.6],
      [-3.8, -3.6],
      [1.4, -4.2],
      [6.6, -3.6],
      [-1.2, 4.6],
      [1.6, 4.4],
    ])
      this.pot(planters, x, z);
    this.scenery.add(planters);
    for (const [from, to] of [
      [-7.4, -2.2],
      [2.2, 7.4],
    ])
      for (let x = from; x <= to; x += 0.9)
        this.scenery.add(
          this.mesh(this.sphere, x % 2 ? '#7d9b60' : '#88a868', [x, 0.35, 7.3], [0.55, 0.42, 0.5]),
        );
    const trees: [number, number, number][] = [
      [-8.4, 7.3, 0.8],
      [8.2, 7.4, 0.75],
      [-1.4, 7.9, 0.6],
      [8.6, -1.8, 0.6],
      [-8.6, -2, 0.6],
    ];
    trees.forEach(([x, z, scale], index) => this.tree(x, z, scale, index + 4));
    for (const [x, z] of [
      [-3.6, 2.4],
      [3.8, -1.9],
      [-6.6, -0.6],
      [6.8, 2.6],
    ] as [number, number][])
      this.lantern(x, z);
    this.gate(8, 1, false);
    this.gate(-8, 1, true);
    for (const object of AREAS.town.objects)
      this.label(
        object.id === 'gate'
          ? 'Back to Bramblewick ↗'
          : object.id === 'colosseum-gate'
            ? '↙ Colosseum grounds'
            : object.name,
        object.position.x,
        object.kind === 'gate' ? 2.4 : 1.9,
        object.position.z,
        object.kind === 'gate',
      );
  }

  /** A town building: plaster walls, a pitched roof, a door, two windows and a name. */
  private townhouse(
    x: number,
    z: number,
    width: number,
    depth: number,
    wall: string,
    roof: string,
    name?: string,
  ): void {
    const house = new THREE.Group();
    house.position.set(x, 0, z);
    const height = 2.1;
    house.add(this.mesh(this.box, '#cbbd9c', [0, 0.1, 0], [width + 0.3, 0.2, depth + 0.3]));
    house.add(this.mesh(this.box, wall, [0, 0.2 + height / 2, 0], [width, height, depth]));
    this.roof(
      house,
      width + 0.6,
      depth + 0.4,
      0.2 + height,
      1,
      this.palette.snow ? '#eef2f2' : roof,
    );
    const triangle = new THREE.Shape();
    triangle.moveTo(-width / 2, 0);
    triangle.lineTo(width / 2, 0);
    triangle.lineTo(0, 0.9);
    triangle.closePath();
    house.add(
      this.mesh(
        this.keep(new THREE.ExtrudeGeometry(triangle, { depth, bevelEnabled: false })),
        wall,
        [0, 0.2 + height, -depth / 2],
      ),
    );
    const front = depth / 2;
    house.add(this.mesh(this.box, '#c5a880', [0, 0.72, front + 0.01], [0.9, 1.3, 0.12]));
    house.add(this.mesh(this.box, '#6c7f73', [0, 0.69, front + 0.07], [0.7, 1.15, 0.08]));
    if (width > 2.6) {
      this.window(house, -width * 0.3, 1.35, front + 0.01, 0.6);
      this.window(house, width * 0.3, 1.35, front + 0.01, 0.6);
    } else this.window(house, width * 0.28, 1.4, front + 0.01, 0.45);
    if (name) {
      house.add(this.mesh(this.box, '#efe0b7', [0, 1.75, front + 0.12], [1.3, 0.32, 0.06]));
      this.label(name, x, 3.6, z);
    }
    this.scenery.add(house);
  }

  /** A path lantern: a post, a glass lamp that glows at night, and its light. */
  private lantern(x: number, z: number): void {
    const post = new THREE.Group();
    post.position.set(x, 0, z);
    post.add(this.mesh(this.box, '#7d6448', [0, 0.85, 0], [0.09, 1.7, 0.09]));
    post.add(this.mesh(this.box, '#7d6448', [0.18, 1.62, 0], [0.4, 0.06, 0.06]));
    post.add(this.mesh(this.box, '#5d5146', [0.34, 1.54, 0], [0.18, 0.04, 0.18]));
    const glass = this.material('#ffe7a8');
    this.atmosphere.glow(glass, 'flame');
    post.add(this.mesh(this.box, '#ffe7a8', [0.34, 1.42, 0], [0.14, 0.18, 0.14]));
    post.add(this.mesh(this.cone, '#5d5146', [0.34, 1.6, 0], [0.13, 0.12, 0.13]));
    post.add(this.mesh(this.box, '#6f6152', [0, 0.04, 0], [0.26, 0.08, 0.26]));
    this.scenery.add(post);
    this.atmosphere.lamp(new THREE.Vector3(x + 0.34, 1.42, z), 1.6);
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
    this.atmosphere.glow(this.material('#f6c25d'), 'flame');
    this.atmosphere.glow(this.material('#ee8a45'), 'flame');
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
    const blade = new THREE.MeshStandardMaterial({ color: this.palette.blade, roughness: 0.91 });
    addWind(blade, 'blade');
    this.areaMaterials.push(blade);
    const grass = new THREE.InstancedMesh(this.cone, blade, 360);
    // Buds are a few pixels wide; the low-poly pebble reads the same at a quarter the cost.
    const flowers = new THREE.InstancedMesh(this.pebble, this.material(this.palette.flower), 94);
    const lavender = new THREE.InstancedMesh(this.pebble, this.material('#b5a5b4'), 50);
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
      const eye = this.mesh(
        this.sphere,
        '#493f32',
        [side * 0.078, 1.31, 0.276],
        [0.019, 0.025, 0.018],
      );
      body.add(eye);
      this.farmerEyes.push(eye);
      // Arms hang from a shoulder pivot so they can swing while walking.
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.3, 1.08, 0);
      const arm = this.mesh(
        this.cylinder,
        '#e6d9ad',
        [side * 0.02, -0.19, 0],
        [0.092, 0.41, 0.092],
      );
      arm.rotation.z = side * 0.22;
      shoulder.add(arm);
      shoulder.add(
        this.mesh(this.sphere, '#dfad85', [side * 0.065, -0.41, 0.015], [0.085, 0.1, 0.085]),
      );
      body.add(shoulder);
      this.farmerArms.push(shoulder);
      const leg = this.mesh(this.cylinder, '#4f7770', [side * 0.13, 0.34, 0], [0.1, 0.47, 0.1]);
      leg.add(this.mesh(this.box, '#6d604b', [0, -0.42, 0.35], [1.12, 0.3, 1.8]));
      this.farmerLegs.push(leg);
      this.farmer.add(leg);
    }
    this.farmer.rotation.y = 0.4;
  }

  /** Grandpa: taller than you, a little stooped, white-bearded, flat cap and walking stick. */
  private buildGrandpa(): void {
    this.grandpa.add(this.grandpaBody);
    const body = this.grandpaBody;
    body.rotation.x = 0.08;
    body.add(this.mesh(this.sphere, '#8c6c55', [0, 0.92, 0], [0.32, 0.46, 0.24]));
    body.add(this.mesh(this.box, '#a5836a', [0, 1.02, 0.2], [0.36, 0.42, 0.04]));
    for (const y of [0.88, 1.02, 1.16])
      body.add(this.mesh(this.sphere, '#e7d8b8', [0, y, 0.235], [0.025, 0.025, 0.015]));
    body.add(this.mesh(this.sphere, '#e0ae88', [0, 1.46, 0.035], [0.25, 0.27, 0.235]));
    body.add(this.mesh(this.sphere, '#ece8df', [0, 1.5, -0.04], [0.26, 0.2, 0.24]));
    body.add(this.mesh(this.sphere, '#ece8df', [0, 1.33, 0.18], [0.19, 0.17, 0.12]));
    body.add(this.mesh(this.sphere, '#d79e7d', [0, 1.43, 0.27], [0.05, 0.045, 0.04]));
    body.add(this.mesh(this.cylinder, '#6b6f5e', [0, 1.68, 0.03], [0.27, 0.09, 0.27]));
    body.add(this.mesh(this.box, '#6b6f5e', [0, 1.65, 0.24], [0.36, 0.03, 0.16]));
    for (const side of [-1, 1]) {
      body.add(this.mesh(this.sphere, '#3f362c', [side * 0.08, 1.49, 0.27], [0.02, 0.022, 0.018]));
      body.add(this.mesh(this.box, '#ece8df', [side * 0.08, 1.54, 0.27], [0.07, 0.02, 0.02]));
      const arm = this.mesh(
        this.cylinder,
        '#8c6c55',
        [side * 0.33, 0.95, 0.04],
        [0.095, 0.44, 0.095],
      );
      arm.rotation.z = side * 0.18;
      body.add(arm);
      body.add(this.mesh(this.sphere, '#dfad85', [side * 0.37, 0.72, 0.06], [0.085, 0.1, 0.085]));
      const leg = this.mesh(this.cylinder, '#5d6670', [side * 0.14, 0.36, 0], [0.11, 0.5, 0.11]);
      leg.add(this.mesh(this.box, '#4f4438', [0, -0.42, 0.35], [1.12, 0.3, 1.8]));
      this.grandpaLegs.push(leg);
      this.grandpa.add(leg);
    }
    const stick = this.mesh(this.cylinder, '#7d6448', [0.42, 0.42, 0.16], [0.035, 0.84, 0.035]);
    stick.rotation.x = 0.12;
    body.add(stick);
    this.glaze(this.grandpa);
    this.grandpa.visible = false;
  }

  /**
   * Draws Grandpa and Pip where the household's routine puts them, easing between spots and
   * snapping when they arrive in a new area.
   */
  private animateResidents(state: GameState, dt: number): void {
    const companion = activeCritter(state);
    const pip = state.critters.find((critter) => critter.id === PIP_ID);
    if (pip && !this.pipParts) {
      this.pipParts = buildFigure(this.figureKit, this.pip, pip.speciesId, pip.visualTraits, false);
      this.glaze(this.pip);
    }
    if (!this.gemothyParts) {
      this.gemothyParts = buildFigure(
        this.figureKit,
        this.gemothy,
        'gemothy',
        { coat: 'smoke', accent: 'beetle', size: 0.9 },
        false,
      );
      this.glaze(this.gemothy);
    }
    const staged = (point: Point | null | undefined) =>
      point ? { areaId: state.areaId, position: point, activity: '' } : null;
    const scene = this.staging;
    const residents = [
      {
        id: GRANDPA.id,
        group: this.grandpa,
        where: scene ? staged(scene.grandpa) : grandpaWhereabouts(state),
        legs: this.grandpaLegs,
        speed: scene ? 2.6 : 1.6,
        height: 2.05,
      },
      {
        id: PIP_ID,
        group: this.pip,
        where: scene ? staged(scene.pip) : pip ? pipWhereabouts(state, companion.position) : null,
        legs: this.pipParts?.legs ?? [],
        speed: scene ? 3 : 2.4,
        height: (this.pipParts?.height ?? 1.6) + 0.1,
      },
      {
        id: 'gemothy',
        group: this.gemothy,
        where: staged(scene?.gemothy),
        legs: this.gemothyParts.legs,
        speed: 3.4,
        height: this.gemothyParts.height + 0.1,
      },
    ];
    for (const resident of residents) {
      const view = this.residentViews.get(resident.id)!;
      const here =
        !!resident.where &&
        resident.where.areaId === state.areaId &&
        (this.guests.length === 0 || !!scene);
      resident.group.visible = here;
      view.label.style.display = here ? '' : 'none';
      view.shadow.visible = here;
      if (!here) {
        view.at = null;
        continue;
      }
      const target = resident.where!.position;
      const gap = view.at ? Math.hypot(target.x - view.at.x, target.z - view.at.z) : Infinity;
      if (!view.at || gap > 5 || this.reducedMotion) {
        view.at = { ...target };
        view.last.set(target.x, target.z);
      } else if (gap > 0.01) {
        const step = Math.min(gap, resident.speed * dt);
        view.at = {
          x: view.at.x + ((target.x - view.at.x) / gap) * step,
          z: view.at.z + ((target.z - view.at.z) / gap) * step,
        };
      }
      const moving = this.animateActor(resident.group, view.at, view.last, resident.legs, 0.22);
      const player = state.player.position;
      const toPlayer = Math.hypot(player.x - view.at.x, player.z - view.at.z);
      if (!moving && toPlayer < 3.5) {
        const facing = Math.atan2(player.x - view.at.x, player.z - view.at.z);
        resident.group.rotation.y +=
          Math.atan2(
            Math.sin(facing - resident.group.rotation.y),
            Math.cos(facing - resident.group.rotation.y),
          ) * Math.min(1, dt * 2);
      }
      const breath = this.reducedMotion ? 0 : Math.sin(this.clock * 2 + view.phase) * 0.012;
      if (resident.id === PIP_ID && this.pipParts) {
        this.pipParts.body.scale.y = 1 + breath;
        this.pipParts.tail.rotation.z = this.reducedMotion
          ? 0
          : Math.sin(this.clock * (moving ? 6 : 1.6)) * 0.14;
        view.blink -= dt;
        const shut = view.blink < 0 && view.blink > -0.15;
        for (const eye of this.pipParts.eyes)
          eye.scale.y = (eye.userData['open'] as number) * (shut ? 0.12 : 1);
        if (view.blink < -0.15) view.blink = 2.5 + Math.random() * 3;
      } else this.grandpaBody.scale.y = 1 + breath;
      view.shadow.position.set(view.at.x, 0.045, view.at.z);
      this.positionLabel(view.label, this.projection.set(view.at.x, resident.height, view.at.z));
    }
  }

  /** Figures get a slightly glossier glaze than the matte scenery. */
  private glaze(figure: THREE.Object3D): void {
    figure.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const base = object.material as THREE.MeshStandardMaterial;
      const key = base.color.getHexString();
      let glaze = this.glossy.get(key);
      if (!glaze) {
        glaze = base.clone();
        glaze.roughness = 0.55;
        this.glossy.set(key, glaze);
      }
      object.material = glaze;
    });
  }

  /** Rebuilds the companion's body for its family and looks; animation state carries over. */
  private rebuildCritter(companion: Critter): void {
    this.critter.clear();
    const parts = buildFigure(
      this.figureKit,
      this.critter,
      companion.speciesId,
      companion.visualTraits,
      true,
    );
    this.glaze(this.critter);
    this.critterBody = parts.body;
    this.tail = parts.tail;
    this.critterEars = parts.ears;
    this.critterEyes = parts.eyes;
    this.critterLegs = parts.legs;
    this.critterHeight = parts.height;
    this.companionLoad.position.y = parts.back - 0.9;
    this.critterBody.add(this.companionLoad);
  }

  /**
   * Shows candidates waiting to be chosen, or clears them. They are presentation only:
   * nobody owns them until the host creates the household.
   */
  setGuests(guests: GuestCritter[] | null): void {
    for (const guest of this.guests) {
      this.scene.remove(guest.root);
      guest.label.remove();
      guest.shadow.removeFromParent();
    }
    this.guests = [];
    for (const candidate of guests ?? []) {
      const root = new THREE.Group();
      const parts = buildFigure(
        this.figureKit,
        root,
        candidate.speciesId,
        candidate.visualTraits,
        false,
      );
      this.glaze(root);
      root.position.set(candidate.position.x, 0, candidate.position.z);
      root.rotation.y = Math.atan2(-candidate.position.x, -candidate.position.z) * 0.5;
      const shadow = this.contactShadows[1].clone();
      shadow.position.set(candidate.position.x, 0.045, candidate.position.z);
      shadow.visible = true;
      this.scene.add(root, shadow);
      const label = this.makeLabel(candidate.name, true);
      this.guests.push({
        id: candidate.id,
        root,
        parts,
        label,
        shadow,
        phase: this.guests.length * 1.7,
        blink: 1 + this.guests.length,
      });
    }
  }

  /** Breathing, blinking, wagging and a small hop for the candidate in focus. */
  private animateGuests(state: GameState, dt: number): void {
    const player = state.player.position;
    for (const guest of this.guests) {
      const focused = guest.id === this.guestFocus;
      const t = this.clock + guest.phase;
      const still = this.reducedMotion;
      guest.parts.body.scale.setScalar(1);
      guest.parts.body.scale.y = 1 + (still ? 0 : Math.sin(t * 2.4) * 0.014);
      guest.parts.body.position.y = focused && !still ? Math.abs(Math.sin(t * 6)) * 0.12 : 0;
      guest.parts.tail.rotation.z = still ? 0 : Math.sin(t * (focused ? 9 : 3)) * 0.18;
      guest.blink -= dt;
      const shut = guest.blink < 0 && guest.blink > -0.13;
      for (const eye of guest.parts.eyes)
        eye.scale.y = (eye.userData['open'] as number) * (shut ? 0.12 : 1);
      if (guest.blink < -0.13) guest.blink = 2 + Math.random() * 3;
      const target = Math.atan2(player.x - guest.root.position.x, player.z - guest.root.position.z);
      const turn = Math.atan2(
        Math.sin(target - guest.root.rotation.y),
        Math.cos(target - guest.root.rotation.y),
      );
      guest.root.rotation.y += turn * Math.min(1, dt * 2);
      guest.label.classList.toggle('focused', focused);
      this.positionLabel(
        guest.label,
        this.projection.set(
          guest.root.position.x,
          guest.parts.height + 0.15,
          guest.root.position.z,
        ),
      );
    }
  }

  /** Stages a beat of the opening walk, or returns Grandpa and Pip to their routines. */
  setScene(stage: SceneStage | null): void {
    this.staging = stage;
  }

  setGuestFocus(id: string | null): void {
    this.guestFocus = id;
  }

  /** Breath, blinks, glances, sway, dust, grounding shadows, the target ring, butterflies. */
  private animateLife(
    state: GameState,
    dt: number,
    companionView: Point,
    playerMoving: boolean,
    critterMoving: boolean,
    jumpHeight: number,
  ): void {
    const companion = activeCritter(state);
    const still = this.reducedMotion;
    const weather = weatherFor(state.day);
    const indoors = state.areaId === 'cottage';
    wind.time.value = this.clock;
    wind.strength.value = still || indoors ? 0 : WIND_BY_WEATHER[weather];
    for (const { object, phase, amount } of this.swaying) {
      object.rotation.z = still
        ? 0
        : Math.sin(this.clock * 1.1 + phase) * amount * wind.strength.value;
      object.rotation.x = still
        ? 0
        : Math.cos(this.clock * 0.8 + phase) * amount * 0.6 * wind.strength.value;
    }

    // Mallow wags harder when happy, breathes when resting and squashes into each hop.
    const cheer = companion.happiness / 100;
    const pose = this.express(state, dt, critterMoving || !!state.training);
    this.tail.rotation.z =
      Math.sin(this.clock * (2.4 + cheer * 4) * pose.wag) *
      (0.08 + cheer * 0.12) *
      Math.min(2, pose.wag);
    this.tail.rotation.x = Math.sin(this.clock * 2.1) * 0.07;
    const squash = still
      ? 0
      : critterMoving || state.training
        ? Math.sin(this.clock * 24) * 0.05
        : Math.sin(this.clock * 2.4) * 0.014;
    this.critterBody.scale.set(
      1 - squash * 0.5,
      (1 + squash) * (1 + pose.tall),
      (1 - squash * 0.5) * (1 + pose.long),
    );
    this.critterBody.rotation.set(pose.pitch, pose.yaw, pose.roll);
    this.critter.position.y += pose.hop;
    const player = state.player.position;
    const gap = Math.hypot(player.x - companionView.x, player.z - companionView.z);
    if (!critterMoving && !state.training && gap < 3.6 && gap > 0.2) {
      const target = Math.atan2(player.x - companionView.x, player.z - companionView.z);
      const turn = Math.atan2(
        Math.sin(target - this.critter.rotation.y),
        Math.cos(target - this.critter.rotation.y),
      );
      this.critter.rotation.y += turn * Math.min(1, dt * 2.5);
    }
    this.blink.critter -= dt;
    this.blink.farmer -= dt;
    this.blink.twitch -= dt;
    const shut = (timer: number) => timer < 0 && timer > -0.13;
    for (const eye of this.critterEyes)
      eye.scale.y =
        (eye.userData['open'] as number) * (shut(this.blink.critter) ? 0.12 : pose.squint);
    for (const eye of this.farmerEyes) eye.scale.y = shut(this.blink.farmer) ? 0.004 : 0.025;
    if (this.blink.critter < -0.13) this.blink.critter = 2 + Math.random() * 3.2;
    if (this.blink.farmer < -0.13) this.blink.farmer = 2.6 + Math.random() * 3.5;
    const twitch = this.blink.twitch < 0 && this.blink.twitch > -0.3 && !still;
    for (const ear of this.critterEars) {
      const side = ear.userData['side'] as number;
      ear.rotation.z =
        (ear.userData['baseZ'] as number) -
        side * pose.ears +
        (twitch ? Math.sin(this.clock * 38) * 0.18 : 0);
    }
    if (this.blink.twitch < -0.3) this.blink.twitch = 3 + Math.random() * 5;
    this.farmerArms.forEach((arm, index) => {
      // One arm reaches out when petting or offering food.
      const swing =
        playerMoving && !still
          ? Math.sin(this.clock * 11 + index * Math.PI) * 0.55
          : index === 0
            ? -1.15 * pose.reach
            : 0;
      arm.rotation.x += (swing - arm.rotation.x) * Math.min(1, dt * 12);
    });

    // Footstep dust (or splashes, or powder) while moving.
    this.puffTimer -= dt;
    const detail = QUALITY_SETTINGS[this.qualityTier].detail;
    if (!still && this.puffTimer <= 0 && (playerMoving || critterMoving)) {
      this.puffTimer = 0.2 / Math.max(0.4, detail);
      const tint = this.palette.snow
        ? '#ffffff'
        : weather === 'rain'
          ? '#d7e6ef'
          : indoors
            ? '#d8c3a2'
            : '#eadfc4';
      for (const [moving, position] of [
        [playerMoving, player],
        [critterMoving && this.critter.visible, companionView],
      ] as [boolean, Point][]) {
        if (!moving) continue;
        const puff = this.puffs.reduce((oldest, item) => (item.life < oldest.life ? item : oldest));
        puff.life = PUFF_LIFE;
        puff.sprite.visible = true;
        puff.sprite.position.set(
          position.x + (Math.random() - 0.5) * 0.3,
          0.1,
          position.z + (Math.random() - 0.5) * 0.3,
        );
        (puff.sprite.material as THREE.SpriteMaterial).color.set(tint);
      }
    }
    for (const puff of this.puffs) {
      if (puff.life <= 0) continue;
      puff.life -= dt;
      const age = 1 - Math.max(0, puff.life) / PUFF_LIFE;
      puff.sprite.visible = puff.life > 0;
      puff.sprite.scale.setScalar(0.22 + age * 0.5);
      puff.sprite.position.y += dt * 0.35;
      (puff.sprite.material as THREE.SpriteMaterial).opacity = (1 - age) * 0.5;
    }

    // Soft contact shadows keep figures grounded, even at night or under cloud.
    const [under, underCritter] = this.contactShadows;
    under.position.set(player.x, 0.045, player.z);
    underCritter.visible = this.critter.visible;
    underCritter.position.set(companionView.x, 0.045, companionView.z);
    underCritter.scale.setScalar(1.3 * (1 - jumpHeight * 0.45));

    // A pulsing ring marks what the dock's primary action will affect.
    const target =
      this.targetId && !state.training && !state.work
        ? this.targetPoint(state, this.targetId, companionView)
        : null;
    this.targetRing.visible = !!target;
    if (target) {
      this.targetRing.position.set(target.x, 0.1, target.z);
      const pulse = still ? 1 : 1 + Math.sin(this.clock * 4) * 0.04;
      this.targetRing.scale.setScalar(target.radius * pulse);
      (this.targetRing.material as THREE.MeshBasicMaterial).opacity =
        0.75 + (still ? 0.15 : Math.sin(this.clock * 4) * 0.2);
    }

    // Butterflies visit on fair spring and summer days.
    const season = calendarDate(state.day).season;
    const fair =
      (weather === 'sunny' || weather === 'cloudy') && (season === 'spring' || season === 'summer');
    this.butterflies.visible =
      fair && !indoors && state.areaId !== 'colosseum' && this.atmosphere.night < 0.25;
    if (this.butterflies.visible)
      this.butterflies.children.forEach((butterfly, index) => {
        const t = this.clock + index * 13.7;
        const anchorX = THREE.MathUtils.clamp(this.focus.x + Math.cos(index * 2.1) * 5, -8.5, 8.5);
        const anchorZ = THREE.MathUtils.clamp(
          this.focus.z + Math.sin(index * 1.7) * 4.5,
          -8.5,
          8.5,
        );
        const x = anchorX + Math.sin(t * 0.37) * 2.2;
        const z = anchorZ + Math.cos(t * 0.29) * 2.2;
        butterfly.position.set(x, 0.75 + Math.sin(t * 1.3) * 0.32, z);
        butterfly.rotation.y = Math.atan2(Math.cos(t * 0.37) * 0.8, -Math.sin(t * 0.29) * 0.64);
        const flap = still ? 0.5 : 0.35 + Math.sin(t * 17) * 0.75;
        butterfly.children[0].rotation.z = flap;
        butterfly.children[1].rotation.z = -flap;
      });
  }

  /** Where the target ring sits for an interaction target, with a fitting radius. */
  private targetPoint(
    state: GameState,
    id: string,
    companionView: Point,
  ): { x: number; z: number; radius: number } | null {
    if (id === activeCritter(state).id) return { ...companionView, radius: 0.72 };
    const resident = this.residentViews.get(id)?.at;
    if (resident) return { ...resident, radius: 0.72 };
    const object = AREAS[state.areaId].objects.find((item) => item.id === id);
    if (object) {
      // Buildings are marked at their door rather than around their whole footprint.
      if (object.kind === 'house')
        return { x: object.position.x + 0.55, z: object.position.z + 2.05, radius: 0.72 };
      if (object.kind === 'shed')
        return { x: object.position.x + 0.25, z: object.position.z + 1.85, radius: 0.8 };
      // The ring reaches just past the object's footprint so it stays visible around it.
      return { ...object.position, radius: Math.min(1.9, object.radius + 0.45) };
    }
    const container = state.containers.find((item) => item.id === id);
    if (container && 'position' in container.location)
      return { ...container.location.position, radius: 0.95 };
    const plot = state.plots.find((item) => item.id === id);
    if (plot) return { ...plot.position, radius: 0.8 };
    const node = [...state.materialNodes, ...state.resources, ...state.groundCargo].find(
      (item) => item.id === id,
    );
    if (node) return { ...node.position, radius: 'kind' in node ? 1.2 : 0.9 };
    return null;
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
