// Bootstrap: renderer, lights, sky, fog, loop. Reads ?stage=combat|buy|duel|score.
// Post chain — three 0.187.0 BUILT-IN addons only (vendored under
// game/vendor/three/addons/, MIT, same package as the core). No third-party
// post library: the competition never explicitly allows arbitrary libraries.
import { EffectComposer } from '../vendor/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from '../vendor/three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from '../vendor/three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from '../vendor/three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from '../vendor/three/addons/postprocessing/OutputPass.js';
import * as THREE from '../vendor/three/three.module.min.js';
import { Game } from './game.js';
import { skyTex } from './textures.js';

const params = new URLSearchParams(location.search);
const stage = params.get('stage') || '';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc97a52, 32, 90);
// sky dome (gradient canvas, dusk)
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(180, 24, 16),
  new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, fog: false })
);
scene.add(sky);

// ---- IBL: procedural dusk sky baked into a PMREM env map (no external HDRI:
// the harness forbids network loads and three 0.187.0 must stay vendored).
// Gives MeshStandard/Physical materials real reflections + ambient so metal
// reads as metal and shadowed faces don't go dead black. Pure three core API.
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide })
  );
  envScene.add(envSky);
  const envSun = new THREE.Mesh(new THREE.CircleGeometry(7, 24), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
  envSun.position.set(-30, 20, -28); envSun.lookAt(0, 0, 0); envScene.add(envSun);
  const envRT = pmrem.fromScene(envScene, .04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = .45;
  pmrem.dispose();
}

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, .08, 400);
camera.rotation.order = 'YXZ';
scene.add(camera); // viewmodel attaches here

// ---- lights: dusk sun + hemisphere + yard lamps
const sun = new THREE.DirectionalLight(0xffb36b, 3.1);
sun.position.set(-28, 42, -20);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
sun.shadow.camera.far = 120; sun.shadow.bias = -0.0006;
scene.add(sun);
// warm fill from the south-east so shadowed faces/bots still read at dusk (no shadows)
const fill = new THREE.DirectionalLight(0xffd9a0, 1.5);
fill.position.set(30, 18, 30);
scene.add(fill);
scene.add(new THREE.HemisphereLight(0x8a7a9a, 0x3a2c22, 1.45));
const lampLights = [];
function addLamp(x, z) {
  const p = new THREE.PointLight(0xffc060, 22, 26, 1.8);
  p.position.set(x, 4.6, z);
  scene.add(p); lampLights.push(p);
}
addLamp(-22, -10); addLamp(20, 10); addLamp(0, 0);

let game;
try {
  game = new Game(renderer, scene, camera, stage);
} catch (e) {
  window.__errors = window.__errors || [];
  window.__errors.push(String(e && e.stack || e));
  throw e;
}
window.addEventListener('error', e => { (window.__errors = window.__errors || []).push(String(e.message)); });
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ---- post chain: render -> GTAO (contact AO) -> light bloom -> SMAA -> output
// (ACES tone mapping + sRGB, applied once by OutputPass).
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
composer.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .22, .5, .88);
composer.addPass(bloom);
composer.addPass(new SMAAPass());
composer.addPass(new OutputPass());

// vignette overlay (CSS handles it) — loop
let last = performance.now();
let fpsFrames = 0, fpsTime = 0;
function loop(now) {
  requestAnimationFrame(loop);
  // dt clamped to [0, .5]: a NEGATIVE dt (stale rAF timestamp after a long
  // blocking first frame — shader compile / PMREM on SwiftShader) once
  // inflated recoil to ~101, flinging the viewmodel behind the camera.
  const dt = Math.max(0, Math.min(.5, (now - last) / 1000));
  last = now;
  game.update(dt);
  composer.render();
  fpsFrames++; fpsTime += dt;
  if (fpsTime >= 1) { game.fpsMeasured = fpsFrames / fpsTime; fpsFrames = 0; fpsTime = 0; }
}
requestAnimationFrame(loop);
window.__ready = true;
