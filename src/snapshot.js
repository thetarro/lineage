// Still pictures of 3D models (encyclopedia thumbnails, past lineages' portraits),
// rendered off-screen by one shared renderer.

import * as THREE from 'three';

const W = 240;
const H = 180;
let renderer = null;

/** A transparent PNG data URL of `obj`, framed to fit. `silhouette` draws it as a flat shape. */
export function snapshot(obj, { silhouette = false } = {}) {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H);
  }
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(3, 5, 4);
  scene.add(sun);
  if (silhouette) scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0x24323e });

  scene.add(obj);
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
