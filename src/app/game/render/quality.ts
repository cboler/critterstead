/** Rendering tiers. Presentation only: every tier shows the same game state. */
export type Quality = 'cinematic' | 'balanced' | 'light';
export type QualityChoice = 'auto' | Quality;

export interface QualitySettings {
  pixelRatio: number;
  // Sun shadows; the light tier keeps only the figures' contact shadows.
  shadows: boolean;
  shadowMapSize: number;
  // Full-screen passes: tilt-shift focus, bloom, and grading.
  post: boolean;
  bloom: boolean;
  // Share of optional ambient detail (grass, distant trees, particles) to draw.
  detail: number;
}

export const QUALITY_SETTINGS: Record<Quality, QualitySettings> = {
  // The miniature blur softens fine detail, so cinematic caps resolution at 1.5x.
  cinematic: {
    pixelRatio: 1.5,
    shadows: true,
    shadowMapSize: 2048,
    post: true,
    bloom: true,
    detail: 1,
  },
  balanced: {
    pixelRatio: 1.25,
    shadows: true,
    shadowMapSize: 2048,
    post: true,
    bloom: false,
    detail: 0.7,
  },
  light: {
    pixelRatio: 1,
    shadows: false,
    shadowMapSize: 1024,
    post: false,
    bloom: false,
    detail: 0.35,
  },
};

const STORAGE_KEY = 'critterstead-visual-quality';

/** The unmasked WebGL renderer, when the browser exposes it. */
export function rendererName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  return String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
}

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/**
 * Software rasterizers (headless test browsers, blocked GPUs) get the light tier; small
 * touch screens get the balanced tier; everything else starts cinematic.
 */
export function detectQuality(renderer: string): Quality {
  if (SOFTWARE.test(renderer)) return 'light';
  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  return touch || small ? 'balanced' : 'cinematic';
}

/** Software rasterizers are bound by pixel count, so the light tier draws them at half size. */
export function pixelRatioFor(quality: Quality, renderer: string): number {
  const cap = QUALITY_SETTINGS[quality].pixelRatio;
  return quality === 'light' && SOFTWARE.test(renderer) ? cap / 2 : cap;
}

export function storedQualityChoice(): QualityChoice {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'cinematic' || value === 'balanced' || value === 'light' ? value : 'auto';
  } catch {
    return 'auto';
  }
}

export function storeQualityChoice(choice: QualityChoice): void {
  try {
    if (choice === 'auto') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage can be unavailable (private windows); the choice then lasts for this visit.
  }
}
