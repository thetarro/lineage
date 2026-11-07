// Still pictures of 3D models (encyclopedia thumbnails, past lineages' portraits),
// rendered off-screen by one shared renderer.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 240;
const H = 180;
let renderer = null;
let environment = null; // soft studio lighting, like the game's image-based light

/** A transparent PNG data URL of `obj`, framed to fit. `silhouette` draws it as a flat shape. */
export function snapshot(obj, { silhouette = false } = {}) {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H);
    // The same filmic tone mapping as the game, so thumbnails match what you meet.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  }
  const scene = new THREE.Scene();
  scene.environment = environment;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(3, 5, 4);
  scene.add(sun);
  if (silhouette) scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0x24323e });

  scene.add(obj);
  // The studio light only fills in: builders make fresh materials, so this touches nothing else.
  obj.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.envMapIntensity = 0.35; }); });
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.01, 1000);
  const dist = radius / Math.sin((35 / 2) * (Math.PI / 180)) * 0.85;
  camera.position.copy(center).add(new THREE.Vector3(0.85, 0.45, 1).normalize().multiplyScalar(dist));
  camera.lookAt(center);

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  obj.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) [].concat(o.material).forEach((m) => m.dispose());
  });
  scene.overrideMaterial?.dispose();
  return url;
}
