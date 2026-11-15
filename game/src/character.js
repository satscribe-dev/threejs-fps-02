// Humanoid bots built from measured human proportions (total height 1.80 m):
// hips 1.06 (59%), thigh 0.43, calf 0.45, torso 0.48, head Ø 0.23, shoulders ±0.21.
// Bodies are ROUND (capsule torso, sphere shoulders, tapered-cylinder limbs) —
// boxes are only for hard gear. Faces have eyes/brows/nose/mouth/glasses.
// Teams read apart: EMBER = boonie hat + sunglasses + orange armband;
// SLATE = helmet + balaclava + blue armband.
// Articulated pivots: neck, shoulders, elbows, hips, knees.
// Walk / run lean / crouch / aim / shoot kick / hit flinch / timed death fall.
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
  const jacket = team === 'ember' ? 0x9a4a26 : 0x5a7ea6;   // slate: blue enough to read as a team, light enough to read at dusk
  const pants = team === 'ember' ? 0x7a6a4a : 0x5a6a88;
  const vest = team === 'ember' ? 0x5c3a22 : 0x54708c;
  const helmet = team === 'ember' ? 0x7a5a30 : 0x527a9e;
  const accent = team === 'ember' ? 0xff9a3c : 0x8fd0ff;
  const skin = SKIN[opts.skin ?? 0];
  const mJacket = mat(jacket), mPants = mat(pants), mVest = mat(vest, .8),
    mHelmet = mat(helmet, .6), mSkin = mat(skin), mBoot = mat(0x2e2822, .7),
    mGun = mat(0x3a3d44, .5), mPouch = mat(0x8a7a55, .85),
    mGlove = mat(team === 'ember' ? 0x6e5a34 : 0x3a4a3a, .95),
    mDark = mat(0x1c1814, .7), mWhite = mat(0xf2ede2, .4),
    mPupil = mat(0x14100c, .3), mGlass = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: .2, metalness: .4 });

  const root = new THREE.Group();           // at feet, y=0
  // inner body group flipped π: the model is built facing +z (face/rifle/pouches),
  // but the yaw system treats -z as forward — without this flip every bot shows
  // its BACKPACK to its target. (Found from the duel crop: Sorrel faced away.)
  const body = new THREE.Group(); body.rotation.y = Math.PI; root.add(body);
  const hips = new THREE.Group(); hips.position.y = 1.06; body.add(hips);
  // pelvis + belt (rounded pelvis: sphere squashed)
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(.19, 12, 10), mPants);
  pelvis.scale.set(1, .55, .75); pelvis.position.y = .02; pelvis.castShadow = true; hips.add(pelvis);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(.38, .06, .24), mDark);
  belt.position.y = .1; hips.add(belt);
  // torso: tapered CAPSULE — cylinder + chest sphere + shoulder spheres
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.17, .15, .42, 14), mJacket);
  torso.position.y = .24; torso.castShadow = true; hips.add(torso);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(.17, 14, 12), mJacket);
  chest.scale.set(1.25, .8, .9); chest.position.y = .42; chest.castShadow = true; hips.add(chest);
  for (const sx of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), mJacket);
    sh.position.set(sx * .21, .44, 0); sh.castShadow = true; hips.add(sh);
  }
  // vest plates front/back + pouches + radio + backpack
  const plateF = new THREE.Mesh(new THREE.BoxGeometry(.34, .3, .05), mVest);
  plateF.position.set(0, .26, .15); hips.add(plateF);
  const plateB = new THREE.Mesh(new THREE.BoxGeometry(.34, .3, .05), mVest);
  plateB.position.set(0, .26, -.15); hips.add(plateB);
  for (const px of [-.11, 0, .11]) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(.09, .11, .05), mPouch);
    pouch.position.set(px, .08, .16); hips.add(pouch);
  }
  const radio = new THREE.Mesh(new THREE.BoxGeometry(.09, .12, .04), mDark);
  radio.position.set(-.13, .34, .15); hips.add(radio);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .2, 6), mDark);
  antenna.position.set(-.13, .48, .15); hips.add(antenna);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(.3, .36, .13), mVest);
  pack.position.set(0, .28, -.23); pack.castShadow = true; hips.add(pack);
  const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .32, 8), mPouch);
  bedroll.rotation.z = Math.PI / 2; bedroll.position.set(0, .48, -.24); hips.add(bedroll);
  // head group at 1.56 (neck base) -> head centre 1.70
  const neck = new THREE.Group(); neck.position.y = .5; hips.add(neck);
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .1, 8), mSkin);
  neckM.position.y = .03; neck.add(neckM);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.125, 16, 12), mSkin);
  head.position.y = .14; head.scale.set(1, 1.15, 1.05); head.castShadow = true; neck.add(head);
  // ---- FACE (front = +z): eyes, brows, nose, mouth, glasses
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.02, 8, 6), mWhite);
    eye.position.set(sx * .045, .165, .108); neck.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(.009, 8, 6), mPupil);
    pupil.position.set(sx * .045, .165, .125); neck.add(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(.05, .009, .012), mPupil);
    brow.position.set(sx * .045, .195, .112); brow.rotation.z = sx * -.12; neck.add(brow);
  }
  const nose = new THREE.Mesh(new THREE.BoxGeometry(.022, .04, .022), mSkin);
  nose.position.set(0, .13, .12); neck.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(.05, .008, .01), mPupil);
  mouth.position.set(0, .08, .114); neck.add(mouth);
  const glasses = new THREE.Mesh(new THREE.BoxGeometry(.17, .05, .02), mGlass);
  glasses.position.set(0, .165, .116); neck.add(glasses);
  if (team === 'slate') {
    // balaclava: lower-face band, eyes stay visible
    const bala = new THREE.Mesh(new THREE.SphereGeometry(.135, 14, 10, 0, Math.PI * 2, Math.PI * .35, Math.PI * .5), mat(0x23282c, .95));
    bala.position.y = .14; neck.add(bala);
    // helmet: dome + brim + back cover
    const helm = new THREE.Mesh(new THREE.SphereGeometry(.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * .55), mHelmet);
    helm.position.y = .17; helm.castShadow = true; neck.add(helm);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(.155, .16, .03, 14), mHelmet);
    brim.position.y = .185; neck.add(brim);
  } else {
    // boonie hat: crown + wide brim, tan
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(.135, .15, .07, 14), mHelmet);
    crown.position.y = .235; crown.castShadow = true; neck.add(crown);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(.22, .225, .02, 16), mHelmet);
    brim.position.y = .2; neck.add(brim);
  }
  // arms: shoulder pivot at (±.23, 1.48) -> in hips space y=.42
  function arm(side) {
    const sh = new THREE.Group(); sh.position.set(side * .23, .42, 0); hips.add(sh);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(.085, .075, .28, 10), mJacket);
    up.position.y = -.14; up.castShadow = true; sh.add(up);
    // armband (team accent)
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .05, 10), mat(accent, .6));
    band.position.y = -.06; sh.add(band);
    const el = new THREE.Group(); el.position.y = -.28; sh.add(el);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(.09, .08, .07), mDark);
    pad.position.set(0, -.01, .04); el.add(pad);
    const fo = new THREE.Mesh(new THREE.CylinderGeometry(.075, .065, .25, 10), mJacket);
    fo.position.y = -.125; fo.castShadow = true; el.add(fo);
    const hand = new THREE.Group(); hand.position.y = -.27; el.add(hand);
    const palm = new THREE.Mesh(new THREE.BoxGeometry(.07, .09, .04), mGlove);
    palm.castShadow = true; hand.add(palm);
    // gloved fingers: 4 small boxes with gaps (readable at close range)
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(.014, .05, .014), mGlove);
      f.position.set(-.024 + i * .016, -.07, 0); hand.add(f);
    }
    const thumb = new THREE.Mesh(new THREE.BoxGeometry(.014, .04, .014), mGlove);
    thumb.position.set(side * .045, -.03, .01); thumb.rotation.z = side * .5; hand.add(thumb);
    return { sh, el, hand };
  }
  // legs: hip pivot at (±.11, 1.06) -> hips space y=0
  function leg(side) {
    const hip = new THREE.Group(); hip.position.set(side * .11, 0, 0); hips.add(hip);
    const th = new THREE.Mesh(new THREE.CylinderGeometry(.095, .075, .43, 10), mPants);
    th.position.y = -.215; th.castShadow = true; hip.add(th);
    // thigh holster (right leg)
    if (side === 1) {
      const hol = new THREE.Mesh(new THREE.BoxGeometry(.08, .16, .05), mDark);
      hol.position.set(.02, -.2, .09); hip.add(hol);
    }
    const knee = new THREE.Group(); knee.position.y = -.43; hip.add(knee);
    const kpad = new THREE.Mesh(new THREE.BoxGeometry(.12, .14, .06), mDark);
    kpad.position.set(0, -.02, .06); knee.add(kpad);
    const ca = new THREE.Mesh(new THREE.CylinderGeometry(.072, .06, .45, 10), mPants);
    ca.position.y = -.225; ca.castShadow = true; knee.add(ca);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(.11, .09, .26), mBoot);
    boot.position.set(0, -.46, .05); boot.castShadow = true; knee.add(boot);
    return { hip, knee };
  }
  const armL = arm(-1), armR = arm(1);
  const legL = leg(-1), legR = leg(1);
  // rifle across chest (multi-part, held by both hands)
  const rifle = new THREE.Group();
  const rMat = mGun, rWood = mat(0x6b4e2e, .7);
  const recv = new THREE.Mesh(new THREE.BoxGeometry(.07, .11, .52), rMat); recv.castShadow = true; rifle.add(recv);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .34, 8), rMat);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, .02, .42); rifle.add(barrel);
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(.06, .08, .3), rWood);
  handguard.position.set(0, .01, .28); rifle.add(handguard);
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, .13, 8), rMat);
  scope.rotation.x = Math.PI / 2; scope.position.set(0, .09, .02); rifle.add(scope);
  const fgrip = new THREE.Mesh(new THREE.BoxGeometry(.04, .1, .05), rWood);
  fgrip.position.set(0, -.09, .34); fgrip.rotation.x = .15; rifle.add(fgrip);
  const mag = new THREE.Mesh(taperedBox(.05, .035, .035, .025, .2), rMat);
  mag.position.set(0, -.13, .08); mag.rotation.x = .12; rifle.add(mag);
  const stock = new THREE.Mesh(taperedBox(.06, .09, .045, .06, .22), rWood);
  stock.position.set(0, -.02, -.34); rifle.add(stock);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(.04, .05, .1), rMat);
  sight.position.set(0, .085, .05); rifle.add(sight);
  const sling = new THREE.Mesh(new THREE.BoxGeometry(.02, .02, .5), mDark);
  sling.position.set(-.05, -.06, .05); sling.rotation.x = .1; rifle.add(sling);
  rifle.position.set(.05, 1.34, .26); rifle.rotation.y = -.35; rifle.rotation.x = .06;
  body.add(rifle);
  // name tag above head
  const tag = nameSprite(opts.name, team === 'ember' ? '#ffb36b' : '#8fd0ff');
  tag.position.y = 2.02; body.add(tag);

  const bot = {
    root, hips, neck, armL, armR, legL, legR, rifle, tag,
    name: opts.name, team, hp: 100, alive: true, phase: 0, walkSpeed: 0,
    crouch: 0, // 0..1
    aiming: 0,
    flinch: 0, kick: 0, dying: false, dyingT: 0, dieDir: 1,
    // hit spheres (world-space, updated in update()) — UNCHANGED, gameplay contract
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
      const run = this.walkSpeed > .7 ? 1 : 0;
      if (this.aiming) {
        // aim pose: both arms forward holding the rifle, no walk swing
        this.armL.sh.rotation.x = -1.25; this.armR.sh.rotation.x = -1.15;
        this.armL.el.rotation.x = -.5; this.armR.el.rotation.x = -.35;
        this.armL.sh.rotation.z = .12; this.armR.sh.rotation.z = -.12;
      } else {
        // arms swing opposite the legs while walking; left holds foregrip
        this.armL.sh.rotation.x = -.9 - s * .25; this.armR.sh.rotation.x = -.75 + s * .25;
        this.armL.el.rotation.x = -.5; this.armR.el.rotation.x = -.35;
        this.armL.sh.rotation.z = .12; this.armR.sh.rotation.z = -.12;
      }
      this.flinch = Math.max(0, this.flinch - dt * 3);
      this.kick = Math.max(0, this.kick - dt * 5);
      this.hips.position.y = 1.06 - this.crouch * .3 + Math.abs(Math.sin(t * 9)) * .03 * this.walkSpeed;
      this.hips.rotation.x = this.crouch * .25 + run * .12 - this.flinch * .35;
      this.neck.rotation.x = this.flinch * .25;
      // shoot kick: rifle jumps back, shoulders rise
      this.rifle.position.z = .26 + this.kick * .07;
      this.rifle.rotation.x = .06 - this.kick * .18;
      // timed death fall (0.5 s ease-out, then settle)
      if (this.dying) {
        this.dyingT += dt;
        const k = Math.min(1, this.dyingT / .5);
        const e = 1 - (1 - k) * (1 - k);
        this.root.rotation.z = this.dieDir * Math.PI / 2 * e;
        this.root.rotation.x = .15 * e;
        this.root.position.y = .12 * e;
        if (k >= 1) this.dying = false;
      }
    },
    setAim(on) {
      this.aiming = on ? 1 : 0;
      this.rifle.position.set(.05, 1.36, .24); this.rifle.rotation.x = -.02;
    },
    hit() { this.flinch = 1; },
    shootKick() { this.kick = 1; },
    die() {
      this.alive = false;
      this.dying = true; this.dyingT = 0;
      this.dieDir = Math.random() < .5 ? 1 : -1;
      this.tag.visible = false;
    },
    setCrouch(v) { this.crouch = v; },
  };
  return bot;
}
