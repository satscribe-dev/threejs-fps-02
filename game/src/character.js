// Humanoid bots built from measured human proportions (total height 1.80 m):
// hips 1.06 (59%), thigh 0.43, calf 0.45, torso 0.48, head Ø 0.23, shoulders ±0.21.
// Articulated pivots: neck, shoulders, elbows, hips, knees. Walk / crouch / aim / death.
import * as THREE from '../vendor/three/three.module.min.js';
import { taperedBox } from './geom.js';
import { camoTex } from './textures.js';

const SKIN = [0xc68e6a, 0x8a5f43, 0xd9a986, 0x6e4a30];
function mat(color, rough = .85) { return new THREE.MeshStandardMaterial({ color, roughness: rough }); }
function nameSprite(name, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 6; g.fillStyle = color;
  g.fillText(name, 128, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(1.5, .38, 1); return s;
}

// Build one bot. opts: {team:'ember'|'slate', name, skin}
export function buildBot(opts) {
  const team = opts.team;
  const jacket = team === 'ember' ? 0x9a4a26 : 0x527a9a;   // rust orange / slate blue (lightened to read at dusk)
  const pants = team === 'ember' ? 0x4a3a2c : 0x3a4250;
  const vest = team === 'ember' ? 0x5c3a22 : 0x3d4f63;
  const helmet = team === 'ember' ? 0x6e3a1e : 0x41607e;
  const skin = SKIN[opts.skin ?? 0];
  const mJacket = mat(jacket), mPants = mat(pants), mVest = mat(vest, .8), mHelmet = mat(helmet, .6), mSkin = mat(skin), mBoot = mat(0x1e1a16, .7), mGun = mat(0x22242a, .5);

  const root = new THREE.Group();           // at feet, y=0
  const hips = new THREE.Group(); hips.position.y = 1.06; root.add(hips);
  // pelvis + belt
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(.36, .16, .22), mPants);
  pelvis.position.y = .02; pelvis.castShadow = true; hips.add(pelvis);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(.38, .06, .24), mat(0x1c1814, .7));
  belt.position.y = .1; hips.add(belt);
  // torso: tapered (waist .34 -> shoulders .44), 0.48 tall, centre 1.30
  const torso = new THREE.Mesh(taperedBox(.34, .22, .44, .26, .48), mJacket);
  torso.position.y = .24; torso.castShadow = true; hips.add(torso);
  // vest plates front/back + pouches
  const plateF = new THREE.Mesh(new THREE.BoxGeometry(.34, .3, .05), mVest);
  plateF.position.set(0, .26, .14); hips.add(plateF);
  const plateB = new THREE.Mesh(new THREE.BoxGeometry(.34, .3, .05), mVest);
  plateB.position.set(0, .26, -.14); hips.add(plateB);
  for (const px of [-.11, 0, .11]) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(.09, .11, .05), mVest);
    pouch.position.set(px, .08, .15); hips.add(pouch);
  }
  // shoulder pads
  for (const sx of [-1, 1]) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(.12, .08, .24), mVest);
    pad.position.set(sx * .21, .44, 0); hips.add(pad);
  }
  // head group at 1.56 (neck base) -> head centre 1.70
  const neck = new THREE.Group(); neck.position.y = .5; hips.add(neck);
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .1, 8), mSkin);
  neckM.position.y = .03; neck.add(neckM);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.115, 14, 12), mSkin);
  head.position.y = .14; head.scale.set(1, 1.15, 1.05); head.castShadow = true; neck.add(head);
  // helmet: dome + brim + back cover
  const helm = new THREE.Mesh(new THREE.SphereGeometry(.13, 14, 10, 0, Math.PI * 2, 0, Math.PI * .55), mHelmet);
  helm.position.y = .17; helm.castShadow = true; neck.add(helm);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.145, .15, .03, 14), mHelmet);
  brim.position.y = .185; neck.add(brim);
  // goggles / visor strip
  const visor = new THREE.Mesh(new THREE.BoxGeometry(.16, .05, .03), mat(0x14181f, .3));
  visor.position.set(0, .15, .105); neck.add(visor);
  // arms: shoulder pivot at (±.23, 1.48) -> in hips space y=.42
  function arm(side) {
    const sh = new THREE.Group(); sh.position.set(side * .23, .42, 0); hips.add(sh);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(.055, .05, .28, 8), mJacket);
    up.position.y = -.14; up.castShadow = true; sh.add(up);
    const el = new THREE.Group(); el.position.y = -.28; sh.add(el);
    const fo = new THREE.Mesh(new THREE.CylinderGeometry(.048, .042, .25, 8), mJacket);
    fo.position.y = -.125; fo.castShadow = true; el.add(fo);
    const hand = new THREE.Group(); hand.position.y = -.27; el.add(hand);
    const palm = new THREE.Mesh(new THREE.BoxGeometry(.07, .09, .04), mSkin);
    palm.castShadow = true; hand.add(palm);
    // fingers: 4 small boxes with gaps (readable at close range)
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(.014, .05, .014), mSkin);
      f.position.set(-.024 + i * .016, -.07, 0); hand.add(f);
    }
    const thumb = new THREE.Mesh(new THREE.BoxGeometry(.014, .04, .014), mSkin);
    thumb.position.set(side * .045, -.03, .01); thumb.rotation.z = side * .5; hand.add(thumb);
    return { sh, el, hand };
  }
  // legs: hip pivot at (±.11, 1.06) -> hips space y=0
  function leg(side) {
    const hip = new THREE.Group(); hip.position.set(side * .11, 0, 0); hips.add(hip);
    const th = new THREE.Mesh(new THREE.CylinderGeometry(.075, .06, .43, 8), mPants);
    th.position.y = -.215; th.castShadow = true; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -.43; hip.add(knee);
    const ca = new THREE.Mesh(new THREE.CylinderGeometry(.055, .048, .45, 8), mPants);
    ca.position.y = -.225; ca.castShadow = true; knee.add(ca);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(.11, .09, .26), mBoot);
    boot.position.set(0, -.46, .05); boot.castShadow = true; knee.add(boot);
    return { hip, knee };
  }
  const armL = arm(-1), armR = arm(1);
  const legL = leg(-1), legR = leg(1);
  // rifle across chest (multi-part, held by both hands)
  const rifle = new THREE.Group();
  const rMat = mGun, rWood = mat(0x4a3421, .7);
  const recv = new THREE.Mesh(new THREE.BoxGeometry(.07, .11, .52), rMat); recv.castShadow = true; rifle.add(recv);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .34, 8), rMat);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, .02, .42); rifle.add(barrel);
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(.06, .08, .3), rWood);
  handguard.position.set(0, .01, .28); rifle.add(handguard);
  const mag = new THREE.Mesh(taperedBox(.05, .035, .035, .025, .2), rMat);
  mag.position.set(0, -.13, .08); mag.rotation.x = .12; rifle.add(mag);
  const stock = new THREE.Mesh(taperedBox(.06, .09, .045, .06, .22), rWood);
  stock.position.set(0, -.02, -.34); rifle.add(stock);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(.04, .05, .1), rMat);
  sight.position.set(0, .085, .05); rifle.add(sight);
  rifle.position.set(.05, 1.32, .22); rifle.rotation.y = -.35; rifle.rotation.x = .06;
  root.add(rifle);
  // name tag above head
  const tag = nameSprite(opts.name, team === 'ember' ? '#ffb36b' : '#8fd0ff');
  tag.position.y = 2.02; root.add(tag);

  const bot = {
    root, hips, neck, armL, armR, legL, legR, rifle, tag,
    name: opts.name, team, hp: 100, alive: true, phase: 0, walkSpeed: 0,
    crouch: 0, // 0..1
    aiming: 0,
    // hit spheres (world-space, updated in update())
    spheres: [
      { part: 'head', r: .16, off: new THREE.Vector3(0, 1.70, 0) },
      { part: 'torso', r: .34, off: new THREE.Vector3(0, 1.28, 0) },
      { part: 'legs', r: .34, off: new THREE.Vector3(0, .55, 0) },
    ],
    update(dt, t) {
      const s = Math.sin(t * 9) * .55 * this.walkSpeed;
      const c = Math.cos(t * 9) * .55 * this.walkSpeed;
      this.legL.hip.rotation.x = s; this.legR.hip.rotation.x = -s;
      this.legL.knee.rotation.x = Math.max(0, -c) * .9 + this.crouch * .9;
      this.legR.knee.rotation.x = Math.max(0, c) * .9 + this.crouch * .9;
      if (this.aiming) {
        // aim pose: both arms forward holding the rifle, no walk swing
        this.armL.sh.rotation.x = -1.25; this.armR.sh.rotation.x = -1.15;
        this.armL.el.rotation.x = -.5; this.armR.el.rotation.x = -.35;
        this.armL.sh.rotation.z = .12; this.armR.sh.rotation.z = -.12;
      } else {
        // arms: left holds foregrip forward, right at trigger; swing less while walking
        this.armL.sh.rotation.x = -.9 - s * .25; this.armR.sh.rotation.x = -.75 + s * .25;
        this.armL.el.rotation.x = -.5; this.armR.el.rotation.x = -.35;
        this.armL.sh.rotation.z = .12; this.armR.sh.rotation.z = -.12;
      }
      this.hips.position.y = 1.06 - this.crouch * .3 + Math.abs(Math.sin(t * 9)) * .03 * this.walkSpeed;
      this.hips.rotation.x = this.crouch * .25;
    },
    setAim(on) {
      this.aiming = on ? 1 : 0;
      this.rifle.position.set(.05, 1.36, .24); this.rifle.rotation.x = -.02;
    },
    die() {
      this.alive = false;
      this.root.rotation.z = Math.PI / 2 * (Math.random() < .5 ? 1 : -1);
      this.root.rotation.x = .15;
      this.root.position.y = .12;
      this.tag.visible = false;
    },
    setCrouch(v) { this.crouch = v; },
  };
  return bot;
}
