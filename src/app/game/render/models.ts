import { FIGURE_KINDS, FIGURE_MODELS } from './figures';

/**
 * Loads the figures' model files (public/models/<kind>.glb) before the world is built. A
 * kind whose file is missing or broken keeps its code-built figure, so a bad edit never
 * stops the game. The loader is fetched on demand to keep it out of the first download.
 */
export async function loadFigureModels(base: string, timeoutMs = 6000): Promise<number> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();
  const loads = Promise.all(
    FIGURE_KINDS.map(async (kind) => {
      try {
        const gltf = await loader.loadAsync(new URL(`models/${kind}.glb`, base).href);
        const root = gltf.scene.getObjectByName(kind) ?? gltf.scene.children[0];
        if (root?.getObjectByName('frame')) FIGURE_MODELS.set(kind, root);
      } catch {
        // Keep the code-built figure for this kind.
      }
    }),
  );
  await Promise.race([loads, new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
  return FIGURE_MODELS.size;
}
