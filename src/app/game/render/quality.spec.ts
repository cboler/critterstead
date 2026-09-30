import { describe, expect, it } from 'vitest';
import { detectQuality, pixelRatioFor } from './quality';

const SWIFTSHADER =
  'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)';
const GPU = 'ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)';

describe('rendering quality tiers', () => {
  it('gives software rasterizers the light tier', () => {
    expect(detectQuality(SWIFTSHADER)).toBe('light');
    expect(detectQuality('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe('light');
    expect(detectQuality(GPU)).not.toBe('light');
  });

  it('draws software rasterizers at half size on the light tier only', () => {
    expect(pixelRatioFor('light', SWIFTSHADER)).toBe(0.5);
    expect(pixelRatioFor('light', GPU)).toBe(1);
    // A player who picks a richer tier on a software renderer gets exactly that tier.
    expect(pixelRatioFor('cinematic', SWIFTSHADER)).toBe(1.5);
  });
});
