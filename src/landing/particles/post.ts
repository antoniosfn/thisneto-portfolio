import {
  type Camera,
  HalfFloatType,
  type Scene,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { finalShader } from "./shaders/post";

/**
 * Bloom with a higher threshold than Dala's 0.159: the denser field would glow
 * as one white mass, so only bright, emissive points bloom. Then vignette and
 * black floor.
 */
const BLOOM = { strength: 0.26, radius: 0.55, threshold: 0.42 } as const;
// Thin solid edges need multisampling.
const SAMPLES = 4;

export function createPost(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
  const composer = new EffectComposer(
    renderer,
    new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: SAMPLES }),
  );
  const bloom = new UnrealBloomPass(new Vector2(1, 1), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  const final = new ShaderPass(finalShader);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(final);
  return {
    render(delta: number) {
      composer.render(delta);
    },
    resize(width: number, height: number, ratio: number) {
      composer.setPixelRatio(ratio);
      composer.setSize(width, height);
    },
    dispose() {
      composer.dispose();
      bloom.dispose();
      final.dispose();
    },
  };
}
