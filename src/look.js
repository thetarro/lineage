// How the world is lit and finished: a gradient sky with sun and stars, image-based lighting
// from that sky, caustic light on the seafloor, and post-processing (ambient occlusion, bloom,
// anti-aliasing, color grading and a vignette). The quality presets in quality.js decide
// which of these run.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ── Sky ────────────────────────────────────────────────────────────────────

/** A dome around the camera: a vertical gradient, a sun disc with a glow, and stars at night. */
export function createSky() {
  const uniforms = {
    uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color() }, uSun: { value: 0 }, uStars: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uHorizon, uBottom, uSunColor, uSunDir;
      uniform float uSun, uStars;
      varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(smoothstep(0.0, 0.6, h), 0.8)) : mix(uHorizon, uBottom, smoothstep(0.0, 0.25, -h));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSunColor * uSun * (smoothstep(0.9985, 0.9993, s) * 3.0 + pow(s, 60.0) * 0.5 + pow(s, 6.0) * 0.12);
        if (uStars > 0.0 && h > 0.0) {
          vec3 cell = floor(d * 220.0);
          float star = step(0.9965, hash(cell)) * smoothstep(0.0, 0.25, h);
          col += vec3(star) * uStars;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(250, 32, 16), material);
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  return sky;
}

// ── Image-based lighting ───────────────────────────────────────────────────

const envScene = new THREE.Scene();
const envGeo = new THREE.SphereGeometry(1, 32, 16);
const envMesh = new THREE.Mesh(envGeo, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
envScene.add(envMesh);

/**
 * Lighting from a gradient sky (top, horizon, bottom), so surfaces pick up sky and ground color.
 * Returns the render target: use its `.texture`, and dispose of it when replaced.
 */
export function gradientEnvironment(pmrem, top, horizon, bottom) {
  const pos = envGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y >= 0) c.copy(horizon).lerp(top, Math.min(1, y / 0.6));
    else c.copy(horizon).lerp(bottom, Math.min(1, -y / 0.25));
    c.toArray(colors, i * 3);
  }
  envGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return pmrem.fromScene(envScene, 0.04);
}

// ── Caustics ──────────────────────────────────────────────────────────────

/**
 * Rippling light on a material lit from above through water. `uniforms` (time, strength,
 * color) are shared so one update moves every caustic in the scene.
 */
export function addCaustics(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vCausticPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvCausticPos = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vCausticPos;
        uniform float uCausticTime, uCaustic;
        uniform vec3 uCausticColor;
        // Warped crossing waves: mostly dark, with thin bright ribbons where they meet.
        float caustic(vec2 p, float t) {
          vec2 q = p;
          float v = 0.0;
          for (int n = 0; n < 3; n++) {
            q += vec2(sin(q.y * 1.3 + t * 0.7 + float(n)), cos(q.x * 1.1 - t * 0.6 + float(n) * 1.7)) * 0.55;
            v += abs(sin(q.x + q.y * 0.5) * cos(q.y - q.x * 0.3));
          }
          return pow(1.0 - v / 3.0, 6.0);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uCausticColor * uCaustic * caustic(vCausticPos * 0.6, uCausticTime);`);
  };
  material.customProgramCacheKey = () => 'caustics';
}

// ── Post-processing ───────────────────────────────────────────────────────

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uSaturation: { value: 1.06 }, uTint: { value: new THREE.Color(1, 1, 1) }, uVignette: { value: 0.15 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uSaturation, uVignette;
    uniform vec3 uTint;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, uSaturation) * uTint;
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - uVignette * dot(d, d) * 1.8;
      gl_FragColor = c;
    }`,
};

/** The render path for a preset: straight to the screen, or through the effect passes. */
export class Pipeline {
  constructor(renderer, scene, camera, preset) {
    Object.assign(this, { renderer, scene, camera, preset });
    this.grade = null;
    if (!preset.post) return;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: preset.msaa });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    if (preset.ao) {
      // Ambient occlusion is soft and blurry: half resolution looks the same at a quarter of the cost.
      this.ao = new GTAOPass(scene, camera, size.x / 2, size.y / 2);
      const setSize = this.ao.setSize.bind(this.ao);
      this.ao.setSize = (w, h) => setSize(Math.ceil(w / 2), Math.ceil(h / 2));
      this.ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1, scale: 1 });
      this.ao.blendIntensity = 0.85;
      this.composer.addPass(this.ao);
    }
    if (preset.bloom) {
      // Only bright, glowing things bloom: markers, alien glows, vents, the meteor.
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.4, 1.25);
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
  }

  setSize(w, h) {
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.composer?.setSize(w, h);
  }

  /** Per-world color grading: saturation and a tint toward the light. */
  setGrade(saturation, tint) {
    if (!this.grade) return;
    this.grade.uniforms.uSaturation.value = saturation;
    this.grade.uniforms.uTint.value.copy(tint);
  }

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.composer?.dispose();
    this.ao?.dispose?.();
    this.bloom?.dispose?.();
  }
}
