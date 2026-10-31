import { PerspectiveCamera, Vector2 } from "three";
import { ease } from "./motion";

/**
 * Dala's particle camera, as constructed in its bundle: a 50° vertical field of
 * view at z = 10. Screen measurements confirm it without fitted parameters: the
 * brain keeps 0.68–0.69 of the viewport height at 16:9 and 2.07:1, and the
 * predicted centres (hero 0.61, introduction 0.27, explosion 0.48 of the width)
 * match the captures within 0.03.
 */
export const CAMERA_DISTANCE = 10;
export const CAMERA_FOV = 50;
// A stable, slightly raised view also reads well without a pointer on touch.
const REST_PITCH = 0.015;
const REST_YAW = 0.006;
const PARALLAX = { x: 0.025, y: -0.04, ease: 0.1 } as const;

export function createParticleCamera() {
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 30);
  camera.position.z = CAMERA_DISTANCE;
  return camera;
}

/** Frame the camera and return the visible width and height at z = 0. */
export function frameCamera(camera: PerspectiveCamera, aspect: number) {
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  const height = 2 * CAMERA_DISTANCE * Math.tan((CAMERA_FOV * Math.PI) / 360);
  return new Vector2(height * aspect, height);
}

/** Gentle pointer parallax around the default view. */
export function parallaxCamera(
  camera: PerspectiveCamera,
  pointer: Vector2,
  frames: number,
) {
  const k = ease(PARALLAX.ease, frames);
  camera.rotation.y +=
    (REST_YAW + PARALLAX.y * pointer.x - camera.rotation.y) * k;
  camera.rotation.x +=
    (REST_PITCH + PARALLAX.x * pointer.y - camera.rotation.x) * k;
}
